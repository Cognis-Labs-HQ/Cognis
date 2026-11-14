import { escapeHtml } from "/static/reuse/escape-html.js";
import { ensurePersistentStylesheet } from "/static/reuse/page-styles.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    availabilityIndicatorMarkup,
    hydrateAvailabilityIndicators,
} from "./availability.js";

import { createAvatarCache } from "./reuse/avatar-cache.js";

let activeScope = null;
let activeContext = null;
const mountedImages = new WeakSet();
const imageContexts = new WeakMap();
const imageOwners = new WeakMap();
const cache = createAvatarCache({
    isCurrent: (context) => context === getAvatarContext() && !!context,
    invalidate: (key) => {
        for (const image of document.querySelectorAll("img[data-avatar-key]")) {
            if (
                !mountedImages.has(image) ||
                (key !== undefined && image.dataset.avatarKey !== key)
            )
                continue;
            replaceFailedImage(image);
            mountedImages.delete(image);
        }
    },
    log: (...args) => uiCtx.capabilities.get("ui:log")?.(...args),
});

function isRendererAvailable() {
    return (
        !!activeScope &&
        !activeScope.signal.aborted &&
        uiCtx.capabilities.get("ui:profileAvatarRenderer") === avatarRenderer
    );
}

function notifyRendererChange() {
    window.dispatchEvent(
        new window.Event("cognis:profile-avatar-renderer-changed"),
    );
}

export function getAvatarContext() {
    if (!isRendererAvailable()) return null;
    const account = localStorage.getItem("cognis_account");
    const token = localStorage.getItem("cognis_access_token");
    if (activeContext?.account !== account || activeContext?.token !== token) {
        activeContext = { account, token };
        cache.clear();
    }
    return activeContext;
}

export function evictProfileAvatarImage(key, url) {
    cache.evictImage(key, url);
}

export function invalidateProfileAvatar(key) {
    cache.clear(key);
}

export function mountProfileAvatarRenderer(scope) {
    activeScope = scope;
    activeContext = null;
    scope.capabilities.contribute("ui:profileAvatarRenderer", avatarRenderer);
    scope.signal.addEventListener(
        "abort",
        () => {
            if (activeScope !== scope) return;
            activeScope = null;
            activeContext = null;
            cache.clear();
            notifyRendererChange();
        },
        { once: true },
    );
    notifyRendererChange();
}

export function readProfileAvatar(avatarKey) {
    return cache.read(avatarKey, getAvatarContext());
}
const availabilityStylesReady = ensurePersistentStylesheet(
    "/static/adapters/social/profile/availability.css",
);

/** Waits until the profile avatar and availability styles are ready. */
export async function ensureProfileAvatarStyles() {
    await availabilityStylesReady;
}

/** Returns profile initials using the profile adapter's canonical rules. */
export function getProfileInitials(label) {
    if (!label) return "?";
    const clean = String(label).replace(/^@/, "").trim();
    const parts = clean.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] ?? clean[0] ?? "?").toUpperCase();
}

/** Returns the profile adapter's deterministic initials colour. */
export function getProfileInitialsColor(seed) {
    let hash = 0;
    for (const character of String(seed ?? "")) {
        hash = (hash * 31 + character.charCodeAt(0)) | 0;
    }
    return `hsl(${Math.abs(hash) % 360}, 55%, 42%)`;
}

/** Returns canonical presentation for an already authorized profile record. */
export function getProfileAvatarPresentation(profile = {}) {
    const label = String(profile?.displayName || profile?.handle || "");
    return {
        label,
        colorSeed: label,
        initials: getProfileInitials(label),
        color: getProfileInitialsColor(label),
    };
}

/**
 * Builds only the avatar content; callers retain their link, button and badge.
 * Sizes are small (32px), medium (48px) and large (80px).
 * @param {{ profile?: object, size?: string, avatarKey?: string, blobUrl?: string, imageClass?: string, imageAlt?: string }} options
 * @returns {string}
 */
