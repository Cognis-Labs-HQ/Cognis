import { uiCtx } from "/static/reuse/ui-ctx.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { createI18n } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { showToast } from "/static/reuse/toast.js";
import { ensurePersistentStylesheet } from "/static/reuse/page-styles.js";
import {
    isTrustedHttpUrl,
    loadTrustedDomains,
} from "/static/reuse/trusted-domains.js";

const CSS_HREF = "/static/styles/reuse/top-banners.css";
const POLL_INTERVAL_VISIBLE_MILLISECONDS = 20_000;
const POLL_INTERVAL_HIDDEN_MILLISECONDS = 45_000;
const BAR_CONTAINER_ID = "notify-broadcast-bar";

let currentBarBroadcastId = null;
let currentPopupBroadcastId = null;
let isPopupOpen = false;
let pollTimer = null;
let stopPollingForAuthFailure = false;
let activeSignal;

async function navigateAfterClose(redirectUrl, i18n) {
    if (!redirectUrl) return;
    try {
        const trustedDomains = await loadTrustedDomains(apiFetch);
        if (
            !isTrustedHttpUrl(redirectUrl, {
                baseUrl: window.location.origin,
                trustedDomains,
            })
        ) {
            throw new Error("invalid_redirect");
        }
        const parsedUrl = new URL(redirectUrl, window.location.origin);
        if (parsedUrl.origin === window.location.origin) {
            await navigateTo(
                parsedUrl.pathname + parsedUrl.search + parsedUrl.hash,
            );
            return;
        }
        window.location.assign(parsedUrl.toString());
    } catch {
        showToast(i18n.t("gateway.notify.broadcast.invalid_redirect"), {
            variant: "warning",
        });
    }
}

async function fetchActiveBroadcasts(signal) {
    try {
        const response = await apiFetch("/api/v1/notify/broadcasts/active", {
            signal,
        });
        if (response.status === 401) {
            return { broadcasts: [], unauthorized: true };
        }
        if (!response.ok) return { broadcasts: [], unauthorized: false };
        const payload = await response.json().catch(() => null);
        return {
            broadcasts: Array.isArray(payload?.data) ? payload.data : [],
            unauthorized: false,
        };
    } catch {
        return { broadcasts: [], unauthorized: false };
    }
}

async function acknowledgeBroadcast(broadcastId) {
    await apiFetch(
        `/api/v1/notify/broadcasts/${encodeURIComponent(broadcastId)}/acknowledge`,
        { method: "POST" },
    );
}

async function dismissBroadcast(broadcastId) {
    await apiFetch(
        `/api/v1/notify/broadcasts/${encodeURIComponent(broadcastId)}/dismiss`,
        { method: "POST" },
    );
}

let releaseBanner;
function removeBroadcastBar() {
    releaseBanner?.();
    releaseBanner = null;
}

function renderBroadcastBar(broadcast, i18n) {
    const banner = uiCtx.capabilities.get("ui:broadcast").publish(
        "notify.broadcast",
        {
            title: broadcast.title,
            bodyHtml: renderMarkdown(broadcast.message),
            actionsHtml: `
          <button type="button" class="notify-broadcast-ack btn-neutral btn-animated">${
              broadcast.requireAcknowledgement
                  ? i18n.t("gateway.notify.broadcast.acknowledge")
                  : i18n.t("ui.reuse.dismiss")
          }</button>
          ${
              broadcast.requireAcknowledgement
                  ? `<button type="button" class="notify-broadcast-close btn-neutral">${i18n.t("ui.reuse.close")}</button>`
                  : ""
          }
    `,
        },
        { signal: activeSignal },
    );
    const barContainer = banner.element;
    barContainer.id = BAR_CONTAINER_ID;
    releaseBanner = banner.remove;

    const acknowledgeButton = barContainer.querySelector(
        ".notify-broadcast-ack",
    );
    acknowledgeButton?.addEventListener("click", async () => {
        try {
            if (broadcast.requireAcknowledgement) {
                await acknowledgeBroadcast(broadcast.id);
            } else {
                await dismissBroadcast(broadcast.id);
            }
            removeBroadcastBar();
            await navigateAfterClose(broadcast.redirectUrl, i18n);
        } catch {
            showToast(i18n.t("gateway.notify.broadcast.action_failed"), {
                variant: "error",
            });
        }
    });

    const closeButton = barContainer.querySelector(".notify-broadcast-close");
    closeButton?.addEventListener("click", async () => {
        removeBroadcastBar();
        if (broadcast.redirectUrl) {
            await navigateAfterClose(broadcast.redirectUrl, i18n);
        }
    });
}

