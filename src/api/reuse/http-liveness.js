export async function checkHttpLiveness(url, { timeoutMs = 5000 } = {}) {
    const abortController = new AbortController();
    const timer = setTimeout(() => {
        abortController.abort();
    }, timeoutMs);
    try {
        const response = await fetch(url, {
            method: "GET",
            signal: abortController.signal,
            redirect: "follow",
        });
        return {
            alive: response.ok,
            status: response.status,
        };
    } catch (error) {
        return {
            alive: false,
            error: error instanceof Error ? error.message : String(error),
        };
    } finally {
        clearTimeout(timer);
    }
}
