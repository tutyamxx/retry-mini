/**
 *  retry-mini - ↻ Tiny dependency-free async retry utility with backoff, delay, and conditional retry support.
 *  @version: v1.0.9
 *  @link: https://github.com/tutyamxx/retry-mini
 *  @license: MIT
 **/


/**
 * CommonJS Wrapper for retry-mini
 * We use dynamic import() to bridge the gap from CJS to ESM.
 */
const retryMini = async (task, options) => {
    const module = await import('./index.js');
    const fn = module.default || module.retryMini;

    return fn(task, options);
};

// --| Export for require('retry-mini')
module.exports = retryMini;

// --| Named and default properties for better interop
module.exports.retryMini = retryMini;
module.exports.default = retryMini;
