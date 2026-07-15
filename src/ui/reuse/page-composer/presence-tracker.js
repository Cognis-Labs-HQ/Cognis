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
 *   });
 *   tracker.mount(mainWindow);
 *
 * @param {object} options - Presence tracker options.
 * @returns {{ mount(container: HTMLElement): void, refresh(): void, destroy(): void }}
 */

import { apiFetch } from "../api-client.js";
import { getInitialsText, pickInitialsColor } from "../avatar-utils.js";
import { escapeHtml } from "../escape-html.js";

const HEARTBEAT_INTERVAL_MS = 20000;
const REFRESH_INTERVAL_MS = 10000;
const ACTIVE_WINDOW_MS = 45000;

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
    const displayName = String(entry.displayName || entry.handle || "Guest");
    const handle = String(entry.handle || "").replace(/^@/, "");
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
} = {}) {
    const sessionId = createSessionId(storageKey);
    let container = null;
    let heartbeatTimer = null;
    let refreshTimer = null;
    let destroyed = false;

    function currentPageId() {
        return String(resolveOption(pageId) ?? "").trim();
    }

    async function sendPresence(active = true) {
        const resolvedPageId = currentPageId();
        if (!enabled || !endpoint || !resolvedPageId) return;
        await apiFetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                pageId: resolvedPageId,
                sessionId,
                active,
            }),
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
        container.innerHTML = entries
            .map((entry) => ({
                ...entry,
                active:
                    entry.active !== false &&
                    Date.now() - Date.parse(entry.lastSeenAt || 0) <=
                        ACTIVE_WINDOW_MS,
            }))
            .map(renderPresenceEntry)
            .join("");
    }

    function mount(parent) {
        if (!enabled || !parent || destroyed) return;
        container = document.createElement("section");
        container.className = "page-presence";
        container.setAttribute("aria-label", "Page presence");
        container.hidden = true;
        const contentGrid = parent.querySelector(".content-grid");
        parent.insertBefore(container, contentGrid ?? null);
        void sendPresence(true).then(refresh);
        heartbeatTimer = window.setInterval(
            () => void sendPresence(true),
            HEARTBEAT_INTERVAL_MS,
        );
        refreshTimer = window.setInterval(
            () => void refresh(),
            REFRESH_INTERVAL_MS,
        );
        window.addEventListener("pagehide", () => void sendPresence(false), {
            once: true,
        });
    }

    function destroy() {
        destroyed = true;
        if (heartbeatTimer) window.clearInterval(heartbeatTimer);
        if (refreshTimer) window.clearInterval(refreshTimer);
        void sendPresence(false);
        container?.remove();
        container = null;
    }

    return { mount, refresh, destroy };
}
