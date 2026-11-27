/**
 * Internal notification adapter navbar plugin.
 *
 * Injects the notification bell button and panel into the dashboard layout's
 * account cluster. Polls the inbox count endpoint every 10 seconds when the
 * page is visible (30 seconds when hidden), updates the unread badge, and
 * shows a toast-style popup whenever new notifications arrive. Also lets the
 * user browse, dismiss, and mark notifications as read without leaving the
 * page.
 *
 * Public exports: none — side effects only on import.
 *
 * @module notify-internal/navbar-plugin
 */

import { bindCapability } from "/static/reuse/capabilities.js";
import { transientSurfaces } from "/static/reuse/transient-surfaces.js";
import { createI18n } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatRelativeTime } from "/static/reuse/timestamp.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { hexToBytes } from "/static/reuse/crypto-utils.js";
import { renderNotificationItem as renderItem } from "./notification-item.js";
import { sanitizeNotificationActionIcon } from "./action-icon.js";

const log = bindCapability("ui:log");

const POLL_INTERVAL_VISIBLE_MILLISECONDS = 10_000;
const POLL_INTERVAL_HIDDEN_MILLISECONDS = 30_000;
const TOAST_BODY_PREVIEW_LENGTH = 90;
const TOAST_AUTO_DISMISS_MILLISECONDS = 6_000;
const RELATIVE_TIME_TICK_MILLISECONDS = 1000;
const CSS_HREF = "/static/gateways/notify-internal/notifications.css";
const notificationTextDecoder = new TextDecoder();

function waitForNotificationStyles(link) {
    return new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener(
            "error",
            (error) => {
                void log(
                    "error",
                    "[notify-internal] notification styles failed to load:",
                    error,
                );
                resolve();
            },
            { once: true },
        );
    });
}

function loadNotificationStyles() {
    const existing = document.querySelector(`link[href="${CSS_HREF}"]`);
    if (existing?.sheet) return Promise.resolve();
    if (existing) return waitForNotificationStyles(existing);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    const stylesReady = waitForNotificationStyles(link);
    document.head.appendChild(link);
    return stylesReady;
}

function navigateNotification(actionUrl) {
    try {
        const url = new URL(actionUrl, window.location.origin);
        const actionEvent = new CustomEvent("cognis:notification-action", {
            cancelable: true,
            detail: { actionUrl: url.href },
        });
        if (!window.dispatchEvent(actionEvent)) return;
        if (url.origin === window.location.origin) {
            navigateTo(url.pathname + url.search + url.hash);
        } else {
            window.open(actionUrl, "_blank", "noopener,noreferrer");
        }
    } catch {
        // malformed URL — no navigation
    }
}

function actionButtonClass(consequence) {
    if (consequence === "creative") return "btn-confirm";
    if (consequence === "destructive") return "btn-cancel";
    return "btn-neutral";
}

function renderNotificationActions(notification) {
    const actions = notification.metadata?.actions;
    if (!Array.isArray(actions)) return "";
    const buttons = actions
        .filter(
            (action) =>
                action &&
                typeof action.id === "string" &&
                typeof action.label === "string",
        )
        .map(
            (action) =>
                `<button class="notification-action ${actionButtonClass(action.consequence)}" data-notification-action="${escapeHtml(action.id)}" type="button" aria-label="${escapeHtml(action.label)}">${sanitizeNotificationActionIcon(action.iconSvg) || escapeHtml(action.label)}</button>`,
        )
        .join("");
    return buttons
        ? `<span class="notification-actions">${buttons}</span>`
        : "";
}

function dispatchNotificationAction(notification, actionId) {
    window.dispatchEvent(
        new CustomEvent("cognis:notification-command", {
            detail: { actionId, notification },
        }),
    );
}

async function getRoomKey(roomId) {
    const loadChatRoomKey = uiCtx.capabilities.get(
        "social:messages:loadChatRoomKey",
    );
    return typeof loadChatRoomKey === "function"
        ? loadChatRoomKey(roomId)
        : null;
}

