/**
 * CTX-backed access to profile-owned initials avatar generation.
 *
 * Public exports:
 *   getInitialsText(label) — returns a 1-2 letter initials string for the given profile label.
 *   pickInitialsColor(handle) — returns a deterministic hsl(...) color string for the given handle.
 *   generateInitialsDataUrl(handle, size) — canvas PNG data URL (kept for environments where
 *     a data: URI is acceptable; prefer CSS initials for CSP-restricted pages).
 *
 * Usage:
 *   import { getInitialsText, pickInitialsColor } from '../reuse/avatar-utils.js';
 *   span.textContent = getInitialsText('Alice Smith');        // → "AS"
 *   div.style.background = pickInitialsColor('@alice_smith');  // → "hsl(210, 55%, 42%)"
 *
 * @param {string} label — the user's profile name or handle (leading '@' is stripped automatically).
 */

import { uiCtx } from "./ui-ctx.js";

function getProfileAvatarRenderer() {
    const renderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (!renderer) {
        throw new Error("The profile avatar capability is unavailable.");
    }
    return renderer;
}

export function getInitialsText(label) {
    return getProfileAvatarRenderer().getInitialsText(label);
}

export function pickInitialsColor(handle) {
    return getProfileAvatarRenderer().pickInitialsColor(handle);
}

export function generateInitialsDataUrl(handle, size = 64) {
    const initials = getInitialsText(handle);
    const color = pickInitialsColor(handle);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(size * 0.38)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, size / 2, size / 2);
    return canvas.toDataURL("image/png");
}