export function buildProfileAvatarContent({
    profile = {},
    size = "small",
    avatarKey = "",
    blobUrl = "",
    imageClass = "",
    imageAlt = "",
} = {}) {
    if (!["small", "medium", "large"].includes(size))
        throw new Error("profile_avatar_size_invalid");
    const { label, colorSeed } = getProfileAvatarPresentation(profile);
    const fallbackClass = "profile-capability-avatar-initials";
    const rendererImageClass = ["profile-capability-avatar-image", imageClass]
        .filter(Boolean)
        .join(" ");
    const initials = buildInitialsHtml(label, colorSeed, fallbackClass, {
        avatarKey,
        imageClass: rendererImageClass,
    });
    const content = blobUrl
        ? `<img class="${escapeHtml(rendererImageClass)}" src="${escapeHtml(blobUrl)}" alt="${escapeHtml(imageAlt)}"` +
          ` data-avatar-key="${escapeHtml(avatarKey)}" data-avatar-label="${escapeHtml(label)}"` +
          ` data-avatar-color-seed="${escapeHtml(colorSeed)}" data-avatar-fallback-class="${fallbackClass}">`
        : initials;
    return `<span class="profile-avatar-content" data-profile-avatar-size="${size}">${content}</span>`;
}

/** Refreshes retained image fallback metadata without replacing its image node. */
export function updateProfileAvatarImage(image, placeholder) {
    for (const key of [
        "avatarKey",
        "avatarLabel",
        "avatarColorSeed",
        "avatarFallbackClass",
    ])
        image.dataset[key] = placeholder.dataset[key] || "";
    image.className =
        placeholder.tagName === "IMG"
            ? placeholder.className
            : placeholder.dataset.avatarImageClass;
    image.alt = placeholder.getAttribute("alt") || "";
}

/** Reconciles owner content after its caller has checked the current lifetime. */
export function renderProfileAvatarContent(
    previous,
    options,
    { retainImage = false } = {},
) {
    if (retainImage && !options.profile && previous) return previous;
    const template = document.createElement("template");
    template.innerHTML = buildProfileAvatarContent(options);
    const content = document.adoptNode(template.content.firstElementChild);
    const image = previous?.querySelector("img[data-avatar-key]");
    const next = content.firstElementChild;
    if (
        image &&
        (retainImage ||
            (image.dataset.avatarKey === next.dataset.avatarKey &&
                image.getAttribute("src") === next.getAttribute("src")))
    ) {
        // A failed metadata read supplies no newer identity for a retained image.
        if (options.profile) updateProfileAvatarImage(image, next);
        next.replaceWith(image);
        imageOwners.set(image, options.isCurrent);
    } else if (next.tagName === "IMG") {
        trackProfileAvatarImage(next, options.isCurrent);
    }
    return content;
}

/**
 * Generates an initials span, optionally annotated with data attributes for
 * deferred image hydration when an avatarKey and imageClass are supplied.
 *
 * @param {string} label
 * @param {string} colorSeed
 * @param {string} fallbackClass
 * @param {{ avatarKey?: string, imageClass?: string }} [opts]
 * @returns {string}
 */
function buildInitialsHtml(
    label,
    colorSeed,
    fallbackClass,
    { avatarKey = "", imageClass = "" } = {},
) {
    const color = getProfileInitialsColor(colorSeed);
    const dataAttrs = avatarKey
        ? ` data-avatar-key="${escapeHtml(avatarKey)}"` +
          ` data-avatar-label="${escapeHtml(label)}"` +
          ` data-avatar-color-seed="${escapeHtml(colorSeed)}"` +
          ` data-avatar-fallback-class="${escapeHtml(fallbackClass)}"` +
          ` data-avatar-image-class="${escapeHtml(imageClass)}"`
        : "";
    return (
        `<span class="${escapeHtml(fallbackClass)}"` +
        ` style="--initials-bg: ${escapeHtml(color)};"${dataAttrs}>` +
        `${escapeHtml(getProfileInitials(label))}</span>`
    );
}

function trackProfileAvatarImage(image, isCurrent) {
    if (!mountedImages.has(image)) {
        image.addEventListener("error", handleProfileAvatarError, {
            once: true,
        });
        mountedImages.add(image);
    }
    imageContexts.set(image, getAvatarContext());
    if (isCurrent) imageOwners.set(image, isCurrent);
}

