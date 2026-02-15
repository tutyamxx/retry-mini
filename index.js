/**
 *  retry-mini - ↻ Tiny dependency-free async retry utility with backoff, delay, and conditional retry support.
 *  @version: v1.0.8
 *  @link: https://github.com/tutyamxx/retry-mini
 *  @license: MIT
 **/


/**
 * Retry any function with optional retries, delay, backoff, and jitter (to prevent spamming).
 *
 * @param {Function} task Function to run (can be async or sync). Receives the attempt number.
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3] Maximum retry attempts.
 * @param {number} [options.baseDelay=0] Base delay in milliseconds.
 * @param {number} [options.backoffFactor=1] Multiplier for exponential backoff.
 * @param {number} [options.jitter=0] Fractional jitter to randomize waitTime (0.5 = ±50%).
 * @param {Function} [options.shouldRetry] Return false to stop retrying early.
 * @param {Function} [options.onRetry] Called before each retry attempt.
 *
 * @returns {Promise<*>}
 */
const retryMini = async (task, options = {}) => {
    const maxRetries = options?.maxRetries ?? 3;
    const baseDelay = options?.baseDelay ?? 0;
    const backoffFactor = options?.backoffFactor ?? 1;

    // --| Fraction: 0 = no jitter, 0.5 = ±50%
    const jitter = options?.jitter ?? 0;

    const shouldRetry = options?.shouldRetry ?? (() => true);
    const onRetry = options?.onRetry ?? (() => {});

    let lastError;

    for (let attemptNumber = 0; attemptNumber <= maxRetries; attemptNumber++) {
        try {
            return await task(attemptNumber);
        } catch (error) {
            lastError = error;

            const retryAllowed = await shouldRetry?.(error, attemptNumber) ?? true;

            if (!retryAllowed || attemptNumber === maxRetries) {
                break;
            }

            await onRetry?.(error, attemptNumber);

            // --| Calculate exponential backoff
            let waitTime = baseDelay * Math.max(1, backoffFactor ** attemptNumber);

            // --| Apply jitter: ±jitter%
            if (waitTime > 0 && jitter > 0) {
                // --| 0.5 -> 0.5-1.5
                const randomFactor = 1 + (Math.random() * 2 - 1) * jitter;

                waitTime = Math.floor(waitTime * randomFactor);
            }

            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
};

export default retryMini;
