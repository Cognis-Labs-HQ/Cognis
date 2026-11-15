import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatRelativeTime } from "/static/reuse/timestamp.js";

import {
    resolveDestination,
    createPrimaryAction,
    claimPrimaryActivation,
} from "./reuse/primary-action.js";

export function renderNotificationItem(notif, i18n, actions) {
    const linked = resolveDestination(notif.actionUrl) !== null;
    const item = document.createElement("li");
    item.className = `notification-item ${notif.read ? "notification-item--read" : "notification-item--unread"}${linked ? " notification-item--linked" : ""}`;
    item.dataset.id = notif.id;
    item.dataset.searchCategory = "Notifications";
    item.dataset.searchLabel = notif.subject;
    item.dataset.searchText = [notif.subject, notif.senderName, notif.body]
        .filter(Boolean)
        .join(" ");
    const primary = createPrimaryAction({
        actionUrl: notif.actionUrl,
        subject: notif.subject,
        buttonLabel:
            notif.read || linked
                ? null
                : i18n.t("adapter.notify.internal.mark_read"),
        content:
            '<span class="notification-item-dot" aria-hidden="true"></span>' +
            '<span class="notification-item-body">' +
            `<span class="notification-item-subject">${escapeHtml(notif.subject)}</span>` +
            `<span class="notification-item-sender">${escapeHtml(notif.senderName ?? i18n.t("ui.reuse.system"))}</span>` +
            `<span class="notification-item-preview">${escapeHtml(notif.body)}</span>` +
            "</span>" +
            `<span class="notification-item-time" data-relative-time="${notif.createdAt}">${escapeHtml(formatRelativeTime(notif.createdAt))}</span>` +
            (linked
                ? '<span class="notification-item-link-arrow" aria-hidden="true">&#8250;</span>'
                : ""),
    });
    item.appendChild(primary);
    item.insertAdjacentHTML(
        "beforeend",
        actions.renderActions(notif) +
            `<button class="notification-dismiss" data-search-exclude="true" type="button" aria-label="${escapeHtml(i18n.t("ui.reuse.remove"))}">&#215;</button>`,
    );
    const isCurrent = () => item.isConnected && actions.isCurrent();
    item.addEventListener("auxclick", (event) => {
        if (primary.contains(event.target))
            claimPrimaryActivation(event, primary, isCurrent);
    });
    item.addEventListener("click", async (event) => {
        if (event.target.closest(".notification-dismiss")) return;
        const actionButton = event.target.closest("[data-notification-action]");
        if (actionButton instanceof HTMLElement) {
            event.stopPropagation();
            if (!isCurrent()) return;
            actions.dispatchAction(
                notif,
                actionButton.dataset.notificationAction,
            );
            return;
        }
        if (!claimPrimaryActivation(event, primary, isCurrent)) return;
        if (!notif.read) {
            const accepted = await actions.change("read", notif.id, item);
            if (!accepted && !item.isConnected) return;
        }
        if (linked) actions.navigate(notif.actionUrl);
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
