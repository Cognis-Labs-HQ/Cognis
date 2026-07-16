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
 *     getSelectionPayload: () => ({ items: [] }),
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

const HEARTBEAT_INTERVAL_MS = 5000;
const REFRESH_INTERVAL_MS = 500;
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
        window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
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
    pointerOverlayRoot = null,
    i18n = null,
} = {}) {
    const sessionId = createSessionId(storageKey);
    let container = null;
    let heartbeatTimer = null;
    let refreshTimer = null;
    let destroyed = false;
    let markInactive = null;
    let handleVisibilityChange = null;
    let pointerTracker = null;
    let lastActivityAt = Date.now();

    function noteActivity() {
        lastActivityAt = Date.now();
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

    async function refresh() {
        const resolvedPageId = currentPageId();
        if (!container || !enabled || !endpoint || !resolvedPageId) {
            if (container) container.hidden = true;
            return;
        }
        const response = await apiFetch(
            `${endpoint}?pageId=${encodeURIComponent(resolvedPageId)}`,
        ).catch(() => null);
        if (!response?.ok) return;
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
    }

    function mount(parent) {
        if (!enabled || !parent || destroyed) return;
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
                requestPresenceUpdate: () => void sendPresence(true),
            });
        }
        void sendPresence(true).then(refresh);
        heartbeatTimer = window.setInterval(
            () => void sendPresence(true).then(refresh),
            HEARTBEAT_INTERVAL_MS,
        );
        refreshTimer = window.setInterval(
            () => void refresh(),
            REFRESH_INTERVAL_MS,
        );
        markInactive = () => void sendPresence(false, { keepalive: true });
        handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") markInactive?.();
            else void sendPresence(true).then(refresh);
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
        if (heartbeatTimer) window.clearInterval(heartbeatTimer);
        if (refreshTimer) window.clearInterval(refreshTimer);
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
        void sendPresence(false, { keepalive: true });
        pointerTracker?.destroy();
        pointerTracker = null;
        container?.remove();
        container = null;
    }

    return { mount, refresh, destroy };
}