/**
 * Replaces a hydration-pending initials placeholder with an actual <img>.
 *
 * @param {Element} placeholder
 * @param {string} blobUrl - Blob URL for the avatar image.
 */
function replaceAvatarPlaceholder(placeholder, blobUrl) {
    const avatarKey = placeholder.dataset.avatarKey;
    const fallbackClass = placeholder.dataset.avatarFallbackClass;
    const label = placeholder.dataset.avatarLabel || "";
    const colorSeed = placeholder.dataset.avatarColorSeed || label;
    const imageClass = placeholder.dataset.avatarImageClass;
    if (!avatarKey || !fallbackClass || !imageClass) return;
    const image = document.createElement("img");
    image.className = imageClass;
    image.src = blobUrl;
    image.alt = "";
    image.dataset.avatarKey = avatarKey;
    image.dataset.avatarLabel = label;
    image.dataset.avatarColorSeed = colorSeed;
    image.dataset.avatarFallbackClass = fallbackClass;
    placeholder.replaceWith(image);
    trackProfileAvatarImage(image);
}

/**
 * Fetches a profile avatar image via authenticated API and returns a blob URL.
 * Confirmed absence is cached briefly; transient failures remain retryable.
 *
 * @param {string|null|undefined} avatarKey
 * @returns {Promise<string|null>}
 */
export async function fetchProfileAvatarBlobUrl(avatarKey) {
    const result = await readProfileAvatar(avatarKey);
    return result.state === "available" ? result.blobUrl : null;
}

/**
 * Returns true when the key is confirmed absent or denied in the current session.
 *
 * @param {string|null|undefined} avatarKey
 * @returns {boolean}
 */
export function isProfileAvatarUnavailable(avatarKey) {
    getAvatarContext();
    return !avatarKey || cache.unavailable(avatarKey);
}

/**
 * Generates complete avatar markup. When avatarKey is present,
 * produces an initials span with data attributes
 * for deferred image hydration via hydrateProfileAvatars(). When no key is
 * available, produces a plain initials span.
 * The result is wrapped in a linked <a> when profileHandle is provided,
 * or a plain <span> otherwise.
 *
 * @param {object} params
 * @param {string|null|undefined} params.avatarKey
 * @param {string} params.label
 * @param {string} params.colorSeed
 * @param {string} params.avatarClass
 * @param {string} params.imageClass
 * @param {string} params.fallbackClass
 * @param {string|null} [params.profileHandle]
 * @param {string} [params.linkClass]
 * @param {boolean} [params.showAvailability=true]
 * @returns {string}
 */
export function buildProfileAvatarMarkup({
    avatarKey,
    label,
    colorSeed,
    avatarClass,
    imageClass,
    fallbackClass,
    profileHandle = null,
    linkClass = "",
    showAvailability = true,
}) {
    const safeColorSeed = colorSeed || label;
    const rendererAvatarClass = `${avatarClass} profile-capability-avatar`;
    const rendererImageClass = `${imageClass} profile-capability-avatar-image`;
    const rendererFallbackClass = `${fallbackClass} profile-capability-avatar-initials`;
    const canHydrate = !!avatarKey;
    const avatarContent = canHydrate
        ? buildInitialsHtml(label, safeColorSeed, rendererFallbackClass, {
              avatarKey,
              imageClass: rendererImageClass,
          })
        : buildInitialsHtml(label, safeColorSeed, rendererFallbackClass);
    const profileLink = profileHandle
        ? `/profile/${encodeURIComponent(
              String(profileHandle).replace(/^@/, ""),
          )}`
        : "";
    if (profileLink) {
        const classes = [
            rendererAvatarClass,
            linkClass,
            showAvailability && "availability-avatar",
        ]
            .filter(Boolean)
            .join(" ");
        return (
            `<a class="${escapeHtml(classes)}"` +
            ` href="${escapeHtml(profileLink)}"` +
            ` aria-label="${escapeHtml(label)}">${avatarContent}` +
            `${showAvailability ? availabilityIndicatorMarkup(profileHandle) : ""}</a>`
        );
    }
    const classes = [
        rendererAvatarClass,
        showAvailability && "availability-avatar",
    ]
        .filter(Boolean)
        .join(" ");
    return `<span class="${escapeHtml(classes)}">${avatarContent}${showAvailability ? availabilityIndicatorMarkup("") : ""}</span>`;
}

