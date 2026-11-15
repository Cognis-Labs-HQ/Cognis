import { escapeHtml } from "../../../../../ui/reuse/escape-html.js";

export function createAvatarRenderer({
    calls = [],
    contentRequests = [],
} = {}) {
    return {
        available: true,
        calls,
        getPresentation(profile) {
            calls.push({ operation: "presentation", profile });
            const label = profile.displayName || profile.handle || "";
            return { label, colorSeed: label };
        },
        buildContent(options) {
            calls.push({ operation: "content", options });
            contentRequests.push(options);
            const { label, colorSeed } = this.getPresentation(options.profile);
            return `<span class="profile-avatar-content" data-profile-avatar-size="${escapeHtml(options.size)}"><span data-avatar-key="${escapeHtml(options.avatarKey || "")}" data-avatar-label="${escapeHtml(label)}" data-avatar-color-seed="${escapeHtml(colorSeed)}" data-avatar-image-class="profile-capability-avatar-image">${escapeHtml(label)}</span></span>`;
        },
    };
}
