/**
 * Profile-avatar capability access for UI consumers.
 *
 * Public exports:
 *   getInitialsText(label) — asks the profile adapter for canonical initials.
 *   pickInitialsColor(seed) — asks the profile adapter for the canonical colour.
 *   generateInitialsDataUrl(label, size) — renders the capability result to a canvas.
 *
 * Usage:
 *   import { getInitialsText } from './avatar-utils.js';
 *   badge.textContent = getInitialsText('Alice Smith');
 *
 * @param {string} label
 * @returns {string}
 */
import { uiCtx } from "./ui-ctx.js";

function getProfileAvatarCapability() {
    const capability = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (!capability) {
        throw new Error("The profile avatar UI capability is unavailable");
    }
    return capability;
}

export function getInitialsText(label) {
    return getProfileAvatarCapability().getInitials(label);
}

export function pickInitialsColor(seed) {
    return getProfileAvatarCapability().getInitialsColor(seed);
}

export function generateInitialsDataUrl(label, size = 64) {
    const capability = getProfileAvatarCapability();
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = capability.getInitialsColor(label);
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = `bold ${Math.round(size * 0.38)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(capability.getInitials(label), size / 2, size / 2);
    return canvas.toDataURL("image/png");
}