/**
 * Finds all hydration-pending avatar placeholders inside container and
 * asynchronously replaces each with a loaded <img>. Placeholders whose
 * read fails remain initials and can retry on a later hydration.
 *
 * @param {Element} container
 * @returns {Promise<void>}
 */
export async function hydrateProfileAvatars(container, { signal } = {}) {
    const context = getAvatarContext();
    await ensureProfileAvatarStyles();
    if (!context || context !== getAvatarContext() || signal?.aborted) return;
    const placeholders = Array.from(
        container.querySelectorAll(
            "[data-avatar-key][data-avatar-image-class], img[data-avatar-key]",
        ),
    );
    await Promise.all(
        placeholders.map(async (placeholder) => {
            const avatarKey = placeholder.dataset?.avatarKey;
            if (!avatarKey) return;
            if (placeholder.tagName === "IMG")
                trackProfileAvatarImage(placeholder);
            if (isProfileAvatarUnavailable(avatarKey)) {
                if (placeholder.tagName === "IMG")
                    replaceFailedImage(placeholder);
                return;
            }
            const label = placeholder.dataset.avatarLabel;
            const colorSeed = placeholder.dataset.avatarColorSeed;
            const blobUrl = await fetchProfileAvatarBlobUrl(avatarKey);
            if (
                !blobUrl ||
                context !== getAvatarContext() ||
                !placeholder.isConnected ||
                signal?.aborted ||
                placeholder.dataset.avatarKey !== avatarKey ||
                placeholder.dataset.avatarLabel !== label ||
                placeholder.dataset.avatarColorSeed !== colorSeed
            )
                return;
            if (placeholder.tagName !== "IMG")
                replaceAvatarPlaceholder(placeholder, blobUrl);
            else {
                if (placeholder.src !== blobUrl) placeholder.src = blobUrl;
                trackProfileAvatarImage(placeholder);
            }
        }),
    );
    if (context === getAvatarContext() && !signal?.aborted)
        await hydrateAvailabilityIndicators(container);
}

const avatarRenderer = {
    get available() {
        return isRendererAvailable();
    },
    buildMarkup: buildProfileAvatarMarkup,
    buildContent: buildProfileAvatarContent,
    getPresentation: getProfileAvatarPresentation,
    fetch: fetchProfileAvatarBlobUrl,
    getInitials: getProfileInitials,
    getInitialsColor: getProfileInitialsColor,
    handleError: handleProfileAvatarError,
    hydrate: hydrateProfileAvatars,
    isUnavailable: isProfileAvatarUnavailable,
    invalidate: invalidateProfileAvatar,
};

/**
 * Handles an image decoding error by evicting its read and restoring a
 * retryable initials placeholder. No retry is scheduled automatically.
 * Attach to a shared ancestor in capture phase:
 *   root.addEventListener('error', handleProfileAvatarError, { capture: true });
 *
 * @param {Event} event
 */
export function handleProfileAvatarError(event) {
    const image = event.target;
    if (!image || image.tagName !== "IMG") return;
    const avatarKey = image.dataset?.avatarKey;
    if (!avatarKey) return;
    if (!image.isConnected || !mountedImages.has(image)) return;
    if (
        imageContexts.get(image) !== getAvatarContext() ||
        imageOwners.get(image)?.() === false
    )
        return;
    cache.evictImage(avatarKey, image.src);
    replaceFailedImage(image);
}

function replaceFailedImage(image) {
    const avatarKey = image.dataset?.avatarKey;
    const fallbackClass = image.dataset.avatarFallbackClass;
    if (!fallbackClass) return;
    const label = image.dataset.avatarLabel || "";
    const colorSeed = image.dataset.avatarColorSeed || label;
    const template = document.createElement("template");
    template.innerHTML = buildInitialsHtml(label, colorSeed, fallbackClass, {
        avatarKey,
        imageClass: image.className,
    });
    const fallback = template.content.firstElementChild;
    if (fallback) image.replaceWith(fallback);
}
