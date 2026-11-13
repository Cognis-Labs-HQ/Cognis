/**
 * Resolves a backend-provided message as an i18n key when possible.
 *
 * Exported API:
 * - resolveLocalizedMessage(i18n, message, fallbackKey): Returns a localized
 *   UI message, falling back to the raw backend message when no key matches.
 *
 * Usage:
 *   const text = resolveLocalizedMessage(
 *     i18n,
 *     payload?.error?.message,
 *     'gateway.auth.security.reset_failed',
 *   );
 *
 * @param {{ t: (key: string) => string }} i18n
 * @param {unknown} message
 * @param {string} fallbackKey
 * @returns {string}
 */
export function resolveLocalizedMessage(i18n, message, fallbackKey) {
    if (typeof message !== "string" || !message.trim()) {
        return i18n.t(fallbackKey);
    }
    const translated = i18n.t(message);
    if (typeof translated === "string" && translated.trim()) {
        return translated;
    }
    return message;
}
