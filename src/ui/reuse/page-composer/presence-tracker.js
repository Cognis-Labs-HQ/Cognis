/**
 * Page composer presence tracker.
 *
 * Public exports:
 *   createPresenceTracker(options) — mounts a compact presence strip and keeps
 *     it synchronized with a page-specific presence endpoint.
 *
 * Usage:
 *   const tracker = createPresenceTracker({
 *     endpoint: '/api/v1/modules/example/presence',
 *     pageId: () => activePageId,
 *     pointerTracking: true,
 *     getSelectionPayload: () => ({ elementIds: [] }),
 *     onPresenceUpdate: (entries, sessionId) => void syncSelection(entries, sessionId),
 *   });
 *   tracker.mount(mainWindow);
 *
 * @param {object} options - Presence tracker options.
 * @returns {{ mount(container: HTMLElement): void, refresh(): void, destroy(): void }}
 */

import { apiFetch } from "../api-client.js";
import { getInitialsText, pickInitialsColor } from "../avatar-utils.js";
import { escapeHtml } from "../escape-html.js";
import { createPointerTracker } from "../pointer-tracker.js";
import { createAdaptivePoller } from "../adaptive-poller.js";

const HEARTBEAT_MIN_INTERVAL_MS = 2500;
const HEARTBEAT_MAX_INTERVAL_MS = 5000;
const REFRESH_MIN_INTERVAL_MS = 250;
const REFRESH_MAX_INTERVAL_MS = 5000;
const ACTIVE_WINDOW_MS = 15000;
const IDLE_AFTER_MS = 30000;

