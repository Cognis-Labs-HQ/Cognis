/**
 * Adaptive polling loop for independent UI/background refresh tasks.
 *
 * Each poller owns its own timer and adjusts its delay based on observed
 * activity. Calling `markActivity()` (for local user input or a changed poll
 * result) immediately ramps the next poll toward `minIntervalMs`; quiet polls
 * gradually wind down toward `maxIntervalMs`.
 *
 * @param {object} options - Poller configuration.
 * @param {() => (boolean|void|Promise<boolean|void>)} options.task - Function to poll.
 * @param {number} [options.minIntervalMs=500] - Fastest polling delay.
 * @param {number} [options.maxIntervalMs=30000] - Slowest polling delay.
 * @param {number} [options.initialIntervalMs=maxIntervalMs] - Initial delay before the first scheduled tick.
 * @param {number} [options.windDownFactor=1.6] - Multiplier used after quiet polls.
 * @param {(error: unknown) => void} [options.onError] - Optional task error handler.
 * @param {typeof setTimeout} [options.setTimeoutFn=setTimeout] - Timer hook for tests.
 * @param {typeof clearTimeout} [options.clearTimeoutFn=clearTimeout] - Clear timer hook for tests.
 * @returns {{start(options?: {immediate?: boolean}): void, stop(): void, markActivity(): void, trigger(): void, isRunning(): boolean, getCurrentInterval(): number}}
 */
export function createAdaptivePoller({
    task,
    minIntervalMs = 500,
    maxIntervalMs = 30_000,
    initialIntervalMs = maxIntervalMs,
    windDownFactor = 1.6,
    onError = null,
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
} = {}) {
    if (typeof task !== "function") {
        throw new TypeError("createAdaptivePoller requires a task function");
    }
    if (
        typeof setTimeoutFn !== "function" ||
        typeof clearTimeoutFn !== "function"
    ) {
        throw new TypeError("createAdaptivePoller requires timer functions");
    }

    const minDelay = Math.max(0, Number(minIntervalMs) || 0);
    const maxDelay = Math.max(minDelay, Number(maxIntervalMs) || minDelay);
    const decay = Math.max(1, Number(windDownFactor) || 1);
    let currentInterval = Math.min(
        maxDelay,
        Math.max(minDelay, Number(initialIntervalMs) || maxDelay),
    );
    let timer = null;
    let running = false;
    let inFlight = false;

    function clearTimer() {
        if (timer !== null) {
            clearTimeoutFn(timer);
            timer = null;
        }
    }

    function schedule(delay = currentInterval) {
        if (!running) return;
        clearTimer();
        timer = setTimeoutFn(
            () => {
                timer = null;
                void run();
            },
            Math.max(0, delay),
        );
    }

    function windDown() {
        currentInterval = Math.min(
            maxDelay,
            Math.max(minDelay, currentInterval * decay),
        );
    }

    function rampUp() {
        currentInterval = minDelay;
    }

    async function run() {
        if (!running || inFlight) return;
        inFlight = true;
        let active = false;
        try {
            active = (await task()) === true;
        } catch (error) {
            onError?.(error);
        } finally {
            inFlight = false;
        }
        if (!running) return;
        if (active) rampUp();
        else windDown();
        schedule(currentInterval);
    }

    function markActivity() {
        rampUp();
        if (running && !inFlight) schedule(currentInterval);
    }

    function trigger() {
        rampUp();
        if (!running || inFlight) return;
        schedule(0);
    }

    function start({ immediate = false } = {}) {
        if (running) return;
        running = true;
        schedule(immediate ? 0 : currentInterval);
    }

    function stop() {
        running = false;
        clearTimer();
    }

    return {
        start,
        stop,
        markActivity,
        trigger,
        isRunning: () => running,
        getCurrentInterval: () => currentInterval,
    };
}
