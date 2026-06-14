import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

let avatarModule = null;
let avatarModulePromise = null;
let avatarWarningLogged = false;

function normalizeValue(value) {
    return String(value ?? "").trim();
}

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
                .then(
                    (loadedAvatarModule) => (avatarModule = loadedAvatarModule),
                )
                .catch((error) => {
                    avatarModule = null;
                    logAvatarFailure(error);
                    return null;
                });
    }
    return avatarModulePromise;
}

function buildInitialsHtml(label, colorSeed, fallbackClass) {
    const resolvedLabel = normalizeValue(label);
    const resolvedColorSeed = normalizeValue(colorSeed) || resolvedLabel;
    const resolvedFallbackClass = normalizeValue(fallbackClass);
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
    const resolvedLabel = normalizeValue(label);
    const avatarContent = buildInitialsHtml(
        resolvedLabel,
        colorSeed,
        fallbackClass,
    );
    const resolvedProfileHandle = normalizeValue(profileHandle).replace(
        /^@/,
        "",
    );
    const profileLink = resolvedProfileHandle
        ? `/profile/${encodeURIComponent(resolvedProfileHandle)}`
        : "";
    if (profileLink) {
        const classes = [avatarClass, linkClass].filter(Boolean).join(" ");
        return [
            `<a class="${escapeHtml(classes)}"`,
            ` href="${escapeHtml(profileLink)}"`,
            ` aria-label="${escapeHtml(resolvedLabel)}">${avatarContent}</a>`,
        ].join("");
    }
    return `<span class="${escapeHtml(normalizeValue(avatarClass))}">${avatarContent}</span>`;
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
