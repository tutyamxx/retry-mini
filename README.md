# retry-mini

<p align="center"><a href="https://nodei.co/npm/retry-mini/"><img src="https://nodei.co/npm/retry-mini.png"></a></a></p>
<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg">
</p>

* ↻ Tiny dependency-free async retry utility with backoff, delay, and conditional retry support.

# 💎 Why `retry-mini`?

In a world of bloated dependencies, `retry-mini` focuses on being lightweight yet powerful.

| Feature | Benefit |
| :--- | :--- |
| **📦 Zero Dependencies** | No supply-chain risks. Ultra-light footprint. |
| **🧬 Dual-Module** | Native support for both `import` (ESM) and `require` (CJS). |
| **⚖️ Smart Backoff** | Exponential backoff prevents "retry storms" on your services. |
| **🎲 Jitter Support** | Prevents "Thundering Herd" by adding random timing variance. |
| **🔍 Logic-Aware** | `shouldRetry` allows you to stop retrying on 404s but continue on 500s. |
| **⌨️ Fully Typed** | TypeScript definitions included for perfect IDE autocompletion. |

---

# ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`maxRetries`** | `number` | `3` | Maximum number of attempts before giving up. |
| **`baseDelay`** | `number` | `0` | Starting delay in milliseconds. |
| **`backoffFactor`** | `number` | `1` | The multiplier for exponential backoff (e.g., `2` doubles the wait). |
| **`jitter`** | `number` | `0` | Fractional jitter to randomize waitTime (`0.5` = `±50%`) |
| **`shouldRetry`** | `function` | `() => true` | `(error, attempt) => boolean`. Logic to stop/continue retrying. |
| **`onRetry`** | `function` | `undefined` | `(error, attempt) => void`. Hook for logging or side-effects. |

---

# 📦 Install via [NPM](https://www.npmjs.com/package/retry-mini)

```bash
$ npm i retry-mini
```

# 💻 Usage

- See examples below

## CommonJS
```javascript
const retryMini = require('retry-mini');

// --| A flaky function that only succeeds 20% of the time
const flakyTask = async (attempt) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🚀 Executing attempt #${attempt}...`);

    if (Math.random() > 0.2) {
        const error = new Error('Service Temporarily Unavailable');
        error.code = 'BUSY';

        throw error;
    }

    return "Successfully processed data! 🎉";
};

const run = async () => {
    try {
        const result = await retryMini(flakyTask, {
            maxRetries: 5,
            baseDelay: 1000,
            backoffFactor: 2,
            jitter: 0.2, // --| Adds randomness to the 1s, 2s, 4s delays
            onRetry: (err, i) => console.log(`⚠️  Attempt ${i} failed. Waiting for next try...`),
            shouldRetry: (err) => err.code === 'BUSY'
        });

        console.log(`\n✅ Result: ${result}`);
    } catch (err) {
        console.error(`\n❌ Script failed after all retries: ${err.message}`);
    }
};

run();
```

## ESM
```javascript
import retryMini from 'retry-mini';

// --| A flaky function that only succeeds 20% of the time
const flakyTask = async (attempt) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🚀 Executing attempt #${attempt}...`);

    if (Math.random() > 0.2) {
        const error = new Error('Service Temporarily Unavailable');
        error.code = 'BUSY';

        throw error;
    }

    return "Successfully processed data! 🎉";
};

const run = async () => {
    try {
        const result = await retryMini(flakyTask, {
            maxRetries: 5,
            baseDelay: 1000,
            backoffFactor: 2,
            jitter: 0.2, // --| Adds randomness to the 1s, 2s, 4s delays
            onRetry: (err, i) => console.log(`⚠️  Attempt ${i} failed. Waiting for next try...`),
            shouldRetry: (err) => err.code === 'BUSY'
        });

        console.log(`\n✅ Result: ${result}`);
    } catch (err) {
        console.error(`\n❌ Script failed after all retries: ${err.message}`);
    }
};

run();
```

## TypeScript
```javascript
import retryMini from 'retry-mini';

/**
 * Custom error type to handle the 'code' property
 */
interface FlakyError extends Error {
    code?: string;
}

// --| A flaky function that only succeeds 20% of the time
const flakyTask = async (attempt: number): Promise<string> => {
    console.log(`[${new Date().toLocaleTimeString()}] 🚀 Executing attempt #${attempt}...`);

    if (Math.random() > 0.2) {
        const error = new Error('Service Temporarily Unavailable') as FlakyError;
        error.code = 'BUSY';
        throw error;
    }

    return "Successfully processed data! 🎉";
};

const run = async (): Promise<void> => {
    try {
        const result = await retryMini(flakyTask, {
            maxRetries: 5,
            baseDelay: 1000,
            backoffFactor: 2,
            jitter: 0.2, // --| Adds randomness to the 1s, 2s, 4s delays
            onRetry: (err: FlakyError, i: number) => console.log(`⚠️  Attempt ${i} failed. Waiting for next try...`),
            shouldRetry: (err: FlakyError) => err.code === 'BUSY'
        });

        console.log(`\n✅ Result: ${result}`);
    } catch (err) {
        const error = err as Error;
        console.error(`\n❌ Script failed after all retries: ${error.message}`);
    }
};

run();
```

# 💡 The Backoff Formula

$$waitTime = (baseDelay \times backoffFactor^{attempt}) \times (1 \pm jitter)$$
<p align="center">
    <code>waitTime = (baseDelay * backoffFactor^attempt) * (1 ± jitter)</code>
</p>