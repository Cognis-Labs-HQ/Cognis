export function createRenderScope(signal) {
    let controller;
    signal?.addEventListener("abort", () => controller?.abort(), {
        once: true,
    });
    return () => {
        controller?.abort();
        controller = new AbortController();
        if (signal?.aborted) controller.abort();
        return controller.signal;
    };
}
