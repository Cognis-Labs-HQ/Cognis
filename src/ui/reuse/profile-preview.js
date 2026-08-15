import { apiFetch } from "./api-client.js";
import { escapeHtml } from "./escape-html.js";
import { renderMarkdown } from "./markdown-renderer.js";
import { getRoleLabel, normalizeRoleValue } from "./access-role.js";
import { uiCtx } from "./ui-ctx.js";

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

function profileHandleFromLink(link) {
    const href = link?.getAttribute("href") ?? "";
    const match = href.match(/^\/profile\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]).replace(/^@/, "") : null;
}

async function loadProfilePreview(handle) {
    if (profileCache.has(handle)) return profileCache.get(handle);
    const promise = apiFetch(
        `/api/v1/social/users/${encodeURIComponent(handle)}/profile`,
    )
        .then(async (res) => {
            if (!res.ok) return null;
            return (await res.json()).data ?? null;
        })
        .catch(() => null);
    profileCache.set(handle, promise);
    return promise;
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
    if (!handle) return;
    activeLink = link;
    const preview = ensurePreview();
    preview.hidden = false;
    preview.innerHTML = `<div class="profile-mini-preview__loading">${escapeHtml(previewI18n?.t("ui.reuse.loading") ?? "…")}</div>`;
    positionPreview(link, preview);

    const profile = await loadProfilePreview(handle);
    if (activeLink !== link || !profile) {
        if (!profile) scheduleHide();
        return;
    }
    const avatarRenderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
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

    preview.innerHTML = `
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
    await avatarRenderer.hydrate(preview);
    await availabilityRenderer?.hydrate?.(preview);
    positionPreview(link, preview);
}

function scheduleHide() {
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        activeLink = null;
        if (previewEl) previewEl.hidden = true;
    }, HIDE_DELAY_MS);
}

export function bindProfilePreviews(i18n = null) {
    previewI18n = i18n ?? previewI18n;
    if (bound) return;
    bound = true;
    document.addEventListener("mouseover", (event) => {
        const link = event.target.closest?.('a[href^="/profile/"]');
        if (!link || link === activeLink) return;
        if (hideTimer) clearTimeout(hideTimer);
        if (showTimer) clearTimeout(showTimer);
        showTimer = setTimeout(() => showPreview(link), SHOW_DELAY_MS);
    });
    document.addEventListener("focusin", (event) => {
        const link = event.target.closest?.('a[href^="/profile/"]');
        if (!link) return;
        if (showTimer) clearTimeout(showTimer);
        showTimer = setTimeout(() => showPreview(link), SHOW_DELAY_MS);
    });
    document.addEventListener("mouseout", (event) => {
        const link = event.target.closest?.('a[href^="/profile/"]');
        if (!link) return;
        const related = event.relatedTarget;
        if (related && (link.contains(related) || previewEl?.contains(related)))
            return;
        scheduleHide();
    });
    document.addEventListener("focusout", (event) => {
        const link = event.target.closest?.('a[href^="/profile/"]');
        if (link) scheduleHide();
    });
    document.addEventListener("scroll", scheduleHide, true);
}
