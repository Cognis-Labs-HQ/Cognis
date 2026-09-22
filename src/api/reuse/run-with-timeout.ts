/** Run an asynchronous operation with a bounded completion time. */
export async function runWithTimeout<T>(
    operation: () => Promise<T> | T,
    timeoutMs: number,
    timeoutMessage = `Operation timed out after ${timeoutMs}ms`,
): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            Promise.resolve().then(operation),
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(
                    () => reject(new Error(timeoutMessage)),
                    timeoutMs,
                );
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
