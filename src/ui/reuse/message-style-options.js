/**
 * Canonical message style options used by settings and chat rendering.
 *
 * Public exports:
 * - MESSAGE_STYLE_OPTIONS: ordered list of selectable style keys.
 * - isValidMessageStyle(value): checks whether a style key is supported.
 * - normalizeMessageStyle(value, fallback): returns a supported style key.
 *
 * Usage:
 *   import {
 *     MESSAGE_STYLE_OPTIONS,
 *     normalizeMessageStyle,
 *   } from '/static/reuse/message-style-options.js';
 *
 *   const style = normalizeMessageStyle(rawValue);
 *
 */
export const MESSAGE_STYLE_OPTIONS = Object.freeze([
    "default",
    "speech_bubbles",
    "irc",
]);

const messageStyleSet = new Set(MESSAGE_STYLE_OPTIONS);

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidMessageStyle(value) {
    return messageStyleSet.has(value);
}

/**
 * @param {string} value
 * @param {string} [fallback="default"] - Fallback style when value is invalid.
 * @returns {string}
 */
export function normalizeMessageStyle(value, fallback = "default") {
    return isValidMessageStyle(value) ? value : fallback;
}