function parseRoomId(actionUrl) {
    if (typeof actionUrl !== "string" || actionUrl.length === 0) return null;
    const match = actionUrl.match(/^\/messages\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function isNotificationOwnedByCurrentPage(notification) {
    const currentPage = window.location.pathname.split("/").filter(Boolean)[0];
    if (!currentPage) return false;

    if (notification.actionUrl) {
        try {
            const actionPage = new URL(
                notification.actionUrl,
                window.location.origin,
            ).pathname
                .split("/")
                .filter(Boolean)[0];
            if (actionPage === currentPage) return true;
        } catch {
            // Malformed actions are handled by navigateNotif.
        }
    }

    return notification.category === currentPage;
}

async function decryptRoomMessage(roomId) {
    const roomKey = await getRoomKey(roomId);
    if (!roomKey) return null;
    const response = await apiFetch(
        `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=1`,
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const latestMessage = Array.isArray(payload?.data) ? payload.data[0] : null;
    if (
        !latestMessage ||
        typeof latestMessage.iv !== "string" ||
        typeof latestMessage.ciphertext !== "string"
    ) {
        return null;
    }
    try {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: hexToBytes(latestMessage.iv),
            },
            roomKey,
            hexToBytes(latestMessage.ciphertext),
        );
        return notificationTextDecoder.decode(decrypted).trim() || null;
    } catch {
        void log(
            "warn",
            "[notify-internal] Failed to decrypt latest room message.",
        );
        return null;
    }
}

async function fetchNotifications() {
    try {
        const response = await apiFetch("/api/v1/notify/inbox");
        if (!response.ok) return [];
        const payload = await response.json();
        return (payload.data ?? []).map(localizeNotification);
    } catch {
        return [];
    }
}

function localizeNotification(notification) {
    const localizedText = notification.metadata?.localizedText;
    if (!localizedText || typeof localizedText !== "object") {
        return notification;
    }
    const preferredLocales = [
        ...(navigator.languages ?? []),
        navigator.language,
        "en",
    ];
    for (const locale of preferredLocales) {
        const normalizedLocale = String(locale ?? "")
            .toLowerCase()
            .split("-")[0];
        const copy = localizedText[normalizedLocale];
        if (
            copy &&
            typeof copy.subject === "string" &&
            typeof copy.body === "string"
        ) {
            return { ...notification, subject: copy.subject, body: copy.body };
        }
    }
    return notification;
}

async function markAllRead() {
    await apiFetch("/api/v1/notify/inbox/read", { method: "PUT" });
}

async function markOneRead(id) {
    await apiFetch(`/api/v1/notify/inbox/${encodeURIComponent(id)}/read`, {
        method: "PUT",
    });
}

async function deleteNotification(id) {
    await apiFetch(`/api/v1/notify/inbox/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}

async function resolveCorrelatedNotifications(correlationId) {
    if (!correlationId) return;
    document
        .querySelectorAll(
            `[data-notification-correlation="${CSS.escape(correlationId)}"]`,
        )
        .forEach((element) => element.remove());
    const notifications = await fetchNotifications();
    const matches = notifications.filter(
        (notification) =>
            String(notification.metadata?.correlationId ?? "") ===
            correlationId,
    );
    await Promise.all(
        matches.map((notification) => deleteNotification(notification.id)),
    );
    for (const notification of matches) seenIds?.delete(notification.id);
    await refreshCount();
}

async function deleteAllNotifications() {
    const response = await apiFetch("/api/v1/notify/inbox", {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error(`clear-all failed: ${response.status}`);
    }
}

let panelVisible = false;
let panelController;
let pollTimer = null;
let relativeTimeTimer = null;
let badgeElement = null;
let panelElement = null;
let listElement = null;
let emptyElement = null;
let markAllButton = null;
let clearAllButton = null;
let mobileBackdropElement = null;
let currentNotifications = [];
let seenIds = null;
let relativeTimeNodes = [];

registerSearchIndex("notifications", collectNotificationSearchGroups);

function collectNotificationSearchGroups() {
    const items = currentNotifications.map((notification) => {
        const timeLabel = formatRelativeTime(notification.createdAt);
        return {
            id: `notification:${notification.id}`,
            label: notification.subject,
            description: [notification.senderName, timeLabel]
                .filter(Boolean)
                .join(" — "),
            url: notification.actionUrl || window.location.pathname,
            searchText: [
                notification.subject,
                notification.senderName,
                notification.body,
                timeLabel,
            ]
                .filter(Boolean)
                .join(" "),
            resultClass: "notification",
            visible: true,
        };
    });
    return items.length ? [{ category: "Notifications", items }] : [];
}

function tickRelativeTimes() {
    for (const node of relativeTimeNodes) {
        const timestamp = Number(node.dataset.relativeTime);
        if (!Number.isFinite(timestamp)) continue;
        node.textContent = formatRelativeTime(timestamp);
    }
}

function startRelativeTimeTicker() {
    if (relativeTimeTimer !== null || !listElement) return;
    relativeTimeNodes = Array.from(
        listElement.querySelectorAll("[data-relative-time]"),
    );
    relativeTimeTimer = setInterval(
        tickRelativeTimes,
        RELATIVE_TIME_TICK_MILLISECONDS,
    );
}

function stopRelativeTimeTicker() {
    if (relativeTimeTimer === null) return;
    clearInterval(relativeTimeTimer);
    relativeTimeTimer = null;
    relativeTimeNodes = [];
}

function updateBadge(count) {
    if (!badgeElement) return;
    badgeElement.textContent = String(count > 99 ? "99+" : count);
    badgeElement.hidden = count === 0;
}

function updateClearAllButton() {
    if (!clearAllButton) return;
    clearAllButton.disabled = currentNotifications.length === 0;
}

function renderNotificationItem(notification, i18n) {
    return renderItem(notification, i18n, {
        renderActions: renderNotificationActions,
        dispatchAction: dispatchNotificationAction,
        markRead: markOneRead,
        refreshCount,
        dismiss: deleteNotification,
        navigate: (url) => {
            closePanel();
            navigateNotification(url);
        },
        reportError: (key) => showToast(i18n.t(key), { variant: "error" }),
        afterDismiss: async (id) => {
            currentNotifications = currentNotifications.filter(
                (notification) => notification.id !== id,
            );
            await refreshCount();
            if (currentNotifications.length === 0 && emptyElement)
                emptyElement.hidden = false;
            updateClearAllButton();
        },
    });
}

async function refreshCount() {
    const notifications = await fetchNotifications();
    const count = notifications.filter(
        (notification) =>
            !notification.read && notification.metadata?.continuous !== true,
    ).length;
    updateBadge(count);
}

async function openPanel(i18n) {
    if (!panelElement || !listElement) return;
    closeProfileMenu();
    panelController?.abort();
    panelController = new AbortController();
    transientSurfaces.register(
        panelElement,
        closePanel,
        panelController.signal,
    );
    panelElement.hidden = false;
    if (mobileBackdropElement) mobileBackdropElement.hidden = false;
    panelVisible = true;
    currentNotifications = await fetchNotifications();
    renderPanelContents(i18n);
}

function renderPanelContents(i18n) {
    if (!listElement) return;
    listElement.innerHTML = "";
    if (emptyElement) emptyElement.hidden = true;

    currentNotifications.forEach((notification) =>
        seenIds?.add(notification.id),
    );
    const panelNotifications = currentNotifications.filter(
        (notification) => notification.metadata?.continuous !== true,
    );
    const unreadCount = panelNotifications.filter(
        (notification) => !notification.read,
    ).length;
    updateBadge(unreadCount);

    updateClearAllButton();

    if (panelNotifications.length === 0) {
        if (emptyElement) emptyElement.hidden = false;
        stopRelativeTimeTicker();
        return;
    }

    for (const notification of panelNotifications) {
        listElement.appendChild(renderNotificationItem(notification, i18n));
    }

    stopRelativeTimeTicker();
    startRelativeTimeTicker();
}

async function refreshOpenPanel(i18n) {
    if (!panelVisible) return;
    const notifications = await fetchNotifications();
    const knownIds = new Set(
        currentNotifications.map((notification) => notification.id),
    );
    const arrivals = notifications.filter(
        (notification) => !knownIds.has(notification.id),
    );

    if (
        arrivals.length === 0 &&
        notifications.length === currentNotifications.length
    ) {
        updateBadge(
            notifications.filter((notification) => !notification.read).length,
        );
        return;
    }

    currentNotifications = notifications;
    renderPanelContents(i18n);
}

function closePanel() {
    panelController?.abort();
    if (!panelElement) return;
    panelElement.hidden = true;
    if (mobileBackdropElement) mobileBackdropElement.hidden = true;
    panelVisible = false;
    stopRelativeTimeTicker();
}

function closeProfileMenu() {
    const dropdown = document.querySelector("#profile-dropdown");
    const profileMenu = document.querySelector(".profile-menu");
    dropdown?.classList.add("hidden");
    profileMenu?.classList.remove("open");
}

function watchProfileMenu() {
    const profileMenu = document.querySelector(".profile-menu");
    if (!profileMenu) return;
    const observer = new MutationObserver(() => {
        if (profileMenu.classList.contains("open") && panelVisible) {
            closePanel();
        }
    });
    observer.observe(profileMenu, {
        attributes: true,
        attributeFilter: ["class"],
    });
}

function buildButton(i18n) {
    const wrapperElement = document.createElement("div");
    wrapperElement.className = "notification-panel-wrap";

    const button = document.createElement("button");
    button.id = "notification-toggle";
    button.className = "notification-button";
    button.setAttribute("aria-label", i18n.t("ui.reuse.notifications"));
    button.setAttribute("type", "button");
    button.innerHTML =
        '<span class="notification-badge-wrap">' +
        '<span class="notification-icon" aria-hidden="true"><img src="/static/gateways/notify-internal/assets/bell.svg" alt="" class="notification-icon-img" /></span>' +
        '<span id="notification-count" class="notification-count" hidden>0</span>' +
        "</span>";

    badgeElement = button.querySelector("#notification-count");

    const panel = document.createElement("div");
    panel.className = "notification-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", i18n.t("ui.reuse.notifications"));

    const header = document.createElement("div");
    header.className = "notification-panel-header";

    const title = document.createElement("h2");
    title.className = "notification-panel-title";
    title.textContent = i18n.t("ui.reuse.notifications");
    header.appendChild(title);

    markAllButton = document.createElement("button");
    markAllButton.className = "notification-mark-all-read";
    markAllButton.type = "button";
    markAllButton.textContent = i18n.t("adapter.notify.internal.mark_all_read");
    markAllButton.addEventListener("click", async () => {
        try {
            await markAllRead();
            if (listElement) {
                listElement
                    .querySelectorAll(".notification-item")
                    .forEach((element) => {
                        element.classList.remove("notification-item--unread");
                        element.classList.add("notification-item--read");
                    });
            }
            currentNotifications.forEach((notification) => {
                notification.read = true;
            });
            updateBadge(0);
        } catch {
            showToast(i18n.t("adapter.notify.internal.error_mark_all_read"), {
                variant: "error",
            });
        }
    });
    header.appendChild(markAllButton);

    clearAllButton = document.createElement("button");
    clearAllButton.className = "notification-clear-all";
    clearAllButton.type = "button";
    clearAllButton.setAttribute(
        "aria-label",
        i18n.t("adapter.notify.internal.clear_all"),
    );
    clearAllButton.title = i18n.t("adapter.notify.internal.clear_all");
    clearAllButton.disabled = true;
    clearAllButton.innerHTML = "&#x1F5D1;";
    clearAllButton.addEventListener("click", async () => {
        if (currentNotifications.length === 0) return;

        const result = await openPopup({
            title: i18n.t("adapter.notify.internal.clear_all"),
            body: escapeHtml(
                i18n.t("adapter.notify.internal.clear_all_confirm_body"),
            ),
            variant: "danger",
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("adapter.notify.internal.clear_all"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
        });
        if (result !== "confirm") return;

        try {
            await deleteAllNotifications();
            currentNotifications = [];
            seenIds?.clear();
            renderPanelContents(i18n);
        } catch {
            showToast(i18n.t("adapter.notify.internal.error_clear_all"), {
                variant: "error",
            });
        }
    });
    header.appendChild(clearAllButton);

    panel.appendChild(header);

    const list = document.createElement("ul");
    list.className = "notification-list";
    list.setAttribute("aria-live", "polite");
    panel.appendChild(list);
    listElement = list;

    const empty = document.createElement("p");
    empty.className = "notification-empty";
    empty.textContent = i18n.t("adapter.notify.internal.empty");
    empty.hidden = true;
    panel.appendChild(empty);
    emptyElement = empty;

    panelElement = panel;
    wrapperElement.appendChild(button);
    wrapperElement.appendChild(panel);

    const mobileBackdrop = document.createElement("div");
    mobileBackdrop.className = "notification-mobile-backdrop";
    mobileBackdrop.setAttribute("role", "button");
    mobileBackdrop.tabIndex = 0;
    mobileBackdrop.hidden = true;
    mobileBackdrop.setAttribute("aria-label", i18n.t("ui.reuse.close"));
    mobileBackdrop.addEventListener("click", () => closePanel());
    mobileBackdrop.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            closePanel();
        }
    });
    mobileBackdropElement = mobileBackdrop;
    wrapperElement.appendChild(mobileBackdrop);

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (panelVisible) {
            closePanel();
        } else {
            openPanel(i18n);
        }
    });

    document.addEventListener("click", (event) => {
        if (panelVisible && !wrapperElement.contains(event.target)) {
            closePanel();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && panelVisible) closePanel();
    });

    return wrapperElement;
}

function insertButton(wrapperElement) {
    const accountCluster = document.querySelector(".account-cluster");
    if (!accountCluster) return;
    const profileMenu = accountCluster.querySelector(".profile-menu");
    if (profileMenu) {
        accountCluster.insertBefore(wrapperElement, profileMenu);
    } else {
        accountCluster.appendChild(wrapperElement);
    }
}

async function startPolling(i18n) {
    const initial = await fetchNotifications();
    seenIds = new Set(initial.map((notification) => notification.id));
    const persistentArrivals = initial.filter(
        (notification) =>
            !notification.read && notification.metadata?.continuous === true,
    );
    const unread = initial.filter(
        (notification) =>
            !notification.read && notification.metadata?.continuous !== true,
    ).length;
    updateBadge(unread);
    for (const notification of persistentArrivals) {
        window.dispatchEvent(
            new CustomEvent("cognis:notification-arrival", {
                detail: { notification },
            }),
        );
        void showArrivalToast(notification, i18n);
    }

    function scheduleNext() {
        const delay =
            document.visibilityState === "visible"
                ? POLL_INTERVAL_VISIBLE_MILLISECONDS
                : POLL_INTERVAL_HIDDEN_MILLISECONDS;
        pollTimer = setTimeout(tick, delay);
    }

    async function tick() {
        if (panelVisible) {
            await refreshOpenPanel(i18n);
        } else {
            await checkForNew(i18n);
        }
        scheduleNext();
    }

    scheduleNext();
}

async function checkForNew(i18n) {
    const notifications = await fetchNotifications();
    const unread = notifications.filter(
        (notification) =>
            !notification.read && notification.metadata?.continuous !== true,
    ).length;
    updateBadge(unread);

    const arrivals = notifications.filter(
        (notification) => !seenIds.has(notification.id),
    );
    for (const notification of arrivals) {
        seenIds.add(notification.id);
        window.dispatchEvent(
            new CustomEvent("cognis:notification-arrival", {
                detail: { notification: notification },
            }),
        );
        if (
            !notification.read &&
            (notification.metadata?.continuous === true ||
                !isNotificationOwnedByCurrentPage(notification))
        ) {
            void showArrivalToast(notification, i18n);
        }
    }
}

let arrivalToastContainer = null;
let cachedNavigationBottom = 0;

function updateNavigationBottom() {
    const navigationRow = document.querySelector(".global-navrow");
    if (navigationRow) {
        cachedNavigationBottom = navigationRow.getBoundingClientRect().bottom;
    }
}

function getArrivalToastContainer() {
    if (
        !arrivalToastContainer ||
        !document.body.contains(arrivalToastContainer)
    ) {
        const container = document.createElement("div");
        container.className = "arrival-toast-container";
        document.body.appendChild(container);
        arrivalToastContainer = container;
        updateNavigationBottom();
        window.addEventListener("resize", updateNavigationBottom, {
            passive: true,
        });
    }

    if (cachedNavigationBottom > 0) {
        arrivalToastContainer.style.top = `${Math.round(cachedNavigationBottom) + 8}px`;
    }

    return arrivalToastContainer;
}

async function markArrivalRead(currentNotification) {
    if (currentNotification.read) return;
    try {
        await markOneRead(currentNotification.id);
        currentNotification.read = true;
        const cached = currentNotifications.find(
            (notification) => notification.id === currentNotification.id,
        );
        if (cached) cached.read = true;
        if (panelVisible && listElement) {
            const item = listElement.querySelector(
                `[data-id="${CSS.escape(currentNotification.id)}"]`,
            );
            if (item) {
                item.classList.remove("notification-item--unread");
                item.classList.add("notification-item--read");
            }
        }
        await refreshCount();
    } catch (error) {
        // Non-fatal: arrival toast was clicked but read-marking failed.
        // The next inbox poll will still reflect server state when the user
        // opens the panel; do not interrupt navigation/openPanel for this.
        void log(
            "warn",
            "[notify-internal] Failed to mark arrival as read:",
            error,
        );
    }
}

async function showArrivalToast(notification, i18n) {
    const container = getArrivalToastContainer();
    const toast = document.createElement("div");
    toast.className = "arrival-toast";
    toast.setAttribute("role", "alert");
    const correlationId = String(notification.metadata?.correlationId ?? "");
    if (correlationId) {
        toast.dataset.notificationCorrelation = correlationId;
    }

    let toastSubject = notification.subject;
    let toastPreview = notification.body;
    if (notification.category === "messages") {
        const genericMessage = i18n.t("adapter.notify.internal.new_message");
        toastSubject = genericMessage;
        toastPreview = genericMessage;
        const roomId = parseRoomId(notification.actionUrl);
        if (roomId) {
            const decryptedPreview = await decryptRoomMessage(roomId);
            if (decryptedPreview) {
                toastPreview = decryptedPreview;
            }
        }
    }

    const preview =
        toastPreview.length > TOAST_BODY_PREVIEW_LENGTH
            ? toastPreview.slice(0, TOAST_BODY_PREVIEW_LENGTH) + "\u2026"
            : toastPreview;

    const sender = notification.senderName ?? i18n.t("ui.reuse.system");

    const isPersistent = notification.metadata?.continuous === true;
    toast.classList.toggle("arrival-toast--persistent", isPersistent);
    toast.innerHTML =
        '<span class="arrival-toast-icon" aria-hidden="true">\uD83D\uDD14</span>' +
        '<div class="arrival-toast-text">' +
        `<span class="arrival-toast-subject">${escapeHtml(toastSubject)}</span>` +
        `<span class="arrival-toast-sender">${escapeHtml(sender)}</span>` +
        `<span class="arrival-toast-preview">${escapeHtml(preview)}</span>` +
        "</div>" +
        (isPersistent
            ? renderNotificationActions(notification)
            : `<button class="arrival-toast-dismiss" type="button" aria-label="${i18n.t("ui.reuse.dismiss")}">&#215;</button>`);

    const dismiss = () => {
        toast.classList.add("arrival-toast--out");
        toast.addEventListener("animationend", () => toast.remove(), {
            once: true,
        });
    };

    toast.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-notification-action]");
        if (actionButton instanceof HTMLElement) {
            dismiss();
            void markArrivalRead(notification);
            dispatchNotificationAction(
                notification,
                actionButton.dataset.notificationAction,
            );
            return;
        }
        if (event.target.closest(".arrival-toast-dismiss")) {
            dismiss();
            return;
        }
        dismiss();
        markArrivalRead(notification);
        if (notification.actionUrl) {
            navigateNotification(notification.actionUrl);
        } else {
            openPanel(i18n);
        }
    });

    toast
        .querySelector(".arrival-toast-dismiss")
        ?.addEventListener("click", (event) => {
            event.stopPropagation();
            dismiss();
        });

    container.appendChild(toast);
    if (isPersistent) {
        const metadata = notification.metadata ?? {};
        const remaining = Number(metadata.expiresAt) - Date.now();
        setTimeout(
            () => {
                dismiss();
            },
            Math.max(0, Number.isFinite(remaining) ? remaining : 0),
        );
    } else {
        setTimeout(dismiss, TOAST_AUTO_DISMISS_MILLISECONDS);
    }
}

window.addEventListener("cognis:notification-resolved", (event) => {
    void resolveCorrelatedNotifications(
        String(event.detail?.correlationId ?? ""),
    );
});

(async function initialize() {
    if (!localStorage.getItem("cognis_access_token")) return;

    try {
        await loadNotificationStyles();

        const i18n = await createI18n({
            componentStringBaseUrls: [
                "/static/gateways/notify-internal/languages",
            ],
        });

        const wrapperElement = buildButton(i18n);
        insertButton(wrapperElement);
        watchProfileMenu();

        await startPolling(i18n);
    } catch (error) {
        // Initialization failed — navbar plugin degrades gracefully without the
        // notification bell.
        void log(
            "error",
            "[notify-internal] navbar plugin init failed:",
            error,
        );
    }
})();
