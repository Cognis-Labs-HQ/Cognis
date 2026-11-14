import { profileFetch as apiFetch } from "./offline-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { getRoleLabel, normalizeRoleValue } from "/static/reuse/access-role.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

import { getAvatarContext } from "./profile-avatar.js";
import { profileReadState } from "./reuse/avatar-cache.js";

const SHOW_DELAY_MS = 250;
const HIDE_DELAY_MS = 150;
const PREVIEW_ROLE_LABELS = new Set(["teacher", "admin", "owner"]);
const profileCache = new Map();
let previewEl = null;
let activeLink = null;
let showTimer = null;
let hideTimer = null;
let bound = false;
let previewI18n = null;
let activeScope = null;
let previewContext = null;
let previewHandle = null;
let opening = 0;
let openingController = null;

export function mountProfilePreviews(scope) {
    activeScope = scope;
    scope.signal.addEventListener(
        "abort",
        () => {
            if (activeScope !== scope) return;
            opening++;
            openingController?.abort();
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
            profileCache.clear();
            previewEl?.remove();
            previewEl = null;
            activeLink = null;
            activeScope = null;
            previewContext = null;
            previewHandle = null;
            bound = false;
        },
        { once: true },
    );
}

function profileHandleFromLink(link) {
    const href = link?.getAttribute("href") ?? "";
    const match = href.match(/^\/profile\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]).replace(/^@/, "") : null;
}

async function loadProfilePreview(handle, context) {
    const cached = profileCache.get(handle);
    if (cached?.context === context) return cached.promise;
    if (profileCache.size >= 128) return { state: "retryable" };
    const entry = { context };
    entry.promise = apiFetch(
        `/api/v1/social/users/${encodeURIComponent(handle)}/profile`,
        { signal: activeScope.signal },
    )
        .then(async (response) => {
            const state = profileReadState(response);
            if (state !== "available") return { state };
            const profile = (await response.json())?.data;
            return profile && Object.hasOwn(profile, "avatarKey")
                ? { state, profile }
                : { state: "invalid" };
        })
        .catch((error) => {
            const log = uiCtx.capabilities.get("ui:log");
            log?.("error", "Profile preview read failed.", {
                component: "social-profile",
                operation: "readProfilePreview",
                errorName: error?.name,
            });
            return { state: "retryable" };
        })
        .finally(() => {
            if (profileCache.get(handle) === entry) profileCache.delete(handle);
        });
    profileCache.set(handle, entry);
    return entry.promise;
}

function ensurePreview() {
    if (previewEl) return previewEl;
    previewEl = document.createElement("aside");
    previewEl.className = "profile-mini-preview";
    previewEl.setAttribute("role", "tooltip");
    previewEl.hidden = true;
    previewEl.addEventListener("mouseenter", () => {
        if (hideTimer) clearTimeout(hideTimer);
    });
    previewEl.addEventListener("mouseleave", scheduleHide);
    document.body.appendChild(previewEl);
    return previewEl;
}

function renderAvatar(profile) {
    const renderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    return renderer.buildMarkup({
        avatarKey: profile?.avatarKey,
        label: profile?.displayName || profile?.handle || "",
        colorSeed: profile?.handle || profile?.displayName || "",
        avatarClass: "profile-mini-preview__avatar-content",
        imageClass: "profile-mini-preview__avatar-img",
        fallbackClass: "profile-mini-preview__avatar-initials",
        showAvailability: false,
    });
}

function positionPreview(link, preview) {
    const rect = link.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    preview.style.width = `${width}px`;
    const previewRect = preview.getBoundingClientRect();
    const left = Math.max(
        12,
        Math.min(window.innerWidth - previewRect.width - 12, rect.left),
    );
    const belowTop = rect.bottom + 10;
    const aboveTop = rect.top - previewRect.height - 10;
    const top =
        belowTop + previewRect.height < window.innerHeight
            ? belowTop
            : Math.max(12, aboveTop);
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
}