function normalizePresenceName(value) {
    return (
        String(value || "Guest")
            .replace(/^#+/, "")
            .trim() || "Guest"
    );
}

function resolveOption(value) {
    return typeof value === "function" ? value() : value;
}

function createSessionId(storageKey) {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const generated =
        window.crypto?.randomUUID?.() ?? createFallbackSessionId();
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
}

function createFallbackSessionId() {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return `${Date.now()}-${Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("")}`;
}

function buildProfileAvatarUrl(avatarKey) {
    return `/api/v1/files/profile/${String(avatarKey)
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`;
}

function renderPresenceEntry(entry) {
    const displayName = normalizePresenceName(
        entry.displayName || entry.handle,
    );
    const handle = String(entry.handle || "").replace(/^[@#]+/, "");
    const active = Boolean(entry.active);
    const initials = getInitialsText(displayName);
    const color = pickInitialsColor(handle || displayName);
    const classes = ["page-presence__avatar", active ? "is-active" : ""]
        .filter(Boolean)
        .join(" ");
    const label =
        entry.guest || !handle ? displayName : `${displayName} (@${handle})`;
    const avatarKey = String(entry.avatarKey || "").trim();
    const inner = avatarKey
        ? `<span class="${classes}" style="--initials-bg: ${escapeHtml(color)};" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><img class="page-presence__avatar-img" src="${escapeHtml(buildProfileAvatarUrl(avatarKey))}" alt="" loading="lazy" onerror="this.remove()" />${escapeHtml(initials)}</span>`
        : `<span class="${classes}" style="--initials-bg: ${escapeHtml(color)};" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(initials)}</span>`;
    if (entry.guest || !handle) return inner;
    return `<a class="page-presence__profile" href="/profile/${encodeURIComponent(handle)}" aria-label="${escapeHtml(label)}">${inner}</a>`;
}

export function createPresenceTracker({
    endpoint,
    pageId,
    enabled = true,
    storageKey = "cognis_page_presence_session",
    pointerTracking = false,
    getSelectionPayload = null,
    getPointerOffset = null,
    pointerOverlayRoot = null,
    onPresenceUpdate = null,
    i18n = null,
} = {}) {
    const sessionId = createSessionId(storageKey);
    let container = null;
    let mountedParent = null;
    let heartbeatPoller = null;
    let refreshPoller = null;
    let destroyed = false;
    let markInactive = null;
    let handleVisibilityChange = null;
    let pointerTracker = null;
    let lastActivityAt = Date.now();
    let lastPresenceSignature = "";

    function noteActivity() {
        lastActivityAt = Date.now();
        heartbeatPoller?.markActivity();
        refreshPoller?.markActivity();
    }

    function isRecentlyActive() {
        return Date.now() - lastActivityAt <= IDLE_AFTER_MS;
    }

    function currentPageId() {
        return String(resolveOption(pageId) ?? "").trim();
    }

    async function sendPresence(active = true, { keepalive = false } = {}) {
        const resolvedPageId = currentPageId();
        if (!enabled || !endpoint || !resolvedPageId) return;
        await apiFetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                pageId: resolvedPageId,
                sessionId,
                active: active && isRecentlyActive(),
                pointer: pointerTracker?.getPointerPayload?.() ?? null,
                selection:
                    typeof getSelectionPayload === "function"
                        ? getSelectionPayload()
                        : null,
            }),
            keepalive,
        }).catch(() => null);
    }

    function placePresenceContainer() {
        if (!container) return;
        const parent = mountedParent ?? container.closest(".main-window");
        const presenceSlot = parent?.querySelector("#page-presence-section");
        if (presenceSlot && container.parentElement !== presenceSlot) {
            presenceSlot.replaceChildren(container);
        }
    }

    function createPresenceSignature(entries) {
        return entries
            .map((entry) =>
                [
                    entry.sessionId,
                    entry.lastSeenAt,
                    entry.active,
                    entry.pointer?.updatedAt,
                    entry.avatarKey ?? "",
                    JSON.stringify(entry.selection ?? null),
                ].join(":"),
            )
            .join("|");
    }

    async function refresh() {
        placePresenceContainer();
        const resolvedPageId = currentPageId();
        if (!container || !enabled || !endpoint || !resolvedPageId) {
            if (container) container.hidden = true;
            return false;
        }
        const response = await apiFetch(
            `${endpoint}?pageId=${encodeURIComponent(resolvedPageId)}`,
        ).catch(() => null);
        if (!response?.ok) return false;
        const payload = await response.json().catch(() => ({}));
        const entries = Array.isArray(payload?.data?.presence)
            ? payload.data.presence
            : [];
        container.hidden = entries.length === 0;
        const activeEntries = entries.map((entry) => ({
            ...entry,
            active:
                entry.active !== false &&
                Date.now() - Date.parse(entry.lastSeenAt || 0) <=
                    ACTIVE_WINDOW_MS,
        }));
        container.innerHTML = activeEntries.map(renderPresenceEntry).join("");
        pointerTracker?.render(activeEntries, sessionId);
        onPresenceUpdate?.(activeEntries, sessionId);
        const nextSignature = createPresenceSignature(activeEntries);
        const changed = nextSignature !== lastPresenceSignature;
        lastPresenceSignature = nextSignature;
        return changed;
    }

    function mount(parent) {
        if (!enabled || !parent || destroyed) return;
        mountedParent = parent;
        container = document.createElement("section");
        container.className = "page-presence";
        container.setAttribute("aria-label", "Page presence");
        container.hidden = true;
        const contentGrid = parent.querySelector(".content-grid");
        const presenceSlot = parent.querySelector("#page-presence-section");
        if (presenceSlot) {
            presenceSlot.replaceChildren(container);
        } else {
            parent.insertBefore(container, contentGrid ?? null);
        }
        if (pointerTracking === true && contentGrid) {
            pointerTracker = createPointerTracker({
                contentGrid,
                overlayRoot: resolveOption(pointerOverlayRoot) ?? parent,
                i18n,
                noteActivity,
                getPointerOffset,
                requestPresenceUpdate: () => {
                    refreshPoller?.markActivity();
                    void sendPresence(true);
                },
            });
        }
        refreshPoller = createAdaptivePoller({
            task: refresh,
            minIntervalMs: REFRESH_MIN_INTERVAL_MS,
            maxIntervalMs: REFRESH_MAX_INTERVAL_MS,
            initialIntervalMs: REFRESH_MIN_INTERVAL_MS,
        });
        heartbeatPoller = createAdaptivePoller({
            task: () => sendPresence(true).then(refresh),
            minIntervalMs: HEARTBEAT_MIN_INTERVAL_MS,
            maxIntervalMs: HEARTBEAT_MAX_INTERVAL_MS,
            initialIntervalMs: HEARTBEAT_MIN_INTERVAL_MS,
        });
        void sendPresence(true).then(refresh);
        refreshPoller.start();
        heartbeatPoller.start();
        markInactive = () => void sendPresence(false, { keepalive: true });
        handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") markInactive?.();
            else {
                heartbeatPoller?.markActivity();
                refreshPoller?.trigger();
                void sendPresence(true).then(refresh);
            }
        };
        window.addEventListener("pagehide", markInactive);
        window.addEventListener("beforeunload", markInactive);
        for (const eventName of ["pointermove", "keydown", "focus"]) {
            window.addEventListener(eventName, noteActivity, { passive: true });
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    function destroy() {
        destroyed = true;
        heartbeatPoller?.stop();
        refreshPoller?.stop();
        heartbeatPoller = null;
        refreshPoller = null;
        if (markInactive) {
            window.removeEventListener("pagehide", markInactive);
            window.removeEventListener("beforeunload", markInactive);
        }
        for (const eventName of ["pointermove", "keydown", "focus"]) {
            window.removeEventListener(eventName, noteActivity);
        }
        if (handleVisibilityChange) {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        }
        onPresenceUpdate?.([], sessionId);
        void sendPresence(false, { keepalive: true });
        pointerTracker?.destroy();
        pointerTracker = null;
        container?.remove();
        container = null;
        mountedParent = null;
    }

    return { mount, refresh, destroy };
}
