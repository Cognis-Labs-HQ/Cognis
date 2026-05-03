/**
 * Email verification link listener.
 *
 * Polls the user's email list to detect when an email address has been
 * verified out-of-band — for example, by clicking the one-click link included
 * in the verification email. When verification is detected the provided
 * callback fires and polling stops automatically.
 *
 * Public exports:
 *   watchEmailVerification(options) — starts polling and returns a stop function.
 *
 * Usage:
 *   import { watchEmailVerification } from '../../reuse/verify-listener.js';
 *
 *   const stop = watchEmailVerification({
 *     username: 'alice',
 *     email: 'alice@example.com',
 *     apiFetch,
 *     onVerified: () => console.log('email verified via link'),
 *   });
 *
 *   stop(); // call to cancel before verification occurs
 *
 * @param {object} options
 * @param {string} options.username - The account username.
 * @param {string} options.email - The email address to watch for verification.
 * @param {Function} options.apiFetch - The apiFetch function from api-client.js.
 * @param {Function} options.onVerified - Callback fired once when verification is detected.
 * @param {number} [options.intervalMs=3000] - Polling interval in milliseconds.
 * @returns {() => void} A stop function that cancels the polling loop.
 */
export function watchEmailVerification({ username, email, apiFetch, onVerified, intervalMs = 3000 }) {
  let stopped = false;

  async function poll() {
    while (!stopped) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      if (stopped) break;
      try {
        const res = await apiFetch(`/api/v1/users/${encodeURIComponent(username)}/emails`);
        if (!res.ok) continue;
        const payload = await res.json();
        const emails = payload.data ?? [];
        const entry = emails.find((e) => e.email === email);
        if (entry?.verified) {
          stopped = true;
          onVerified();
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
