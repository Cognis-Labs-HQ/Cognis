export async function checkHttpLiveness(
    url,
    { timeoutMs: timeoutMilliseconds = 5000 } = {},
) {
    const abortController = new AbortController();
    const timer = setTimeout(() => {
        abortController.abort();
    }, timeoutMilliseconds);
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
