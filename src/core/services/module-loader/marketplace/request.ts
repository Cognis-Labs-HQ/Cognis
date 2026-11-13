/** Bound provider requests and keep credential headers on the configured origin. */
export function fetchMarketplaceResource(
    input: string,
    options: RequestInit = {},
): Promise<Response> {
    const timeout = AbortSignal.timeout(15_000);
    const signal = options.signal
        ? AbortSignal.any([options.signal, timeout])
        : timeout;
    return fetch(input, { ...options, redirect: "error", signal });
}
