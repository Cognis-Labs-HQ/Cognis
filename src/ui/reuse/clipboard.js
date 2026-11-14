/**
 * Generic clipboard-copy helper shared across features.
 *
 * Public exports:
 *   copyTextToClipboard(value) — copies text via the async Clipboard API and
 *     resolves to `true`/`false` instead of throwing, so callers never need
 *     to guard against an unavailable/blocked `navigator.clipboard`.
 *
 * Usage:
 *   import { copyTextToClipboard } from '/static/reuse/clipboard.js';
 *
 *   const copied = await copyTextToClipboard(shareUrl);
 *   showToast(copied ? labels.copySuccess : labels.copyFailed, {
 *     variant: copied ? "success" : "error",
 *   });
 *
 * @param {string} value - Text to copy to the clipboard.
 * @returns {Promise<boolean>} Whether the copy succeeded.
 */
export async function copyTextToClipboard(value) {
    if (typeof navigator === "undefined") return false;
    if (typeof navigator.clipboard?.writeText !== "function") return false;
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        return false;
    }
}
