/**
 * Profile adapter avatar rendering: authenticated fetch with initials fallback.
 *
 * Provides the single profile-owned mechanism for fetching and rendering
 * profile avatar images exposed through the social gateway UI export. Callers only need to
 * describe the avatar parameters — this module handles the authenticated
 * fetch, in-memory caching, DOM hydration, and automatic reversion to
 * initials when an image is unavailable or fails to load.
 *
 * Public exports:
 *   getProfileInitials(label) — generates canonical initials for a profile label.
 *   getProfileInitialsColor(seed) — generates the canonical fallback colour.
 *   fetchProfileAvatarBlobUrl(avatarKey) — fetches the avatar image via
 *     authenticated API and returns a blob: URL, or null if unavailable.
 *     Results are cached per key for the lifetime of the page.
 *   isProfileAvatarUnavailable(avatarKey) — returns true when a key is
 *     known to be permanently unavailable in this session.
 *   buildProfileAvatarMarkup(params) — generates avatar HTML that shows
 *     an initials placeholder wired for async hydration when an avatarKey
 *     is provided, or pure initials when no key exists. Pair with
 *     hydrateProfileAvatars() after inserting the HTML into the DOM.
 *   hydrateProfileAvatars(container) — finds all pending avatar
 *     placeholders inside container and replaces them with loaded <img>
 *     elements.
 *   handleProfileAvatarError(event) — attach to a container's "error"
 *     event (capture phase) to automatically revert a failed avatar <img>
 *     back to an initials span.
 *
 * Usage:
 *   import {
 *     buildProfileAvatarMarkup,
 *     hydrateProfileAvatars,
 *     handleProfileAvatarError,
 *   } from '/static/adapters/social/profile/profile-avatar.js';
 *
 *   // In a render function:
 *   container.innerHTML = buildProfileAvatarMarkup({
 *     avatarKey: member.avatarKey,
 *     label: member.displayName,
 *     colorSeed: member.handle,
 *     avatarClass: 'my-avatar',
 *     imageClass: 'my-avatar-img',
 *     fallbackClass: 'my-avatar-initials',
 *     profileHandle: member.handle,
 *     linkClass: 'my-avatar-link',
 *     showAvailability: false,
 *   });
 *   await hydrateProfileAvatars(container);
 *
 *   // Attach once on a shared ancestor to revert broken images to initials:
 *   root.addEventListener('error', handleProfileAvatarError, { capture: true });
 */

import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    availabilityIndicatorMarkup,
    hydrateAvailabilityIndicators,
} from "./availability.js";

const unavailableAvatarKeys = new Set();
const avatarBlobUrlCache = new Map();
const availabilityStylesReady = ensurePageStylesheet(
    "/static/adapters/social/profile/availability.css",
);

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

/**
 * Builds the authenticated API URL for a stored file by key. Room/chatroom
 * avatar keys are namespaced under "chats" (prefixed with "chatrooms/" by
 * convention); every other avatar key belongs to the "profile" namespace.
 *
 * @param {string} avatarKey
 * @returns {string}
 */
function buildAvatarFileUrl(avatarKey) {
    const namespace = String(avatarKey).startsWith("chatrooms/")
        ? "chats"
        : "profile";
    return `/api/v1/files/${namespace}/${String(avatarKey)
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`;
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
}

/**
 * Fetches a profile avatar image via authenticated API and returns a blob URL.
 * Keys known to be unavailable are skipped immediately. Results are cached
 * per key for the lifetime of the page.
 *
 * @param {string|null|undefined} avatarKey
 * @returns {Promise<string|null>}
 */
export async function fetchProfileAvatarBlobUrl(avatarKey) {
    if (!avatarKey || unavailableAvatarKeys.has(avatarKey)) return null;
    if (avatarBlobUrlCache.has(avatarKey))
        return avatarBlobUrlCache.get(avatarKey);
    const promise = apiFetch(buildAvatarFileUrl(avatarKey))
        .then(async (response) => {
            if (!response.ok) return null;
            return URL.createObjectURL(await response.blob());
        })
        .catch(() => null);
    avatarBlobUrlCache.set(avatarKey, promise);
    return promise;
}

/**
 * Returns true when the given key is known to be permanently unavailable
 * in this session (either never fetched successfully, or image load failed).
 *
 * @param {string|null|undefined} avatarKey
 * @returns {boolean}
 */
export function isProfileAvatarUnavailable(avatarKey) {
    return !avatarKey || unavailableAvatarKeys.has(avatarKey);
}

/**
 * Generates complete avatar markup. When avatarKey is present and not yet
 * known to be unavailable, produces an initials span with data attributes
 * for deferred image hydration via hydrateProfileAvatars(). When no key is
 * available or the key is known unavailable, produces a plain initials span.
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
    const canHydrate = avatarKey && !unavailableAvatarKeys.has(avatarKey);
    const avatarContent = canHydrate
        ? buildInitialsHtml(label, safeColorSeed, fallbackClass, {
              avatarKey,
              imageClass,
          })
        : buildInitialsHtml(label, safeColorSeed, fallbackClass);
    const profileLink = profileHandle
        ? `/profile/${encodeURIComponent(
              String(profileHandle).replace(/^@/, ""),
          )}`
        : "";
    if (profileLink) {
        const classes = [
            avatarClass,
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
    return `<span class="${escapeHtml(avatarClass)}">${avatarContent}</span>`;
}

/**
 * Finds all hydration-pending avatar placeholders inside container and
 * asynchronously replaces each with a loaded <img>. Placeholders whose
 * key resolves to null are recorded as unavailable and left as initials.
 *
 * @param {Element} container
 * @returns {Promise<void>}
 */
export async function hydrateProfileAvatars(container) {
    await availabilityStylesReady;
    const placeholders = Array.from(
        container.querySelectorAll(
            "[data-avatar-key][data-avatar-image-class]",
        ),
    );
    await Promise.all(
        placeholders.map(async (placeholder) => {
            const avatarKey = placeholder.dataset?.avatarKey;
            if (!avatarKey || unavailableAvatarKeys.has(avatarKey)) return;
            const blobUrl = await fetchProfileAvatarBlobUrl(avatarKey);
            if (!blobUrl) {
                unavailableAvatarKeys.add(avatarKey);
                return;
            }
            if (!placeholder.isConnected) return;
            replaceAvatarPlaceholder(placeholder, blobUrl);
        }),
    );
    await hydrateAvailabilityIndicators(container);
}

uiCtx.capabilities.contribute("ui:profileAvatarRenderer", {
    buildMarkup: buildProfileAvatarMarkup,
    fetch: fetchProfileAvatarBlobUrl,
    getInitials: getProfileInitials,
    getInitialsColor: getProfileInitialsColor,
    handleError: handleProfileAvatarError,
    hydrate: hydrateProfileAvatars,
    isUnavailable: isProfileAvatarUnavailable,
});

/**
 * Handles an "error" event on an avatar <img> by marking its key as
 * unavailable and reverting the element to an initials span in place.
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
    unavailableAvatarKeys.add(avatarKey);
    const fallbackClass = image.dataset.avatarFallbackClass;
    if (!fallbackClass) return;
    const label = image.dataset.avatarLabel || "";
    const colorSeed = image.dataset.avatarColorSeed || label;
    const template = document.createElement("template");
    template.innerHTML = buildInitialsHtml(label, colorSeed, fallbackClass);
    const fallback = template.content.firstElementChild;
    if (fallback) image.replaceWith(fallback);
}
