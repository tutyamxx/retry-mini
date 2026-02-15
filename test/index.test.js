import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import retryMini from '../index.js';

describe('retryMini', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('Resolves immediately on a successful first attempt', async () => {
        const task = jest.fn().mockResolvedValue('success');

        const result = await retryMini(task);

        expect(result).toBe('success');
        expect(task).toHaveBeenCalledTimes(1);
    });

    test('Retries the specified number of times before failing', async () => {
        const error = new Error('Permanent Failure');
        const task = jest.fn().mockRejectedValue(error);
        const maxRetries = 2;

        const promise = retryMini(task, { maxRetries, baseDelay: 0 });

        // --| Fast-forward through any microtasks to trigger the rejection
        await expect(promise).rejects.toThrow('Permanent Failure');

        // --| 1 initial attempt + 2 retries = 3 total calls
        expect(task).toHaveBeenCalledTimes(3);
    });

    test('Applies exponential backoff correctly', async () => {
        const task = jest.fn().mockRejectedValueOnce(new Error('Fail 1')).mockRejectedValueOnce(new Error('Fail 2')).mockResolvedValue('Third time charm');

        const baseDelay = 100;
        const backoffFactor = 2;

        const promise = retryMini(task, {
            maxRetries: 3,
            baseDelay,
            backoffFactor
        });

        // --| Task fails. Logic reaches the first delay.
        // --| We advance time and let all pending internal promises resolve.
        await jest.advanceTimersByTimeAsync(100);

        // --| Second attempt runs and fails. Logic reaches second delay.
        await jest.advanceTimersByTimeAsync(200);

        // --| Final attempt runs and succeeds.
        const result = await promise;

        expect(result).toBe('Third time charm');
        expect(task).toHaveBeenCalledTimes(3);
    });

    test('Stops early if shouldRetry returns false', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Fatal Error'));
        const shouldRetry = jest.fn().mockReturnValue(false);

        const promise = retryMini(task, { maxRetries: 5, shouldRetry });

        await expect(promise).rejects.toThrow('Fatal Error');

        expect(task).toHaveBeenCalledTimes(1);
        expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
    });

    test('Supports asynchronous shouldRetry checks', async () => {
        const task = jest.fn().mockRejectedValueOnce(new Error('Temporary')).mockResolvedValue('Fixed');
        const shouldRetry = jest.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
            return true;
        });

        const promise = retryMini(task, { maxRetries: 1, baseDelay: 0, shouldRetry });

        // --| Advance past the internal check timeout
        await jest.advanceTimersByTimeAsync(10);

        const result = await promise;
        expect(result).toBe('Fixed');
        expect(shouldRetry).toHaveBeenCalledTimes(1);
    });

    test('Calls onRetry callback before each attempt', async () => {
        const task = jest.fn().mockRejectedValueOnce(new Error('Error 1')).mockResolvedValue('Success');
        const onRetry = jest.fn();

        await retryMini(task, { maxRetries: 1, onRetry });

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 0);
    });

    test('Supports asynchronous onRetry callbacks', async () => {
        let sideEffect = false;
        const task = jest.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('Done');
        const onRetry = async () => {
            await Promise.resolve();
            sideEffect = true;
        };

        await retryMini(task, { maxRetries: 1, baseDelay: 0, onRetry });

        expect(sideEffect).toBe(true);
        expect(task).toHaveBeenCalledTimes(2);
    });

    test('Receives the correct attempt number in the task', async () => {
        const task = jest.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('Done');

        await retryMini(task, { maxRetries: 1 });

        expect(task).toHaveBeenNthCalledWith(1, 0);
        expect(task).toHaveBeenNthCalledWith(2, 1);
    });

    test('Works correctly with zero delay', async () => {
        const task = jest.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('Fast Success');
        const result = await retryMini(task, { maxRetries: 1, baseDelay: 0 });

        expect(result).toBe('Fast Success');
        expect(task).toHaveBeenCalledTimes(2);
    });

    test('Supports synchronous tasks', async () => {
        const task = (attempt) => {
            if (attempt === 0) {
                throw new Error('Sync Fail');
            }

            return 'Sync Success';
        };

        const result = await retryMini(task, { maxRetries: 1, baseDelay: 0 });
        expect(result).toBe('Sync Success');
    });

    test('Uses default values when no options are provided', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Fail'));

        // --| Should try 1 original + 3 retries = 4 times total
        const promise = retryMini(task);

        await expect(promise).rejects.toThrow('Fail');
        expect(task).toHaveBeenCalledTimes(4);
    });
});

describe('retryMini - Jitter Logic', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(global.Math, 'random');
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('Applies jitter correctly at the lower bound (Math.random = 0)', async () => {
        // --| Force Math.random to return 0
        Math.random.mockReturnValue(0);

        const task = jest.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('Done');
        const baseDelay = 100;
        // --| ±50%
        const jitter = 0.5;

        // --| waitTime = 100 * (1 + (0 * 2 - 1) * 0.5)
        // --| waitTime = 100 * (1 - 0.5) = 50
        const promise = retryMini(task, { baseDelay, jitter, maxRetries: 1 });

        // --| Allow internal awaits (shouldRetry, onRetry) to flush
        await jest.advanceTimersByTimeAsync(0);
        expect(jest.getTimerCount()).toBe(1);

        // --| Advance exactly 50ms
        await jest.advanceTimersByTimeAsync(50);

        const result = await promise;
        expect(result).toBe('Done');
        expect(task).toHaveBeenCalledTimes(2);
    });

    test('Applies jitter correctly at the upper bound (Math.random = 1)', async () => {
        // --| Force Math.random to return 1
        Math.random.mockReturnValue(0.9999);

        const task = jest.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('Done');
        const baseDelay = 100;
        const jitter = 0.5;

        // --| waitTime = 100 * (1 + (1 * 2 - 1) * 0.5)
        // --| waitTime = 100 * (1 + 0.5) = 150
        const promise = retryMini(task, { baseDelay, jitter, maxRetries: 1 });

        await jest.advanceTimersByTimeAsync(0);
        await jest.advanceTimersByTimeAsync(150);

        const result = await promise;
        expect(result).toBe('Done');
        expect(task).toHaveBeenCalledTimes(2);
    });

    test('Ensures waitTime is never negative even with high jitter', async () => {
        // --| Force Math.random to 0 and use a jitter > 1
        Math.random.mockReturnValue(0);
        const task = jest.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValue('Done');

        // --| Current logic: 100 * (1 + (-1) * 2) = -100
        // --| We want to ensure the code doesn't crash.
        const promise = retryMini(task, { baseDelay: 100, jitter: 2, maxRetries: 1 });

        // --| Flush microtasks to reach the "if (waitTime > 0)" check
        await jest.advanceTimersByTimeAsync(0);

        // --| If waitTime becomes negative or 0, it shouldn't set a timer
        expect(jest.getTimerCount()).toBe(0);
        await promise;
    });
});
