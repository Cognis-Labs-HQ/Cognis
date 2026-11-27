import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatRelativeTime } from "/static/reuse/timestamp.js";

export function renderNotificationItem(notification, i18n, actions) {
    const item = document.createElement("li");
    item.className = `notification-item ${notification.read ? "notification-item--read" : "notification-item--unread"}${notification.actionUrl ? " notification-item--linked" : ""}`;
    item.dataset.id = notification.id;
    item.dataset.searchCategory = "Notifications";
    item.dataset.searchLabel = notification.subject;
    item.dataset.searchText = [
        notification.subject,
        notification.senderName,
        notification.body,
    ]
        .filter(Boolean)
        .join(" ");
    item.innerHTML =
        '<span class="notification-item-dot" aria-hidden="true"></span>' +
        '<span class="notification-item-body">' +
        `<span class="notification-item-subject">${escapeHtml(notification.subject)}</span>` +
        `<span class="notification-item-sender">${escapeHtml(notification.senderName ?? i18n.t("ui.reuse.system"))}</span>` +
        `<span class="notification-item-preview">${escapeHtml(notification.body)}</span>` +
        "</span>" +
        `<span class="notification-item-time" data-relative-time="${notification.createdAt}">${escapeHtml(formatRelativeTime(notification.createdAt))}</span>` +
        actions.renderActions(notification) +
        (notification.actionUrl
            ? '<span class="notification-item-link-arrow" aria-hidden="true">&#8250;</span>'
            : "") +
        `<button class="notification-dismiss" data-search-exclude="true" type="button" aria-label="${i18n.t("ui.reuse.remove")}">&#215;</button>`;
    item.addEventListener("click", async (event) => {
        if (event.target.closest(".notification-dismiss")) return;
        const actionButton = event.target.closest("[data-notification-action]");
        if (actionButton instanceof HTMLElement) {
            actions.dispatchAction(
                notification,
                actionButton.dataset.notificationAction,
            );
            return;
        }
        if (!notification.read) {
            try {
                await actions.markRead(notification.id);
                item.classList.replace(
                    "notification-item--unread",
                    "notification-item--read",
                );
                notification.read = true;
                await actions.refreshCount();
            } catch {
                actions.reportError("adapter.notify.internal.error_mark_read");
            }
        }
        if (notification.actionUrl) actions.navigate(notification.actionUrl);
    });
    item.querySelector(".notification-dismiss").addEventListener(
        "click",
        async (event) => {
            event.stopPropagation();
            try {
                await actions.dismiss(notification.id);
                item.remove();
                actions.afterDismiss(notification.id);
            } catch {
                actions.reportError("adapter.notify.internal.error_dismiss");
            }
        },
    );
    return item;
}
