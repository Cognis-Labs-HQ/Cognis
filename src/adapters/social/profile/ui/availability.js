import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";
import { PRESENCE_ACTIVITY_EVENT } from "/static/reuse/page-composer/presence-tracker.js";

const availabilityCache = new Map();
export const STATUS_OPTIONS = Object.freeze(["free", "busy", "tentative"]);
const AVAILABILITY_REFRESH_INTERVAL_MS = 30_000;
let locallyIdle = false;

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
    return `<span class="availability-indicator" data-availability-handle="${escapeHtml(handle)}" data-availability-status="free" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`;
}

export async function hydrateAvailabilityIndicators(container = document) {
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
            if (availability?.status) {
                await applyIndicatorStatus(
                    indicator,
                    availability.status,
                    i18n,
                );
            }
        }),
    );
}

export async function refreshAvailabilityIndicators(container = document) {
    availabilityCache.clear();
    await hydrateAvailabilityIndicators(container);
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
});

window.addEventListener(PRESENCE_ACTIVITY_EVENT, async (event) => {
    locallyIdle = event.detail?.active === false;
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

window.setInterval(() => {
    void refreshAvailabilityIndicators();
}, AVAILABILITY_REFRESH_INTERVAL_MS);
