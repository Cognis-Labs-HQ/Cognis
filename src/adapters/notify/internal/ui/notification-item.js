import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatRelativeTime } from "/static/reuse/timestamp.js";

export function renderNotificationItem(notif, i18n, actions) {
    const item = document.createElement("li");
    item.className = `notification-item ${notif.read ? "notification-item--read" : "notification-item--unread"}${notif.actionUrl ? " notification-item--linked" : ""}`;
    item.dataset.id = notif.id;
    item.dataset.searchCategory = "Notifications";
    item.dataset.searchLabel = notif.subject;
    item.dataset.searchText = [notif.subject, notif.senderName, notif.body]
        .filter(Boolean)
        .join(" ");
    item.innerHTML =
        '<span class="notification-item-dot" aria-hidden="true"></span>' +
        '<span class="notification-item-body">' +
        `<span class="notification-item-subject">${escapeHtml(notif.subject)}</span>` +
        `<span class="notification-item-sender">${escapeHtml(notif.senderName ?? i18n.t("ui.reuse.system"))}</span>` +
        `<span class="notification-item-preview">${escapeHtml(notif.body)}</span>` +
        "</span>" +
        `<span class="notification-item-time" data-relative-time="${notif.createdAt}">${escapeHtml(formatRelativeTime(notif.createdAt))}</span>` +
        actions.renderActions(notif) +
        (notif.actionUrl
            ? '<span class="notification-item-link-arrow" aria-hidden="true">&#8250;</span>'
            : "") +
        `<button class="notification-dismiss" data-search-exclude="true" type="button" aria-label="${i18n.t("ui.reuse.remove")}">&#215;</button>`;
    item.addEventListener("click", async (event) => {
        if (
            !item.isConnected ||
            !actions.isCurrent() ||
            event.target.closest(".notification-dismiss")
        )
            return;
        const actionButton = event.target.closest("[data-notification-action]");
        if (actionButton instanceof HTMLElement) {
            actions.dispatchAction(
                notif,
                actionButton.dataset.notificationAction,
            );
            return;
        }
        if (!notif.read) {
            const accepted = await actions.change("read", notif.id, item);
            if (!accepted && !item.isConnected) return;
        }
        if (notif.actionUrl) actions.navigate(notif.actionUrl);
    });
    item.querySelector(".notification-dismiss").addEventListener(
        "click",
        async (event) => {
            event.stopPropagation();
            if (!item.isConnected || !actions.isCurrent()) return;
            await actions.change("dismiss", notif.id, item);
        },
    );
    return item;
}
