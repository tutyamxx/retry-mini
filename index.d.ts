export interface RetryMiniOptions {
    maxRetries?: number;
    baseDelay?: number;
    backoffFactor?: number;
    jitter?: number;

    shouldRetry?: (error: any, attemptNumber: number) => boolean;
    onRetry?: (error: any, attemptNumber: number) => void;
}

/**
 * Retry any function with optional retries, delay, backoff, and jitter (to prevent spamming).
 *
 * @param task Function to run (can be async or sync). Receives the attempt number.
 * @param options Optional configuration object.
 * @param options.maxRetries Maximum retry attempts. Default is 3.
 * @param options.baseDelay Base delay in milliseconds. Default is 0.
 * @param options.backoffFactor Multiplier for exponential backoff. Default is 1.
 * @param options.jitter Fractional jitter to randomize wait time (0 = no jitter, 0.5 = ±50%). Default is 0.
 * @param options.shouldRetry Return false to stop retrying early.
 * @param options.onRetry Called before each retry attempt.
 *
 * @returns A Promise resolving to the task result, or rejecting with the last error.
 */
declare function retryMini<T>(task: (attemptNumber: number) => Promise<T> | T, options?: RetryMiniOptions): Promise<T>;

export { retryMini };
export default retryMini;