async function openBroadcastPopup(broadcast, i18n) {
    if (isPopupOpen) return;
    isPopupOpen = true;
    const popupActions = broadcast.requireAcknowledgement
        ? [
              {
                  id: "acknowledge",
                  label: i18n.t("gateway.notify.broadcast.acknowledge"),
                  variant: "confirm",
              },
          ]
        : [
              {
                  id: "dismiss",
                  label: i18n.t("ui.reuse.dismiss"),
                  variant: "confirm",
              },
              {
                  id: "close",
                  label: i18n.t("ui.reuse.close"),
                  variant: "cancel",
              },
          ];
    try {
        const popupResult = await openPopup({
            title: escapeHtml(broadcast.title),
            body: renderMarkdown(broadcast.message),
            actions: popupActions,
        });
        const didAcknowledge = popupResult === "acknowledge";
        if (didAcknowledge) {
            await acknowledgeBroadcast(broadcast.id);
            await navigateAfterClose(broadcast.redirectUrl, i18n);
            return;
        }

        if (broadcast.requireAcknowledgement) {
            if (broadcast.redirectUrl) {
                await navigateAfterClose(broadcast.redirectUrl, i18n);
            }
            return;
        }

        await dismissBroadcast(broadcast.id);
        await navigateAfterClose(broadcast.redirectUrl, i18n);
    } catch {
        showToast(i18n.t("gateway.notify.broadcast.action_failed"), {
            variant: "error",
        });
    } finally {
        isPopupOpen = false;
    }
}

async function refreshBroadcast(i18n, signal) {
    if (isOffline() || signal?.aborted) return;
    const { broadcasts, unauthorized } = await fetchActiveBroadcasts(signal);
    if (signal?.aborted) return;
    if (unauthorized) {
        stopPollingForAuthFailure = true;
        removeBroadcastBar();
        return;
    }
    const activeBarBroadcast = broadcasts.find(
        (broadcast) => broadcast.displayMode === "bar",
    );
    const activePopupBroadcast = broadcasts.find(
        (broadcast) => broadcast.displayMode === "popup",
    );

    if (!activeBarBroadcast) {
        currentBarBroadcastId = null;
        removeBroadcastBar();
    } else {
        const barIsMissing = document.getElementById(BAR_CONTAINER_ID) === null;
        if (activeBarBroadcast.id !== currentBarBroadcastId || barIsMissing) {
            currentBarBroadcastId = activeBarBroadcast.id;
            removeBroadcastBar();
            renderBroadcastBar(activeBarBroadcast, i18n);
        }
    }

    if (!activePopupBroadcast) {
        currentPopupBroadcastId = null;
        return;
    }

    if (isPopupOpen || activePopupBroadcast.id === currentPopupBroadcastId) {
        return;
    }
    currentPopupBroadcastId = activePopupBroadcast.id;
    await openBroadcastPopup(activePopupBroadcast, i18n);
}

async function startPolling(i18n, signal) {
    await refreshBroadcast(i18n, signal);
    if (signal.aborted) return;

    const runTick = async () => {
        if (stopPollingForAuthFailure || signal.aborted) {
            pollTimer = null;
            return;
        }
        await refreshBroadcast(i18n, signal);
        if (signal.aborted) return;
        const pollDelay =
            document.visibilityState === "visible"
                ? POLL_INTERVAL_VISIBLE_MILLISECONDS
                : POLL_INTERVAL_HIDDEN_MILLISECONDS;
        pollTimer = setTimeout(runTick, pollDelay);
    };

    const initialPollDelay =
        document.visibilityState === "visible"
            ? POLL_INTERVAL_VISIBLE_MILLISECONDS
            : POLL_INTERVAL_HIDDEN_MILLISECONDS;
    pollTimer = setTimeout(runTick, initialPollDelay);
}

export async function mountProvider(ctx) {
    const signal = ctx.signal;
    activeSignal = signal;
    const dispose = () => {
        if (activeSignal !== signal) return;
        clearTimeout(pollTimer);
        pollTimer = null;
        removeBroadcastBar();
    };
    signal.addEventListener("abort", dispose, { once: true });
    if (!localStorage.getItem("cognis_access_token")) return;
    if (pollTimer) clearTimeout(pollTimer);
    stopPollingForAuthFailure = false;
    try {
        await ensurePersistentStylesheet(CSS_HREF);
        const i18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/notify/languages"],
        });
        signal.throwIfAborted();
        await startPolling(i18n, signal);
    } catch (error) {
        if (!signal.aborted)
            console.error("[notify] broadcast provider failed", {
                operation: "mountBroadcastProvider",
                errorName: error?.name,
            });
        dispose();
    }
    return dispose;
}
