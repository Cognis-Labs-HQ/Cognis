/**
 * Page composer presence tracker.
 *
 * Public exports:
 *   createPresenceTracker(options) — mounts a compact presence strip and keeps
 *     it synchronized with a page-specific presence endpoint.
 *   PRESENCE_ACTIVITY_EVENT — event emitted when local activity changes.
 *   subscribePresenceActivity(listener) — observes browser activity, including
 *     pages without a page-specific presence endpoint.
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
 *   const unsubscribe = subscribePresenceActivity(({ active }) => {
 *     updateActivityState(active);
 *   });
 *   unsubscribe();
 *
 * @param {object} options - Presence tracker options.
 * @returns {{ mount(container: HTMLElement): void, refresh(): void, destroy(): void }}
 */

import { apiFetch } from "../api-client.js";
import { escapeHtml } from "../escape-html.js";
import { createPointerTracker } from "../pointer-tracker.js";
import { createAdaptivePoller } from "../adaptive-poller.js";

const HEARTBEAT_MIN_INTERVAL_MS = 10_000;
const HEARTBEAT_MAX_INTERVAL_MS = 30_000;
const REFRESH_MIN_INTERVAL_MS = 2_500;
const REFRESH_MAX_INTERVAL_MS = 30_000;
const ACTIVE_WINDOW_MS = 15000;
const IDLE_AFTER_MS = 30000;
export const PRESENCE_ACTIVITY_EVENT = "cognis:presence-activity-change";
const activitySubscribers = new Set();
let activityDetectorBound = false;
let activityDetectorTimer = null;
let presenceActive = true;

function publishPresenceActivity(active) {
    if (presenceActive === active) return;
    presenceActive = active;
    const detail = { active };
    window.dispatchEvent(new CustomEvent(PRESENCE_ACTIVITY_EVENT, { detail }));
    for (const subscriber of activitySubscribers) subscriber(detail);
}

function schedulePresenceIdle() {
    window.clearTimeout(activityDetectorTimer);
    activityDetectorTimer = window.setTimeout(
        () => publishPresenceActivity(false),
        IDLE_AFTER_MS,
    );
}

function notePresenceActivity() {
    publishPresenceActivity(true);
    schedulePresenceIdle();
}

function markPresenceInactive() {
    window.clearTimeout(activityDetectorTimer);
    publishPresenceActivity(false);
}

function bindActivityDetector() {
    if (activityDetectorBound) return;
    activityDetectorBound = true;
    for (const eventName of ["pointermove", "keydown", "focus"]) {
        window.addEventListener(eventName, notePresenceActivity, {
            passive: true,
        });
    }
    window.addEventListener("blur", markPresenceInactive);
    window.addEventListener("pagehide", markPresenceInactive);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") markPresenceInactive();
        else notePresenceActivity();
    });
    schedulePresenceIdle();
}

/**
 * Subscribes to local browser activity changes and immediately reports the
 * current state.
 *
 * @param {(detail: { active: boolean }) => void} listener - Activity listener.
 * @returns {() => boolean} Function that removes the listener.
 */
export function subscribePresenceActivity(listener) {
    bindActivityDetector();
    activitySubscribers.add(listener);
    listener({ active: presenceActive });
    return () => activitySubscribers.delete(listener);
}

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

