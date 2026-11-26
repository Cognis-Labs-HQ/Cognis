/** Sends diagnostics without triggering application recovery or authentication UI. */
export function submitBrowserLog(entry, { accessToken, signal }) {
    const timeout = AbortSignal.timeout(15_000);
    return fetch("/api/v1/logging/entries", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(entry),
        cache: "no-store",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        redirect: "error",
    });
}
