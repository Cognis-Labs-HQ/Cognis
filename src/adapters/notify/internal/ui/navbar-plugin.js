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
import { createI18n } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatRelativeTime } from "/static/reuse/timestamp.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { hexToBytes, importRoomKey } from "/static/reuse/crypto-utils.js";

const POLL_INTERVAL_VISIBLE_MS = 10_000;
const POLL_INTERVAL_HIDDEN_MS = 30_000;
const TOAST_BODY_PREVIEW_LENGTH = 90;
const TOAST_AUTO_DISMISS_MS = 6_000;
const RELATIVE_TIME_TICK_MS = 1000;
const CSS_HREF = "/static/gateways/notify-internal/notifications.css";
const notificationTextDecoder = new TextDecoder();
const roomKeyCache = new Map();

function injectStyles() {
    if (document.querySelector(`link[href="${CSS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.head.appendChild(link);
}

function navigateNotif(actionUrl) {
    try {
        const url = new URL(actionUrl, window.location.origin);
        if (url.origin === window.location.origin) {
            navigateTo(url.pathname + url.search + url.hash);
        } else {
            window.open(actionUrl, "_blank", "noopener,noreferrer");
        }
    } catch {
        // malformed URL — no navigation
    }
}

async function getRoomKey(roomId) {
    if (roomKeyCache.has(roomId)) return roomKeyCache.get(roomId);
    const response = await apiFetch(
        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/key`,
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const roomKeyHex = payload?.data?.key;
    if (typeof roomKeyHex !== "string" || roomKeyHex.length === 0) return null;
    const roomKey = await importRoomKey(roomKeyHex, ["decrypt"]);
    roomKeyCache.set(roomId, roomKey);
    return roomKey;
}

function parseRoomId(actionUrl) {
    if (typeof actionUrl !== "string" || actionUrl.length === 0) return null;
    const match = actionUrl.match(/^\/messages\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

async function decryptRoomMessage(roomId) {
    const roomKey = await getRoomKey(roomId);
    if (!roomKey) return null;
    const response = await apiFetch(
        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=1`,
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
        console.warn(
            "[notify-internal] Failed to decrypt latest room message.",
        );
        return null;
    }
}

async function fetchCount() {
    try {
        const res = await apiFetch("/api/v1/notifications/inbox/count");
        if (!res.ok) return 0;
        const payload = await res.json();
        return payload.data?.count ?? 0;
    } catch {
        return 0;
    }
}

async function fetchNotifications() {
    try {
        const res = await apiFetch("/api/v1/notifications/inbox");
        if (!res.ok) return [];
        const payload = await res.json();
        return payload.data ?? [];
    } catch {
        return [];
    }
}

async function markAllRead() {
    await apiFetch("/api/v1/notifications/inbox/read", { method: "PUT" });
}

async function markOneRead(id) {
    await apiFetch(
        `/api/v1/notifications/inbox/${encodeURIComponent(id)}/read`,
        { method: "PUT" },
    );
}

async function deleteNotification(id) {
    await apiFetch(`/api/v1/notifications/inbox/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}

async function deleteAllNotifications() {
    const res = await apiFetch("/api/v1/notifications/inbox", {
        method: "DELETE",
    });
    if (!res.ok) {
        throw new Error(`clear-all failed: ${res.status}`);
    }
}

let panelVisible = false;
let pollTimer = null;
let relativeTimeTimer = null;
let badgeEl = null;
let panelEl = null;
let listEl = null;
let emptyEl = null;
let markAllBtn = null;
let mobileBackdropEl = null;
let currentNotifications = [];
let seenIds = null;
let relativeTimeNodes = [];

function tickRelativeTimes() {
    for (const node of relativeTimeNodes) {
        const timestamp = Number(node.dataset.relativeTime);
        if (!Number.isFinite(timestamp)) continue;
        node.textContent = formatRelativeTime(timestamp);
    }
}

function startRelativeTimeTicker() {
    if (relativeTimeTimer !== null || !listEl) return;
    relativeTimeNodes = Array.from(
        listEl.querySelectorAll("[data-relative-time]"),
    );
    relativeTimeTimer = setInterval(tickRelativeTimes, RELATIVE_TIME_TICK_MS);
}

function stopRelativeTimeTicker() {
    if (relativeTimeTimer === null) return;
    clearInterval(relativeTimeTimer);
    relativeTimeTimer = null;
    relativeTimeNodes = [];
}

function updateBadge(count) {
    if (!badgeEl) return;
    badgeEl.textContent = String(count > 99 ? "99+" : count);
    badgeEl.hidden = count === 0;
}

function renderNotificationItem(notif, i18n) {
    const listItem = document.createElement("li");
    listItem.className =
        "notification-item " +
        (notif.read ? "notification-item--read" : "notification-item--unread") +
        (notif.actionUrl ? " notification-item--linked" : "");
    listItem.dataset.id = notif.id;

    listItem.innerHTML =
        '<span class="notification-item-dot" aria-hidden="true"></span>' +
        '<span class="notification-item-body">' +
        `<span class="notification-item-subject">${escapeHtml(notif.subject)}</span>` +
        `<span class="notification-item-sender">${escapeHtml(notif.senderName ?? i18n.t("ui.reuse.system"))}</span>` +
        `<span class="notification-item-preview">${escapeHtml(notif.body)}</span>` +
        "</span>" +
        `<span class="notification-item-time" data-relative-time="${notif.createdAt}">${escapeHtml(formatRelativeTime(notif.createdAt))}</span>` +
        (notif.actionUrl
            ? '<span class="notification-item-link-arrow" aria-hidden="true">&#8250;</span>'
            : "") +
        `<button class="notification-dismiss" type="button" aria-label="${i18n.t("ui.reuse.remove")}">&#215;</button>`;

    listItem.addEventListener("click", async (e) => {
        if (e.target.closest(".notification-dismiss")) return;
        if (!notif.read) {
            try {
                await markOneRead(notif.id);
                listItem.classList.remove("notification-item--unread");
                listItem.classList.add("notification-item--read");
                notif.read = true;
                await refreshCount();
            } catch {
                showToast(i18n.t("adapter.notify.internal.error_mark_read"), {
                    variant: "error",
                });
            }
        }
        if (notif.actionUrl) {
            closePanel();
            navigateNotif(notif.actionUrl);
        }
    });

    const dismissBtn = listItem.querySelector(".notification-dismiss");
    dismissBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
            await deleteNotification(notif.id);
            listItem.remove();
            currentNotifications = currentNotifications.filter(
                (n) => n.id !== notif.id,
            );
            await refreshCount();
            if (currentNotifications.length === 0 && emptyEl) {
                emptyEl.hidden = false;
            }
        } catch {
            showToast(i18n.t("adapter.notify.internal.error_dismiss"), {
                variant: "error",
            });
        }
    });

    return listItem;
}

async function refreshCount() {
    const count = await fetchCount();
    updateBadge(count);
}

async function openPanel(i18n) {
    if (!panelEl || !listEl) return;
    closeProfileMenu();
    panelEl.hidden = false;
    if (mobileBackdropEl) mobileBackdropEl.hidden = false;
    panelVisible = true;
    currentNotifications = await fetchNotifications();
    renderPanelContents(i18n);
}

function renderPanelContents(i18n) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = true;

    currentNotifications.forEach((n) => seenIds?.add(n.id));
    const unreadCount = currentNotifications.filter((n) => !n.read).length;
    updateBadge(unreadCount);

    if (currentNotifications.length === 0) {
        if (emptyEl) emptyEl.hidden = false;
        stopRelativeTimeTicker();
        return;
    }

    for (const notif of currentNotifications) {
        listEl.appendChild(renderNotificationItem(notif, i18n));
    }

    stopRelativeTimeTicker();
    startRelativeTimeTicker();
}

async function refreshOpenPanel(i18n) {
    if (!panelVisible) return;
    const notifs = await fetchNotifications();
    const knownIds = new Set(currentNotifications.map((n) => n.id));
    const arrivals = notifs.filter((n) => !knownIds.has(n.id));

    if (
        arrivals.length === 0 &&
        notifs.length === currentNotifications.length
    ) {
        updateBadge(notifs.filter((n) => !n.read).length);
        return;
    }

    currentNotifications = notifs;
    renderPanelContents(i18n);
}

function closePanel() {
    if (!panelEl) return;
    panelEl.hidden = true;
    if (mobileBackdropEl) mobileBackdropEl.hidden = true;
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
    const wrap = document.createElement("div");
    wrap.className = "notification-panel-wrap";

    const btn = document.createElement("button");
    btn.id = "notification-toggle";
    btn.className = "notification-button";
    btn.setAttribute("aria-label", i18n.t("ui.reuse.notifications"));
    btn.setAttribute("type", "button");
    btn.innerHTML =
        '<span class="notification-badge-wrap">' +
        '<span class="notification-icon" aria-hidden="true"><img src="/static/assets/icons/bell.svg" alt="" class="notification-icon-img" /></span>' +
        '<span id="notification-count" class="notification-count" hidden>0</span>' +
        "</span>";

    badgeEl = btn.querySelector("#notification-count");

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

    markAllBtn = document.createElement("button");
    markAllBtn.className = "notification-mark-all-read";
    markAllBtn.type = "button";
    markAllBtn.textContent = i18n.t("adapter.notify.internal.mark_all_read");
    markAllBtn.addEventListener("click", async () => {
        try {
            await markAllRead();
            if (listEl) {
                listEl.querySelectorAll(".notification-item").forEach((el) => {
                    el.classList.remove("notification-item--unread");
                    el.classList.add("notification-item--read");
                });
            }
            currentNotifications.forEach((n) => {
                n.read = true;
            });
            updateBadge(0);
        } catch {
            showToast(i18n.t("adapter.notify.internal.error_mark_all_read"), {
                variant: "error",
            });
        }
    });
    header.appendChild(markAllBtn);

    const clearAllBtn = document.createElement("button");
    clearAllBtn.className = "notification-clear-all";
    clearAllBtn.type = "button";
    clearAllBtn.setAttribute(
        "aria-label",
        i18n.t("adapter.notify.internal.clear_all"),
    );
    clearAllBtn.title = i18n.t("adapter.notify.internal.clear_all");
    clearAllBtn.innerHTML = "&#x1F5D1;";
    clearAllBtn.addEventListener("click", async () => {
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
    header.appendChild(clearAllBtn);

    panel.appendChild(header);

    const list = document.createElement("ul");
    list.className = "notification-list";
    list.setAttribute("aria-live", "polite");
    panel.appendChild(list);
    listEl = list;

    const empty = document.createElement("p");
    empty.className = "notification-empty";
    empty.textContent = i18n.t("adapter.notify.internal.empty");
    empty.hidden = true;
    panel.appendChild(empty);
    emptyEl = empty;

    panelEl = panel;
    wrap.appendChild(btn);
    wrap.appendChild(panel);

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
    mobileBackdropEl = mobileBackdrop;
    wrap.appendChild(mobileBackdrop);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (panelVisible) {
            closePanel();
        } else {
            openPanel(i18n);
        }
    });

    document.addEventListener("click", (e) => {
        if (panelVisible && !wrap.contains(e.target)) {
            closePanel();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && panelVisible) closePanel();
    });

    return wrap;
}

function insertButton(wrap) {
    const accountCluster = document.querySelector(".account-cluster");
    if (!accountCluster) return;
    const profileMenu = accountCluster.querySelector(".profile-menu");
    if (profileMenu) {
        accountCluster.insertBefore(wrap, profileMenu);
    } else {
        accountCluster.appendChild(wrap);
    }
}

async function startPolling(i18n) {
    const initial = await fetchNotifications();
    seenIds = new Set(initial.map((n) => n.id));
    const unread = initial.filter((n) => !n.read).length;
    updateBadge(unread);

    function scheduleNext() {
        const delay =
            document.visibilityState === "visible"
                ? POLL_INTERVAL_VISIBLE_MS
                : POLL_INTERVAL_HIDDEN_MS;
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
    const notifs = await fetchNotifications();
    const unread = notifs.filter((n) => !n.read).length;
    updateBadge(unread);

    if (seenIds === null) {
        seenIds = new Set(notifs.map((n) => n.id));
        return;
    }

    const arrivals = notifs.filter((n) => !seenIds.has(n.id));
    for (const notif of arrivals) {
        seenIds.add(notif.id);
        if (!notif.read) {
            void showArrivalToast(notif, i18n);
        }
    }
}

let arrivalToastContainer = null;
let cachedNavBottom = 0;

function updateNavBottom() {
    const navrow = document.querySelector(".global-navrow");
    if (navrow) {
        cachedNavBottom = navrow.getBoundingClientRect().bottom;
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
        updateNavBottom();
        window.addEventListener("resize", updateNavBottom, { passive: true });
    }

    if (cachedNavBottom > 0) {
        arrivalToastContainer.style.top = `${Math.round(cachedNavBottom) + 8}px`;
    }

    return arrivalToastContainer;
}

async function markArrivalRead(notif) {
    if (notif.read) return;
    try {
        await markOneRead(notif.id);
        notif.read = true;
        const cached = currentNotifications.find((n) => n.id === notif.id);
        if (cached) cached.read = true;
        if (panelVisible && listEl) {
            const item = listEl.querySelector(
                `[data-id="${CSS.escape(notif.id)}"]`,
            );
            if (item) {
                item.classList.remove("notification-item--unread");
                item.classList.add("notification-item--read");
            }
        }
        await refreshCount();
    } catch (err) {
        // Non-fatal: arrival toast was clicked but read-marking failed.
        // The next inbox poll will still reflect server state when the user
        // opens the panel; do not interrupt navigation/openPanel for this.
        console.warn("[notify-internal] Failed to mark arrival as read:", err);
    }
}

async function showArrivalToast(notif, i18n) {
    const container = getArrivalToastContainer();
    const toast = document.createElement("div");
    toast.className = "arrival-toast";
    toast.setAttribute("role", "alert");

    let toastSubject = notif.subject;
    let toastPreview = notif.body;
    if (notif.category === "messages") {
        const genericMessage = i18n.t("adapter.notify.internal.new_message");
        toastSubject = genericMessage;
        toastPreview = genericMessage;
        const roomId = parseRoomId(notif.actionUrl);
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

    const sender = notif.senderName ?? i18n.t("ui.reuse.system");

    toast.innerHTML =
        '<span class="arrival-toast-icon" aria-hidden="true">\uD83D\uDD14</span>' +
        '<div class="arrival-toast-text">' +
        `<span class="arrival-toast-subject">${escapeHtml(toastSubject)}</span>` +
        `<span class="arrival-toast-sender">${escapeHtml(sender)}</span>` +
        `<span class="arrival-toast-preview">${escapeHtml(preview)}</span>` +
        "</div>" +
        `<button class="arrival-toast-dismiss" type="button" aria-label="${i18n.t("ui.reuse.dismiss")}">&#215;</button>`;

    const dismiss = () => {
        toast.classList.add("arrival-toast--out");
        toast.addEventListener("animationend", () => toast.remove(), {
            once: true,
        });
    };

    toast.addEventListener("click", (e) => {
        if (e.target.closest(".arrival-toast-dismiss")) {
            dismiss();
            return;
        }
        dismiss();
        markArrivalRead(notif);
        if (notif.actionUrl) {
            navigateNotif(notif.actionUrl);
        } else {
            openPanel(i18n);
        }
    });

    toast
        .querySelector(".arrival-toast-dismiss")
        ?.addEventListener("click", (e) => {
            e.stopPropagation();
            dismiss();
        });

    container.appendChild(toast);
    setTimeout(dismiss, TOAST_AUTO_DISMISS_MS);
}

(async function init() {
    if (!localStorage.getItem("cognis_access_token")) return;

    try {
        injectStyles();

        const i18n = await createI18n({
            componentStringBaseUrls: [
                "/static/gateways/notify-internal/languages",
            ],
        });

        const wrap = buildButton(i18n);
        insertButton(wrap);
        watchProfileMenu();

        await startPolling(i18n);
    } catch (err) {
        // Initialization failed — navbar plugin degrades gracefully without the
        // notification bell.
        console.error("[notify-internal] navbar plugin init failed:", err);
    }
})();
