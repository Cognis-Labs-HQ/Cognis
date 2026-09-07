/**
 * One-time validation URL utility.
 *
 * Polls the token status endpoint and fires onConsumed() once a previously-issued
 * one-time token has been consumed (i.e. the associated unique link was followed).
 * Optionally stops polling after a timeout and fires onExpired() if the token was
 * not consumed within that window.
 *
 * This utility has no knowledge of what the token is for or how it was delivered.
 *
 * Public exports:
 *   watchToken(options) — starts polling and returns a stop function.
 *
 * Usage:
 *   import { watchToken } from '../../reuse/validation-url.js';
 *
 *   const stop = watchToken({
 *     token: 'abc123...',
 *     apiFetch,
 *     onConsumed: () => console.log('link was used'),
 *     timeoutMs: 15 * 60 * 1000,
 *     onExpired: () => console.log('link expired'),
 *   });
 *
 *   stop(); // call to cancel before consumption is detected
 *
 * @param {object} options
 * @param {string} options.token - The watch token returned by the server when the link was issued.
 * @param {Function} options.apiFetch - The apiFetch function from api-client.js.
 * @param {Function} options.onConsumed - Callback fired once when the token is no longer pending.
 * @param {number} [options.intervalMs=3000] - Polling interval in milliseconds.
 * @param {number} [options.timeoutMs] - Optional. Milliseconds from the start of watching after which
 *   polling stops and onExpired is called if the token was not yet consumed.
 * @param {Function} [options.onExpired] - Called when timeoutMs elapses without consumption.
 * @returns {() => void} A stop function that cancels the polling loop.
 */
export function watchToken({
    token,
    apiFetch,
    onConsumed,
    intervalMs = 3000,
    timeoutMs,
    onExpired,
}) {
    let stopped = false;
    const startedAt = Date.now();

    async function poll() {
        while (!stopped) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
            if (stopped) break;

            if (
                timeoutMs !== undefined &&
                Date.now() - startedAt >= timeoutMs
            ) {
                stopped = true;
                if (onExpired) onExpired();
                break;
            }

            try {
                const res = await apiFetch(
                    `/api/v1/notify/verify-tokens/status?token=${encodeURIComponent(token)}`,
                );
                if (!res.ok) continue;
                const payload = await res.json();
                if (!payload.data?.pending) {
                    stopped = true;
                    onConsumed();
                    break;
                }
            } catch {
                // Network error — continue polling until stopped or timed out
            }
        }
    }

    poll();

    return function stop() {
        stopped = true;
    };
}