function defaultRenderPresenceEntry(entry) {
    const displayName = normalizePresenceName(
        entry.displayName || entry.handle,
    );
    const handle = String(entry.handle || "").replace(/^[@#]+/, "");
    const active = Boolean(entry.active);
    const initials = String(entry.initials || "?");
    const color = String(entry.color || "hsl(0, 0%, 42%)");
    const classes = ["page-presence__avatar", active ? "is-active" : ""]
        .filter(Boolean)
        .join(" ");
    const label =
        entry.guest || !handle ? displayName : `${displayName} (@${handle})`;
    const inner = `<span class="${classes}" style="--initials-bg: ${escapeHtml(color)};" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(initials)}</span>`;
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
    renderPresenceEntry = defaultRenderPresenceEntry,
    hydratePresenceEntries = null,
    i18n = null,
} = {}) {
    const sessionId = createSessionId(storageKey);
    let container = null;
    let mountedParent = null;
    let heartbeatPoller = null;
    let refreshPoller = null;
    let destroyed = false;
    let markInactive = null;
    let pointerTracker = null;
    let lastActivityAt = Date.now();
    let lastPresenceSignature = "";
    let lastPresenceMarkupSignature = "";
    let unsubscribeActivity = null;
    let presenceRequest = null;
    let refreshRequest = null;
    const requestAbortController = new AbortController();

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
        if (destroyed || !enabled || !endpoint || !resolvedPageId) return null;
        if (!keepalive && presenceRequest) return presenceRequest;
        const request = apiFetch(endpoint, {
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
            signal: keepalive ? undefined : requestAbortController.signal,
        }).catch(() => null);
        if (!keepalive) presenceRequest = request;
        const response = await request;
        if (presenceRequest === request) presenceRequest = null;
        if (response?.status === 401 || response?.status === 403) {
            destroy({ notifyInactive: false });
        }
        return response;
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
                    entry.active,
                    entry.pointer?.updatedAt,
                    entry.avatarKey ?? "",
                    JSON.stringify(entry.selection ?? null),
                ].join(":"),
            )
            .join("|");
    }

    function createPresenceMarkupSignature(entries) {
        return entries
            .map((entry) =>
                [
                    entry.sessionId,
                    entry.displayName ?? "",
                    entry.handle ?? "",
                    entry.guest ? "guest" : "user",
                    entry.active,
                    entry.avatarKey ?? "",
                ].join(":"),
            )
            .join("|");
    }

    async function refresh() {
        if (refreshRequest) return refreshRequest;
        refreshRequest = runRefresh();
        const changed = await refreshRequest;
        refreshRequest = null;
        return changed;
    }

    async function runRefresh() {
        placePresenceContainer();
        const resolvedPageId = currentPageId();
        if (!container || !enabled || !endpoint || !resolvedPageId) {
            if (container) container.hidden = true;
            return false;
        }
        const response = await apiFetch(
            `${endpoint}?pageId=${encodeURIComponent(resolvedPageId)}`,
            { signal: requestAbortController.signal },
        ).catch(() => null);
        if (response?.status === 401 || response?.status === 403) {
            destroy({ notifyInactive: false });
            return false;
        }
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
        const nextMarkupSignature =
            createPresenceMarkupSignature(activeEntries);
        if (nextMarkupSignature !== lastPresenceMarkupSignature) {
            container.innerHTML = activeEntries
                .map(renderPresenceEntry)
                .join("");
            lastPresenceMarkupSignature = nextMarkupSignature;
            if (typeof hydratePresenceEntries === "function")
                void hydratePresenceEntries(container);
        }
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
        markInactive = () => void sendPresence(false, { keepalive: true });
        unsubscribeActivity = subscribePresenceActivity(({ active }) => {
            if (active) {
                noteActivity();
                heartbeatPoller?.start({ immediate: true });
                refreshPoller?.start();
            } else {
                heartbeatPoller?.stop();
                refreshPoller?.stop();
                markInactive?.();
            }
        });
        window.addEventListener("pagehide", markInactive);
        window.addEventListener("beforeunload", markInactive);
    }

    function destroy({ notifyInactive = true } = {}) {
        if (destroyed) return;
        if (notifyInactive) {
            void sendPresence(false, { keepalive: true });
        }
        destroyed = true;
        unsubscribeActivity?.();
        heartbeatPoller?.stop();
        refreshPoller?.stop();
        heartbeatPoller = null;
        refreshPoller = null;
        if (markInactive) {
            window.removeEventListener("pagehide", markInactive);
            window.removeEventListener("beforeunload", markInactive);
        }
        onPresenceUpdate?.([], sessionId);
        requestAbortController.abort();
        pointerTracker?.destroy();
        pointerTracker = null;
        container?.remove();
        container = null;
        mountedParent = null;
    }

    return { mount, refresh, destroy };
}
