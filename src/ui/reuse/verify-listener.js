/**
 * One-time token watch utility.
 *
 * Polls the token status endpoint and fires onConsumed() once a previously-issued
 * one-time token has been consumed (i.e. the associated unique link was followed).
 * This utility has no knowledge of what the token is for or how it was delivered.
 *
 * Public exports:
 *   watchToken(options) — starts polling and returns a stop function.
 *
 * Usage:
 *   import { watchToken } from '../../reuse/verify-listener.js';
 *
 *   const stop = watchToken({
 *     token: 'abc123...',
 *     apiFetch,
 *     onConsumed: () => console.log('link was used'),
 *   });
 *
 *   stop(); // call to cancel before consumption is detected
 *
 * @param {object} options
 * @param {string} options.token - The watch token returned by the server when the link was issued.
 * @param {Function} options.apiFetch - The apiFetch function from api-client.js.
 * @param {Function} options.onConsumed - Callback fired once when the token is no longer pending.
 * @param {number} [options.intervalMs=3000] - Polling interval in milliseconds.
 * @returns {() => void} A stop function that cancels the polling loop.
 */
export function watchToken({ token, apiFetch, onConsumed, intervalMs = 3000 }) {
  let stopped = false;

  async function poll() {
    while (!stopped) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      if (stopped) break;
      try {
        const res = await apiFetch(`/api/v1/verify-tokens/status?token=${encodeURIComponent(token)}`);
        if (!res.ok) continue;
        const payload = await res.json();
        if (!payload.data?.pending) {
          stopped = true;
          onConsumed();
          break;
        }
      } catch {
        // Network error — continue polling until stopped
      }
    }
  }

  poll();

  return function stop() {
    stopped = true;
  };
}
