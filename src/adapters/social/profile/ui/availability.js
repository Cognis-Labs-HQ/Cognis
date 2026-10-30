import { isOffline } from "/static/reuse/offline-state.js";
import { profileFetch as apiFetch } from "./offline-client.js";
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
let activeScope = null;
let availabilityRefresh = null;

function isGuestSession() {
    const accountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    const providerId = String(localStorage.getItem("cognis_provider_id") ?? "")
        .trim()
        .toLowerCase();
    return (
        uiCtx.capabilities.get("session:isGuest")?.() === true ||
        window.location.pathname.startsWith("/share/") ||
        sessionStorage.getItem("cognis_share_guest_token_active") === "1" ||
        accountId.startsWith("share:") ||
        providerId === "guest" ||
        providerId === "share" ||
        String(localStorage.getItem("cognis_role") ?? "")
            .trim()
            .toLowerCase() === "guest"
    );
}

function canRequestAvailability() {
    return (
        activeScope &&
        !activeScope.signal.aborted &&
        typeof activeScope.capabilities.get("social:profileRequest") ===
            "function" &&
        uiCtx.capabilities.get("session:isAuthenticated")?.() === true &&
        !isGuestSession()
    );
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
    if (!canRequestAvailability()) return Promise.resolve(null);
    if (isOffline()) return Promise.resolve(null);
    if (!keepalive && presenceRequest) return presenceRequest;
    const scope = activeScope;
    const request = apiFetch("/api/v1/social/availability/presence", {
        signal: scope.signal,
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            active,
            sessionId: getPresenceSessionId(),
        }),
        keepalive,
        suppressAccessDeniedEvent: true,
    }).catch((error) => {
        if (!scope.signal.aborted)
            reportFailure(scope, "reportPresence", error);
        return null;
    });
    if (keepalive) return request;
    const pending = request.finally(() => {
        if (presenceRequest === pending) presenceRequest = null;
    });
    presenceRequest = pending;
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
    if (!canRequestAvailability()) return null;
    if (isOffline()) return null;
    const normalizedHandle = String(handle).replace(/^@/, "");
    const cacheKey = normalizedHandle || "self";
    if (availabilityCache.has(cacheKey)) return availabilityCache.get(cacheKey);
    const endpoint = normalizedHandle
        ? `/api/v1/social/availability/${encodeURIComponent(normalizedHandle)}`
        : "/api/v1/social/availability";
    const scope = activeScope;
    const request = apiFetch(endpoint, {
        suppressAccessDeniedEvent: true,
        signal: scope.signal,
    })
        .then(async (response) =>
            response.ok ? (await response.json()).data : null,
        )
        .catch((error) => {
            if (!scope.signal.aborted)
                reportFailure(scope, "fetchAvailability", error);
            return null;
        });
    availabilityCache.set(cacheKey, request);
    return request;
}

export function availabilityIndicatorMarkup(handle, label = "") {
    return `<span class="availability-indicator" data-availability-handle="${escapeHtml(handle)}" data-availability-status="unknown" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`;
}

export async function hydrateAvailabilityIndicators(container = document) {
    if (!canRequestAvailability()) return;
    const scope = activeScope;
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/profile/languages"],
    });
    if (!isCurrent(scope)) return;
    const indicators = Array.from(
        container.querySelectorAll("[data-availability-handle]"),
    );
    await Promise.all(
        indicators.map(async (indicator) => {
            const availability = await fetchAvailability(
                indicator.dataset.availabilityHandle,
            );
            if (!isCurrent(scope)) return;
            await applyIndicatorStatus(
                indicator,
                availability?.status ?? "unknown",
                i18n,
            );
        }),
    );
}

export async function refreshAvailabilityIndicators(container = document) {
    if (!canRequestAvailability()) return null;
    if (availabilityRefresh) return availabilityRefresh;
    const scope = activeScope;
    const pending = (async () => {
        availabilityCache.clear();
        await hydrateAvailabilityIndicators(container);
        if (!isCurrent(scope)) return null;
        const availability = await fetchAvailability();
        if (!isCurrent(scope)) return null;
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
        if (availabilityRefresh === pending) availabilityRefresh = null;
    });
    availabilityRefresh = pending;
    return pending;
}

