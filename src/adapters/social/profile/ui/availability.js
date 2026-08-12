import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";
import { subscribePresenceActivity } from "/static/reuse/page-composer/presence-tracker.js";

const availabilityCache = new Map();
const availabilitySubscribers = new Set();
export const STATUS_OPTIONS = Object.freeze(["free", "busy", "tentative"]);
const AVAILABILITY_REFRESH_INTERVAL_MS = 10_000;
const PRESENCE_HEARTBEAT_INTERVAL_MS = 15_000;
const PRESENCE_SESSION_KEY = "cognis_availability_presence_session";
let locallyIdle = false;
let locallyActive = true;
let presenceRequest = null;
let availabilityRefresh = null;

function isGuestSession() {
    return uiCtx.capabilities.get("session:isGuest")?.() === true;
}

function notifyAvailabilitySubscribers(availability) {
    for (const subscriber of availabilitySubscribers) {
        subscriber(availability);
    }
}

export function subscribeAvailabilityUpdates(subscriber) {
    availabilitySubscribers.add(subscriber);
    return () => availabilitySubscribers.delete(subscriber);
}

function getPresenceSessionId() {
    const storedSessionId = window.sessionStorage.getItem(PRESENCE_SESSION_KEY);
    if (storedSessionId) return storedSessionId;
    const sessionId = window.crypto.randomUUID();
    window.sessionStorage.setItem(PRESENCE_SESSION_KEY, sessionId);
    return sessionId;
}

function reportPresenceActivity(active, keepalive = false) {
    if (isGuestSession()) return Promise.resolve(null);
    if (!keepalive && presenceRequest) return presenceRequest;
    const request = apiFetch("/api/v1/social/availability/presence", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            active,
            sessionId: getPresenceSessionId(),
        }),
        keepalive,
    }).catch(() => null);
    if (keepalive) return request;
    presenceRequest = request.finally(() => {
        presenceRequest = null;
    });
    return presenceRequest;
}

function displayedStatus(indicator, status) {
    return locallyIdle && !indicator.dataset.availabilityHandle
        ? "idle"
        : status;
}

async function applyIndicatorStatus(indicator, status, i18n) {
    const resolvedStatus = displayedStatus(indicator, status);
    const label = i18n.t(`ui.app.profile.availability.${resolvedStatus}`);
    indicator.dataset.availabilityStatus = resolvedStatus;
    indicator.dataset.availableStatus = status;
    indicator.title = label;
    indicator.setAttribute("aria-label", label);
}

export async function fetchAvailability(handle = "") {
    if (isGuestSession()) return null;
    const normalizedHandle = String(handle).replace(/^@/, "");
    const cacheKey = normalizedHandle || "self";
    if (availabilityCache.has(cacheKey)) return availabilityCache.get(cacheKey);
    const endpoint = normalizedHandle
        ? `/api/v1/social/availability/${encodeURIComponent(normalizedHandle)}`
        : "/api/v1/social/availability";
    const request = apiFetch(endpoint)
        .then(async (response) =>
            response.ok ? (await response.json()).data : null,
        )
        .catch(() => null);
    availabilityCache.set(cacheKey, request);
    return request;
}

export function availabilityIndicatorMarkup(handle, label = "") {
    return `<span class="availability-indicator" data-availability-handle="${escapeHtml(handle)}" data-availability-status="unknown" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`;
}

export async function hydrateAvailabilityIndicators(container = document) {
    if (isGuestSession()) return;
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/profile/languages"],
    });
    const indicators = Array.from(
        container.querySelectorAll("[data-availability-handle]"),
    );
    await Promise.all(
        indicators.map(async (indicator) => {
            const availability = await fetchAvailability(
                indicator.dataset.availabilityHandle,
            );
            await applyIndicatorStatus(
                indicator,
                availability?.status ?? "unknown",
                i18n,
            );
        }),
    );
}

export async function refreshAvailabilityIndicators(container = document) {
    if (isGuestSession()) return null;
    if (availabilityRefresh) return availabilityRefresh;
    availabilityRefresh = (async () => {
        availabilityCache.clear();
        await hydrateAvailabilityIndicators(container);
        const availability = await fetchAvailability();
        if (availability?.status) {
            const displayedAvailability = {
                ...availability,
                status: locallyIdle ? "idle" : availability.status,
            };
            notifyAvailabilitySubscribers(displayedAvailability);
            return displayedAvailability;
        }
        return availability;
    })().finally(() => {
        availabilityRefresh = null;
    });
    return availabilityRefresh;
}

export async function setManualAvailability(status) {
    if (!STATUS_OPTIONS.includes(status)) return false;
    const response = await apiFetch("/api/v1/social/availability", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!response.ok) return false;
    availabilityCache.clear();
    return true;
}

uiCtx.capabilities.contribute("ui:availabilityRenderer", {
    buildMarkup: availabilityIndicatorMarkup,
    hydrate: hydrateAvailabilityIndicators,
    refresh: refreshAvailabilityIndicators,
});

subscribePresenceActivity(async ({ active }) => {
    locallyActive = active;
    locallyIdle = !active;
    await reportPresenceActivity(active);
    if (active) {
        await refreshAvailabilityIndicators();
        return;
    }
    notifyAvailabilitySubscribers({ status: "idle", source: "presence" });
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/profile/languages"],
    });
    for (const indicator of document.querySelectorAll(
        '[data-availability-handle=""]',
    )) {
        await applyIndicatorStatus(
            indicator,
            indicator.dataset.availableStatus ?? "free",
            i18n,
        );
    }
});

window.addEventListener("pagehide", () => {
    void reportPresenceActivity(false, true);
});

window.setInterval(() => {
    if (document.hidden) return;
    void reportPresenceActivity(locallyActive);
}, PRESENCE_HEARTBEAT_INTERVAL_MS);

window.setInterval(() => {
    if (document.hidden) return;
    const hasVisibleUserAvailability = document.querySelector(
        "[data-availability-handle]",
    );
    if (hasVisibleUserAvailability) {
        void refreshAvailabilityIndicators();
    }
}, AVAILABILITY_REFRESH_INTERVAL_MS);
