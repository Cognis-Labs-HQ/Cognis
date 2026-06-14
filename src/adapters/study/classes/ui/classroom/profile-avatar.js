import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

let socialAvatarModule = null;
let socialAvatarModulePromise = null;
let socialAvatarWarningLogged = false;

const log = (...messageParts) => console.warn(...messageParts);

function logSocialAvatarFailure(error) {
    if (socialAvatarWarningLogged) return;
    socialAvatarWarningLogged = true;
    log("[classroom] Failed to load profile avatar helpers.", {
        operation: "loadProfileAvatarHelpers",
        error: error instanceof Error ? error.message : String(error),
    });
}

async function loadSocialAvatarModule() {
    if (!socialAvatarModulePromise) {
        socialAvatarModulePromise =
            import("/static/gateways/social/reuse/profile-avatar.js")
                .then((avatarModule) => {
                    socialAvatarModule = avatarModule;
                    return avatarModule;
                })
                .catch((error) => {
                    socialAvatarModule = null;
                    logSocialAvatarFailure(error);
                    return null;
                });
    }
    return socialAvatarModulePromise;
}

function buildInitialsHtml(label, colorSeed, fallbackClass) {
    const resolvedLabel = String(label ?? "").trim();
    const resolvedColorSeed = String(colorSeed ?? "").trim() || resolvedLabel;
    const resolvedFallbackClass = String(fallbackClass ?? "").trim();
    const backgroundColor = pickInitialsColor(resolvedColorSeed);
    return [
        `<span class="${escapeHtml(resolvedFallbackClass)}"`,
        ` style="--initials-bg: ${escapeHtml(backgroundColor)};">`,
        `${escapeHtml(getInitialsText(resolvedLabel))}</span>`,
    ].join("");
}

function buildFallbackProfileAvatarMarkup({
    avatarClass,
    fallbackClass,
    label,
    colorSeed,
    profileHandle = null,
    linkClass = "",
}) {
    const resolvedLabel = String(label ?? "").trim();
    const avatarContent = buildInitialsHtml(
        resolvedLabel,
        colorSeed,
        fallbackClass,
    );
    const profileLink = profileHandle
        ? `/profile/${encodeURIComponent(
              String(profileHandle).replace(/^@/, ""),
          )}`
        : "";
    if (profileLink) {
        const classes = [avatarClass, linkClass].filter(Boolean).join(" ");
        return [
            `<a class="${escapeHtml(classes)}"`,
            ` href="${escapeHtml(profileLink)}"`,
            ` aria-label="${escapeHtml(resolvedLabel)}">${avatarContent}</a>`,
        ].join("");
    }
    return `<span class="${escapeHtml(String(avatarClass ?? "").trim())}">${avatarContent}</span>`;
}

export async function fetchProfileAvatarBlobUrl(avatarKey) {
    const avatarModule = await loadSocialAvatarModule();
    if (typeof avatarModule?.fetchProfileAvatarBlobUrl !== "function") {
        return null;
    }
    return avatarModule.fetchProfileAvatarBlobUrl(avatarKey);
}

export function buildProfileAvatarMarkup(params) {
    if (typeof socialAvatarModule?.buildProfileAvatarMarkup === "function") {
        return socialAvatarModule.buildProfileAvatarMarkup(params);
    }
    return buildFallbackProfileAvatarMarkup(params ?? {});
}

export async function hydrateProfileAvatars(container) {
    const avatarModule = await loadSocialAvatarModule();
    if (typeof avatarModule?.hydrateProfileAvatars !== "function") {
        return;
    }
    await avatarModule.hydrateProfileAvatars(container);
}

export function handleProfileAvatarError(event) {
    if (typeof socialAvatarModule?.handleProfileAvatarError !== "function") {
        return;
    }
    socialAvatarModule.handleProfileAvatarError(event);
}

export async function loadProfileAvatarHelpers() {
    await loadSocialAvatarModule();
    return {
        handleProfileAvatarError,
        hydrateProfileAvatars,
    };
}
