/**
 * Bounds asynchronous work by timeout and cancellation.
 * Public export: abortable — settles work only while its signal remains active.
 * @example const result = await abortable(load(), signal);
 * @param {Promise<unknown>} work Pending owner work.
 * @param {AbortSignal} signal Work lifetime.
 * @param {number} timeoutMs Maximum wait in milliseconds.
 * @returns {Promise<unknown>} The result or a cancellation/timeout rejection.
 */
export function abortable(work, signal, timeoutMs = 15000) {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const dispose = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", abort);
        };
        const abort = () => {
            dispose();
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        };
        const timer = setTimeout(() => {
            dispose();
            reject(new Error("tutorial_callback_timeout"));
        }, timeoutMs);
        signal.addEventListener("abort", abort, { once: true });
        Promise.resolve(work).then(
            (value) => {
                dispose();
                if (signal.aborted) reject(signal.reason);
                else resolve(value);
            },
            (error) => {
                dispose();
                reject(error);
            },
        );
    });
}
