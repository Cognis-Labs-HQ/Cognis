import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

let avatarModule = null;
let avatarModulePromise = null;
let avatarWarningLogged = false;

function logAvatarFailure(error) {
    if (avatarWarningLogged) return;
    avatarWarningLogged = true;
    console.warn("[classroom] Failed to load profile avatar helpers.", {
        operation: "loadProfileAvatarHelpers",
        error: error instanceof Error ? error.message : String(error),
    });
}

async function loadAvatarModule() {
    if (!avatarModulePromise) {
        avatarModulePromise =
            import("/static/gateways/social/reuse/profile-avatar.js")
                .then((loadedAvatarModule) => {
                    avatarModule = loadedAvatarModule;
                    return loadedAvatarModule;
                })
                .catch((error) => {
                    avatarModule = null;
                    logAvatarFailure(error);
                    return null;
                });
    }
    return avatarModulePromise;
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
    const loadedAvatarModule = await loadAvatarModule();
    if (typeof loadedAvatarModule?.fetchProfileAvatarBlobUrl !== "function") {
        return null;
    }
    return loadedAvatarModule.fetchProfileAvatarBlobUrl(avatarKey);
}

export function buildProfileAvatarMarkup(params) {
    if (typeof avatarModule?.buildProfileAvatarMarkup === "function") {
        return avatarModule.buildProfileAvatarMarkup(params);
    }
    return buildFallbackProfileAvatarMarkup(params ?? {});
}

export async function hydrateProfileAvatars(container) {
    const loadedAvatarModule = await loadAvatarModule();
    if (typeof loadedAvatarModule?.hydrateProfileAvatars !== "function") {
        return;
    }
    await loadedAvatarModule.hydrateProfileAvatars(container);
}

export function handleProfileAvatarError(event) {
    if (typeof avatarModule?.handleProfileAvatarError !== "function") {
        return;
    }
    avatarModule.handleProfileAvatarError(event);
}

export async function loadProfileAvatarHelpers() {
    await loadAvatarModule();
    return {
        handleProfileAvatarError,
        hydrateProfileAvatars,
    };
}