async function showPreview(link) {
    const handle = profileHandleFromLink(link);
    const context = getAvatarContext();
    if (!handle || !context || !activeScope || activeScope.signal.aborted)
        return;
    const sequence = ++opening;
    openingController?.abort();
    openingController = new AbortController();
    const signal = openingController.signal;
    const renderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    const isCurrent = () =>
        sequence === opening &&
        context === getAvatarContext() &&
        renderer === uiCtx.capabilities.get("ui:profileAvatarRenderer") &&
        link.isConnected &&
        activeLink === link;
    activeLink = link;
    const preview = ensurePreview();
    preview.hidden = false;
    const retainedImage =
        previewContext === context && previewHandle === handle
            ? preview.querySelector("img[data-avatar-key]")
            : null;
    if (!retainedImage)
        preview.innerHTML = `<div class="profile-mini-preview__loading">${escapeHtml(previewI18n?.t("ui.reuse.loading") ?? "…")}</div>`;
    positionPreview(link, preview);

    const result = await loadProfilePreview(handle, context);
    if (!isCurrent()) return;
    if (result.state !== "available") {
        if (result.state !== "retryable" || !retainedImage) {
            if (retainedImage && result.state !== "retryable")
                renderer.invalidate(retainedImage.dataset.avatarKey);
            preview.replaceChildren();
            preview.hidden = true;
        }
        return;
    }
    const profile = result.profile;
    if (retainedImage && retainedImage.dataset.avatarKey !== profile.avatarKey)
        renderer.invalidate(retainedImage.dataset.avatarKey);
    const avatarRenderer = renderer;
    if (!avatarRenderer) return;

    const name = profile.displayName || profile.handle || handle;
    const handleText = profile.handle || handle;
    const normalizedRole = normalizeRoleValue(profile.role);
    const roleLabel = PREVIEW_ROLE_LABELS.has(normalizedRole)
        ? getRoleLabel(previewI18n, normalizedRole)
        : null;
    const availabilityRenderer = uiCtx.capabilities.get(
        "ui:availabilityRenderer",
    );
    const availabilityMarkup = availabilityRenderer?.buildMarkup
        ? availabilityRenderer.buildMarkup(handleText)
        : "";
    const stats = [
        profile.followerCount != null
            ? `${profile.followerCount} ${previewI18n?.t("ui.reuse.followers") ?? ""}`
            : null,
        profile.followingCount != null
            ? `${profile.followingCount} ${previewI18n?.t("ui.reuse.following") ?? ""}`
            : null,
        profile.postCount != null
            ? `${profile.postCount} ${previewI18n?.t("ui.reuse.posts") ?? ""}`
            : null,
    ]
        .filter(Boolean)
        .join(" · ");

    const template = document.createElement("template");
    template.innerHTML = `
        <div class="profile-mini-preview__header">
            <div class="profile-mini-preview__avatar">${renderAvatar(profile)}${availabilityMarkup}</div>
            <div class="profile-mini-preview__identity">
                <strong>${escapeHtml(name)}</strong>
                <span>@${escapeHtml(handleText)}</span>
                ${roleLabel ? `<span class="profile-mini-preview__role">${escapeHtml(roleLabel)}</span>` : ""}
            </div>
        </div>
        ${profile.bio ? `<div class="profile-mini-preview__bio">${renderMarkdown(profile.bio)}</div>` : ""}
        ${stats ? `<p class="profile-mini-preview__stats">${escapeHtml(stats)}</p>` : ""}
    `;
    if (retainedImage?.dataset.avatarKey === profile.avatarKey) {
        const placeholder = template.content.querySelector("[data-avatar-key]");
        placeholder?.replaceWith(retainedImage);
    }
    preview.replaceChildren(template.content);
    previewContext = context;
    previewHandle = handle;
    await avatarRenderer.hydrate(preview, { signal });
    if (!isCurrent()) return;
    await availabilityRenderer?.hydrate?.(preview);
    if (isCurrent()) positionPreview(link, preview);
}

function scheduleHide() {
    opening++;
    openingController?.abort();
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        activeLink = null;
        if (previewEl) previewEl.hidden = true;
    }, HIDE_DELAY_MS);
}

export function bindProfilePreviews(i18n = null) {
    previewI18n = i18n ?? previewI18n;
    if (bound || !activeScope || activeScope.signal.aborted) return;
    const options = { signal: activeScope.signal };
    bound = true;
    document.addEventListener(
        "mouseover",
        (event) => {
            const link = event.target.closest?.('a[href^="/profile/"]');
            if (!link || link === activeLink) return;
            if (hideTimer) clearTimeout(hideTimer);
            if (showTimer) clearTimeout(showTimer);
            showTimer = setTimeout(() => showPreview(link), SHOW_DELAY_MS);
        },
        options,
    );
    document.addEventListener(
        "focusin",
        (event) => {
            const link = event.target.closest?.('a[href^="/profile/"]');
            if (!link) return;
            if (showTimer) clearTimeout(showTimer);
            showTimer = setTimeout(() => showPreview(link), SHOW_DELAY_MS);
        },
        options,
    );
    document.addEventListener(
        "mouseout",
        (event) => {
            const link = event.target.closest?.('a[href^="/profile/"]');
            if (!link) return;
            const related = event.relatedTarget;
            if (
                related &&
                (link.contains(related) || previewEl?.contains(related))
            )
                return;
            scheduleHide();
        },
        options,
    );
    document.addEventListener(
        "focusout",
        (event) => {
            const link = event.target.closest?.('a[href^="/profile/"]');
            if (link) scheduleHide();
        },
        options,
    );
    document.addEventListener("scroll", scheduleHide, {
        ...options,
        capture: true,
    });
    window.addEventListener("popstate", scheduleHide, options);
    window.addEventListener("pagehide", scheduleHide, options);
}
