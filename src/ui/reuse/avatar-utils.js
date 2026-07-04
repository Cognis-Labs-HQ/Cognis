/**
 * Avatar utilities: initials-based fallback avatar generation.
 *
 * Public exports:
 *   getInitialsText(handle) — returns a 1-2 letter initials string for the given handle.
 *   pickInitialsColor(handle) — returns a deterministic hsl(...) color string for the given handle.
 *   buildInitialsAvatarHtml(label, colorSeed, fallbackClass) — returns an HTML string for an
 *     inline initials avatar span, suitable for use in innerHTML.
 *   generateInitialsDataUrl(handle, size) — canvas PNG data URL (kept for environments where
 *     a data: URI is acceptable; prefer CSS initials for CSP-restricted pages).
 *
 * Usage:
 *   import { getInitialsText, pickInitialsColor, buildInitialsAvatarHtml } from '../reuse/avatar-utils.js';
 *   span.textContent = getInitialsText('@alice_smith');        // → "AS"
 *   div.style.background = pickInitialsColor('@alice_smith');  // → "hsl(210, 55%, 42%)"
 *   el.innerHTML = buildInitialsAvatarHtml('@alice', null, 'avatar-fallback');
 *
 * @param {string} handle — the user's handle (leading '@' is stripped automatically).
 */

export function getInitialsText(handle) {
    if (!handle) return "?";
    const clean = handle.replace(/^@/, "");
    const parts = clean.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
}

export function pickInitialsColor(handle) {
    let hash = 0;
    for (const char of handle ?? "") {
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 42%)`;
}

export function buildInitialsAvatarHtml(label, colorSeed, fallbackClass) {
    const resolvedLabel = String(label ?? "").trim();
    const resolvedColorSeed = String(colorSeed ?? "").trim() || resolvedLabel;
    const resolvedFallbackClass = String(fallbackClass ?? "").trim();
    const backgroundColor = pickInitialsColor(resolvedColorSeed);
    const initials = getInitialsText(resolvedLabel);
    return [
        `<span class="${resolvedFallbackClass}"`,
        ` style="--initials-bg: ${backgroundColor};">`,
        `${initials}</span>`,
    ].join("");
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
