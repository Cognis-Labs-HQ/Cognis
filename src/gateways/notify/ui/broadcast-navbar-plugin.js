import { createI18n } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { showToast } from "/static/reuse/toast.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";

const CSS_HREF = "/static/gateways/notify/broadcast.css";
const POLL_INTERVAL_VISIBLE_MS = 20_000;
const POLL_INTERVAL_HIDDEN_MS = 45_000;
const BAR_CONTAINER_ID = "notify-broadcast-bar";

let currentBroadcastId = null;
let isPopupOpen = false;
let pollTimer = null;
let stopPollingForAuthFailure = false;

function navigateAfterClose(redirectUrl, i18n) {
    if (!redirectUrl) return;
    try {
        const parsedUrl = new URL(redirectUrl, window.location.origin);
        if (parsedUrl.origin === window.location.origin) {
            navigateTo(parsedUrl.pathname + parsedUrl.search + parsedUrl.hash);
            return;
        }
        window.open(parsedUrl.toString(), "_blank", "noopener,noreferrer");
    } catch {
        showToast(i18n.t("gateway.notify.broadcast.invalid_redirect"), {
            variant: "warning",
        });
    }
}

async function fetchActiveBroadcasts() {
    try {
        const response = await apiFetch(
            "/api/v1/notifications/broadcasts/active",
        );
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
        `/api/v1/notifications/broadcasts/${encodeURIComponent(broadcastId)}/acknowledge`,
        { method: "POST" },
    );
}

async function dismissBroadcast(broadcastId) {
    await apiFetch(
        `/api/v1/notifications/broadcasts/${encodeURIComponent(broadcastId)}/dismiss`,
        { method: "POST" },
    );
}

function getBarContainer() {
    let barContainer = document.getElementById(BAR_CONTAINER_ID);
    if (barContainer) return barContainer;
    barContainer = document.createElement("div");
    barContainer.id = BAR_CONTAINER_ID;
    document.body.appendChild(barContainer);
    return barContainer;
}

function removeBroadcastBar() {
    document.getElementById(BAR_CONTAINER_ID)?.remove();
}

function renderBroadcastBar(broadcast, i18n) {
    const barContainer = getBarContainer();
    barContainer.innerHTML = `
      <section class="notify-broadcast-bar" role="status" aria-live="polite">
        <div class="notify-broadcast-content">
          <strong class="notify-broadcast-title">${escapeHtml(broadcast.title)}</strong>
          <span class="notify-broadcast-message">${escapeHtml(broadcast.message)}</span>
        </div>
        <div class="notify-broadcast-actions">
          <button type="button" class="notify-broadcast-ack btn-animated">${
              broadcast.requireAcknowledgement
                  ? i18n.t("gateway.notify.broadcast.acknowledge")
                  : i18n.t("ui.reuse.dismiss")
          }</button>
          ${
              broadcast.requireAcknowledgement
                  ? `<button type="button" class="notify-broadcast-close">${i18n.t("ui.reuse.close")}</button>`
                  : ""
          }
        </div>
      </section>
    `;

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
            navigateAfterClose(broadcast.redirectUrl, i18n);
        } catch {
            showToast(i18n.t("gateway.notify.broadcast.action_failed"), {
                variant: "error",
            });
        }
    });

    const closeButton = barContainer.querySelector(".notify-broadcast-close");
    closeButton?.addEventListener("click", () => {
        removeBroadcastBar();
        if (broadcast.redirectUrl) {
            navigateAfterClose(broadcast.redirectUrl, i18n);
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
            body: escapeHtml(broadcast.message),
            actions: popupActions,
        });
        const didAcknowledge = popupResult === "acknowledge";
        if (didAcknowledge) {
            await acknowledgeBroadcast(broadcast.id);
            navigateAfterClose(broadcast.redirectUrl, i18n);
            return;
        }

        if (broadcast.requireAcknowledgement) {
            if (broadcast.redirectUrl) {
                navigateAfterClose(broadcast.redirectUrl, i18n);
            }
            return;
        }

        await dismissBroadcast(broadcast.id);
        navigateAfterClose(broadcast.redirectUrl, i18n);
    } catch {
        showToast(i18n.t("gateway.notify.broadcast.action_failed"), {
            variant: "error",
        });
    } finally {
        isPopupOpen = false;
    }
}

async function refreshBroadcast(i18n) {
    const { broadcasts, unauthorized } = await fetchActiveBroadcasts();
    if (unauthorized) {
        stopPollingForAuthFailure = true;
        removeBroadcastBar();
        return;
    }
    const activeBroadcast = broadcasts[0];
    if (!activeBroadcast) {
        currentBroadcastId = null;
        removeBroadcastBar();
        return;
    }
    if (activeBroadcast.id !== currentBroadcastId) {
        currentBroadcastId = activeBroadcast.id;
        removeBroadcastBar();
    }
    if (activeBroadcast.displayMode === "bar") {
        renderBroadcastBar(activeBroadcast, i18n);
    } else {
        removeBroadcastBar();
        await openBroadcastPopup(activeBroadcast, i18n);
    }
}

async function startPolling(i18n) {
    await refreshBroadcast(i18n);

    const runTick = async () => {
        if (stopPollingForAuthFailure) {
            pollTimer = null;
            return;
        }
        await refreshBroadcast(i18n);
        const pollDelay =
            document.visibilityState === "visible"
                ? POLL_INTERVAL_VISIBLE_MS
                : POLL_INTERVAL_HIDDEN_MS;
        pollTimer = setTimeout(runTick, pollDelay);
    };

    const initialPollDelay =
        document.visibilityState === "visible"
            ? POLL_INTERVAL_VISIBLE_MS
            : POLL_INTERVAL_HIDDEN_MS;
    pollTimer = setTimeout(runTick, initialPollDelay);
}

(async function initBroadcastPlugin() {
    if (!localStorage.getItem("cognis_access_token")) return;
    if (pollTimer) clearTimeout(pollTimer);
    stopPollingForAuthFailure = false;
    try {
        await ensurePageStylesheet(CSS_HREF);
        const i18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/notify/languages"],
        });
        await startPolling(i18n);
    } catch {
        removeBroadcastBar();
    }
})();