export async function setManualAvailability(status) {
    if (!canRequestAvailability() || !STATUS_OPTIONS.includes(status)) {
        return false;
    }
    const response = await apiFetch("/api/v1/social/availability", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!response.ok) return false;
    availabilityCache.clear();
    return true;
}

function isCurrent(scope) {
    return Boolean(scope && activeScope === scope && !scope.signal.aborted);
}

function reportFailure(scope, operation, error) {
    if (isOffline() || error?.name === "AbortError") return;
    const log =
        scope.capabilities.get("ui:log") ??
        ((level, message, metadata) => console[level](message, metadata));
    log("error", "Profile availability update failed.", {
        component: "social-profile",
        operation,
        errorName: error?.name,
    });
}

/** Start availability only after the owning provider has registered its client. */
export function mountAvailability(scope) {
    scope.signal.throwIfAborted();
    if (activeScope) throw new Error("availability_already_mounted");
    if (typeof scope.capabilities.get("social:profileRequest") !== "function")
        throw new Error("profile_client_unavailable");
    activeScope = scope;
    const cleanup = [];
    const dispose = () => {
        if (activeScope !== scope) return;
        activeScope = null;
        for (const release of cleanup) release();
        availabilityCache.clear();
        presenceRequest = null;
        availabilityRefresh = null;
    };
    scope.signal.addEventListener("abort", dispose, { once: true });
    scope.capabilities.contribute("ui:availabilityRenderer", {
        buildMarkup: availabilityIndicatorMarkup,
        hydrate: hydrateAvailabilityIndicators,
        refresh: refreshAvailabilityIndicators,
    });
    async function updateActivity({ active }) {
        if (!isCurrent(scope)) return;
        locallyActive = active;
        locallyIdle = !active;
        await reportPresenceActivity(active);
        if (!isCurrent(scope)) return;
        if (active) {
            await refreshAvailabilityIndicators();
            return;
        }
        notifyAvailabilitySubscribers({ status: "idle", source: "presence" });
        const i18n = await createI18n({
            componentStringBaseUrls: [
                "/static/adapters/social/profile/languages",
            ],
        });
        if (!isCurrent(scope)) return;
        for (const indicator of document.querySelectorAll(
            '[data-availability-handle=""]',
        ))
            await applyIndicatorStatus(
                indicator,
                indicator.dataset.availableStatus ?? "free",
                i18n,
            );
    }
    const run = (operation, task) => {
        if (!isCurrent(scope) || isOffline()) return;
        void Promise.resolve()
            .then(() => (isCurrent(scope) && !isOffline() ? task() : null))
            .catch((error) => {
                if (isCurrent(scope)) reportFailure(scope, operation, error);
            });
    };
    cleanup.push(
        subscribePresenceActivity((detail) =>
            run("updateActivity", () => updateActivity(detail)),
        ),
    );
    window.addEventListener(
        "pagehide",
        () => run("pageHide", () => reportPresenceActivity(false, true)),
        { signal: scope.signal },
    );
    let heartbeat;
    let refresh;
    const stopPolling = () => {
        window.clearInterval(heartbeat);
        window.clearInterval(refresh);
        heartbeat = refresh = undefined;
    };
    const startPolling = () => {
        stopPolling();
        if (isOffline() || !isCurrent(scope)) return;
        heartbeat = window.setInterval(() => {
            if (document.hidden || !locallyActive) return;
            run("heartbeat", () => reportPresenceActivity(locallyActive));
        }, PRESENCE_HEARTBEAT_INTERVAL_MS);
        refresh = window.setInterval(() => {
            if (document.hidden || !locallyActive) return;
            if (document.querySelector("[data-availability-handle]"))
                run("refreshAvailability", () =>
                    refreshAvailabilityIndicators(),
                );
        }, AVAILABILITY_REFRESH_INTERVAL_MS);
    };
    window.addEventListener("cognis:connectivity-changed", startPolling, {
        signal: scope.signal,
    });
    cleanup.push(stopPolling);
    startPolling();
    return dispose;
}
