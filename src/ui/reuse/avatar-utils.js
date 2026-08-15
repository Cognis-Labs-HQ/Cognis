/**
 * Profile-avatar CTX capability access for UI consumers.
 *
 * Public exports:
 *   buildProfileAvatarMarkup(options) — builds capability-owned avatar markup.
 *   fetchProfileAvatarBlobUrl(key) — fetches an authenticated avatar URL.
 *   getInitialsText(label) — returns capability-owned canonical initials.
 *   pickInitialsColor(seed) — returns the capability-owned canonical colour.
 *   generateInitialsDataUrl(label, size) — renders the capability result to a canvas.
 *   handleProfileAvatarError(event) — delegates failed-image recovery.
 *   hydrateProfileAvatars(container) — hydrates capability-owned avatar markup.
 *   isProfileAvatarUnavailable(key) — checks the capability's unavailable cache.
 *
 * Usage:
 *   import { buildProfileAvatarMarkup, hydrateProfileAvatars } from './avatar-utils.js';
 *   root.innerHTML = buildProfileAvatarMarkup({ label: 'Alice Smith' });
 *   await hydrateProfileAvatars(root);
 */
import { escapeHtml } from "./escape-html.js";
import { uiCtx } from "./ui-ctx.js";

function getProfileAvatarCapability() {
    return uiCtx.capabilities.get("ui:profileAvatarRenderer") ?? null;
}

/** @param {object} options @returns {string} */
export function buildProfileAvatarMarkup(options) {
    const capability = getProfileAvatarCapability();
    if (capability?.buildMarkup) return capability.buildMarkup(options);
    const avatarClass = escapeHtml(options?.avatarClass || "");
    const fallbackClass = escapeHtml(options?.fallbackClass || "");
    return `<span class="${avatarClass}"><span class="${fallbackClass}">?</span></span>`;
}

/** @param {string|null|undefined} avatarKey @returns {Promise<string|null>} */
export async function fetchProfileAvatarBlobUrl(avatarKey) {
    return (await getProfileAvatarCapability()?.fetch?.(avatarKey)) ?? null;
}

/** @param {string} label @returns {string} */
export function getInitialsText(label) {
    return getProfileAvatarCapability()?.getInitials?.(label) ?? "?";
}

/** @param {string} seed @returns {string} */
export function pickInitialsColor(seed) {
    return (
        getProfileAvatarCapability()?.getInitialsColor?.(seed) ??
        "hsl(0, 0%, 42%)"
    );
}

/** @param {string} label @param {number} [size=64] @returns {string} */
export function generateInitialsDataUrl(label, size = 64) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = pickInitialsColor(label);
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = `bold ${Math.round(size * 0.38)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(getInitialsText(label), size / 2, size / 2);
    return canvas.toDataURL("image/png");
}

/** @param {Event} event @returns {void} */
export function handleProfileAvatarError(event) {
    getProfileAvatarCapability()?.handleError?.(event);
}

/** @param {Element} container @returns {Promise<void>} */
export async function hydrateProfileAvatars(container) {
    await getProfileAvatarCapability()?.hydrate?.(container);
}

/** @param {string|null|undefined} avatarKey @returns {boolean} */
export function isProfileAvatarUnavailable(avatarKey) {
    return getProfileAvatarCapability()?.isUnavailable?.(avatarKey) ?? true;
}
