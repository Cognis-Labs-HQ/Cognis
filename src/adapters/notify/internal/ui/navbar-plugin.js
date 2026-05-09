/**
 * Internal notification adapter navbar plugin.
 *
 * Injects the notification bell button and panel into the dashboard layout's
 * account cluster. Polls the inbox count endpoint every 30 seconds, updates
 * the unread badge, and lets the user browse, dismiss, and mark notifications
 * as read without leaving the page.
 *
 * Public exports: none — side effects only on import.
 *
 * @module notify-internal/navbar-plugin
 */
import { createI18n } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

const POLL_INTERVAL_MS = 30_000;
const CSS_HREF = "/static/gateways/notify-internal/notifications.css";

function injectStyles() {
    if (document.querySelector(`link[href="${CSS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.head.appendChild(link);
}

function formatRelativeTime(ms) {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    if (seconds < 60) return rtf.format(-seconds, "second");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return rtf.format(-minutes, "minute");
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return rtf.format(-hours, "hour");
    const days = Math.floor(hours / 24);
    return rtf.format(-days, "day");
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

let panelVisible = false;
let pollTimer = null;
let badgeEl = null;
let panelEl = null;
let listEl = null;
let emptyEl = null;
let markAllBtn = null;
let currentNotifications = [];

function updateBadge(count) {
    if (!badgeEl) return;
    badgeEl.textContent = String(count > 99 ? "99+" : count);
    badgeEl.hidden = count === 0;
}

function renderNotificationItem(notif, i18n) {
    const li = document.createElement("li");
    li.className =
        "notification-item " +
        (notif.read ? "notification-item--read" : "notification-item--unread");
    li.dataset.id = notif.id;

    li.innerHTML =
        '<span class="notification-item-dot" aria-hidden="true"></span>' +
        '<span class="notification-item-body">' +
        `<span class="notification-item-subject">${escapeHtml(notif.subject)}</span>` +
        `<span class="notification-item-preview">${escapeHtml(notif.body)}</span>` +
        `<span class="notification-item-time">${escapeHtml(formatRelativeTime(notif.createdAt))}</span>` +
        "</span>" +
        `<button class="notification-dismiss" type="button" aria-label="${i18n.t("ui.reuse.generic.remove")}">&#215;</button>`;

    if (!notif.read) {
        li.addEventListener("click", async (e) => {
            if (e.target.closest(".notification-dismiss")) return;
            li.classList.remove("notification-item--unread");
            li.classList.add("notification-item--read");
            notif.read = true;
            await markOneRead(notif.id);
            await refreshCount();
        });
    }

    const dismissBtn = li.querySelector(".notification-dismiss");
    dismissBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        li.remove();
        currentNotifications = currentNotifications.filter(
            (n) => n.id !== notif.id,
        );
        await deleteNotification(notif.id);
        await refreshCount();
        if (currentNotifications.length === 0 && emptyEl) {
            emptyEl.hidden = false;
        }
    });

    return li;
}

async function refreshCount() {
    const count = await fetchCount();
    updateBadge(count);
}

async function openPanel(i18n) {
    if (!panelEl || !listEl) return;
    panelEl.hidden = false;
    panelVisible = true;
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = true;

    currentNotifications = await fetchNotifications();
    const unreadCount = currentNotifications.filter((n) => !n.read).length;
    updateBadge(unreadCount);

    if (currentNotifications.length === 0) {
        if (emptyEl) emptyEl.hidden = false;
        return;
    }

    for (const notif of currentNotifications) {
        listEl.appendChild(renderNotificationItem(notif, i18n));
    }
}

function closePanel() {
    if (!panelEl) return;
    panelEl.hidden = true;
    panelVisible = false;
}

function buildButton(i18n) {
    const wrap = document.createElement("div");
    wrap.className = "notification-panel-wrap";

    const btn = document.createElement("button");
    btn.id = "notification-toggle";
    btn.className = "notification-button";
    btn.setAttribute("aria-label", i18n.t("ui.layout.notifications.aria"));
    btn.setAttribute("type", "button");
    btn.innerHTML =
        '<span class="notification-badge-wrap">' +
        '<span class="notification-icon" aria-hidden="true">🔔</span>' +
        '<span id="notification-count" class="notification-count" hidden>0</span>' +
        "</span>";

    badgeEl = btn.querySelector("#notification-count");

    const panel = document.createElement("div");
    panel.className = "notification-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", i18n.t("ui.layout.notifications.aria"));

    const header = document.createElement("div");
    header.className = "notification-panel-header";

    const title = document.createElement("h2");
    title.className = "notification-panel-title";
    title.textContent = i18n.t("ui.reuse.notifications");
    header.appendChild(title);

    markAllBtn = document.createElement("button");
    markAllBtn.className = "notification-mark-all-read";
    markAllBtn.type = "button";
    markAllBtn.textContent = i18n.t("ui.adapter.notify.internal.mark_all_read");
    markAllBtn.addEventListener("click", async () => {
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
    });
    header.appendChild(markAllBtn);
    panel.appendChild(header);

    const list = document.createElement("ul");
    list.className = "notification-list";
    list.setAttribute("aria-live", "polite");
    panel.appendChild(list);
    listEl = list;

    const empty = document.createElement("p");
    empty.className = "notification-empty";
    empty.textContent = i18n.t("ui.adapter.notify.internal.empty");
    empty.hidden = true;
    panel.appendChild(empty);
    emptyEl = empty;

    panelEl = panel;
    wrap.appendChild(btn);
    wrap.appendChild(panel);

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

async function startPolling() {
    const count = await fetchCount();
    updateBadge(count);
    pollTimer = setInterval(async () => {
        if (panelVisible) return;
        const unread = await fetchCount();
        updateBadge(unread);
    }, POLL_INTERVAL_MS);
}

(async function init() {
    if (!localStorage.getItem("cognis_token")) return;

    injectStyles();

    const i18n = await createI18n();

    const wrap = buildButton(i18n);
    insertButton(wrap);

    await startPolling();
})();
