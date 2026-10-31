/** Bound owner callbacks and discard work after session cancellation. */
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
