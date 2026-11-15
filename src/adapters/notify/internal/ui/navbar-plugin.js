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
 * Public exports: mountProvider — owns the bell and inbox for its provider lifetime.
 *
 * @module notify-internal/navbar-plugin
 */
import { transientSurfaces } from "/static/reuse/transient-surfaces.js";
import { createI18n } from "/static/reuse/i18n.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatRelativeTime } from "/static/reuse/timestamp.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { renderNotificationItem as renderItem } from "./notification-item.js";
import {
    navigateNotif,
    renderNotificationActions,
    dispatchNotificationAction,
    isNotificationOwnedByCurrentPage,
    decryptRoomMessage,
    parseRoomId,
    localizeNotification,
} from "./notification-content.js";
import { createArrivalLifetime } from "./arrival-lifetime.js";
import { createCorrelationResolver } from "./correlation.js";
import { createInbox } from "./inbox.js";
import { loadNotificationStyles } from "./stylesheet.js";
import {
    createPrimaryAction,
    claimPrimaryActivation,
    setControlsDisabled,
} from "./reuse/primary-action.js";

const POLL_INTERVAL_VISIBLE_MS = 10_000;
const POLL_INTERVAL_HIDDEN_MS = 30_000;
const TOAST_BODY_PREVIEW_LENGTH = 90;
const TOAST_AUTO_DISMISS_MS = 6_000;
const RELATIVE_TIME_TICK_MS = 1000;

export async function mountProvider(ctx) {
    if (ctx.signal.aborted || !localStorage.getItem("cognis_access_token"))
        return;
    const lifetime = new AbortController();
    const signal = lifetime.signal;
    let identity = accountIdentity();
    let wrap;
    let observer;
    let inbox;
    let correlations;
    let disposed = false;
    let i18n;
    let pageRevision = 0;
    let confirmationPending = false;
    let dismissStyleError;

    function accountIdentity() {
        return JSON.stringify([
            localStorage.getItem("cognis_account"),
            localStorage.getItem("cognis_access_token"),
        ]);
    }

    function isActive() {
        if (disposed || signal.aborted || ctx.signal.aborted) return false;
        if (wrap && !wrap.isConnected) {
            dispose();
            return false;
        }
        if (identity !== accountIdentity()) {
            identity = accountIdentity();
            resetPage();
            return false;
        }
        return !!localStorage.getItem("cognis_access_token");
    }

    function resetPage() {
        pageRevision++;
        correlations?.reset();
        arrivalLifetime.clear();
        for (const timer of toastTimers) clearTimeout(timer);
        toastTimers.clear();
        confirmationPending = false;
        closePanel();
        arrivalToastContainer?.remove();
        arrivalToastContainer = null;
        seenIds = null;
        inbox?.reset();
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        lifetime.abort();
        dismissStyleError?.();
        closePanel();
        inbox?.dispose();
        correlations?.reset();
        arrivalLifetime.clear();
        clearTimeout(pollTimer);
        for (const timer of toastTimers) clearTimeout(timer);
        observer?.disconnect();
        unregisterSearch?.();
        wrap?.remove();
        arrivalToastContainer?.remove();
        currentNotifications = [];
    }

    function reportError(key) {
        showToast(i18n.t(`adapter.notify.internal.${key}`), {
            variant: "error",
        });
    }

    async function changeNotification(operation, id, isCurrent = () => true) {
        const accepted = await inbox.mutate(operation, id, isCurrent);
        if (accepted) await inbox.read({ afterMutation: true });
        return accepted;
    }

    let panelVisible = false;
    let panelController;
    let pollTimer = null;
    let relativeTimeTimer = null;
    let badgeEl = null;
    let panelEl = null;
    let listEl = null;
    let emptyEl = null;
    let markAllBtn = null;
    let retryBtn = null;
    let renderedRows = null;
    const toastTimers = new Set();
    let clearAllBtn = null;
    let mobileBackdropEl = null;
    let currentNotifications = [];
    let seenIds = null;
    let relativeTimeNodes = [];
    const arrivalLifetime = createArrivalLifetime({
        getRows: () => currentNotifications,
        isActive,
        refresh: (notification) => {
            void showArrivalToast(notification, i18n);
        },
    });

    let unregisterSearch;

    function collectNotificationSearchGroups() {
        if (!isActive()) return [];
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
        if (!panelVisible || relativeTimeTimer !== null || !listEl) return;
        relativeTimeNodes = Array.from(
            listEl.querySelectorAll("[data-relative-time]"),
        );
        relativeTimeTimer = setInterval(
            tickRelativeTimes,
            RELATIVE_TIME_TICK_MS,
        );
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

    function synchronize() {
        currentNotifications = inbox.rows ?? [];
        arrivalLifetime.reconcile();
        updateBadge(
            currentNotifications.filter(
                (notification) =>
                    !notification.read &&
                    notification.metadata?.continuous !== true,
            ).length,
        );
        if (clearAllBtn)
            clearAllBtn.disabled =
                inbox.pending ||
                inbox.failed ||
                confirmationPending ||
                currentNotifications.length === 0;
        if (markAllBtn)
            markAllBtn.disabled =
                inbox.pending ||
                inbox.failed ||
                !currentNotifications.some(
                    (notification) => !notification.read,
                );
        if (retryBtn) {
            retryBtn.hidden = !inbox.failed;
            retryBtn.disabled = inbox.pending;
        }
        if (panelEl)
            panelEl.dataset.inboxState =
                inbox.rows === null ? "unavailable" : "confirmed";
        if (listEl) listEl.setAttribute("aria-busy", String(inbox.pending));
        if (renderedRows !== inbox.rows) {
            renderedRows = inbox.rows;
            renderPanelContents(i18n);
        } else {
            setControlsDisabled(
                listEl,
                !panelVisible || inbox.pending || inbox.failed,
            );
        }
    }

    function renderNotificationItem(notif, i18n) {
        const opening = panelController;
        return renderItem(notif, i18n, {
            renderActions: renderNotificationActions,
            dispatchAction: dispatchNotificationAction,
            isCurrent: () =>
                isActive() &&
                panelVisible &&
                opening === panelController &&
                !opening.signal.aborted &&
                !inbox.pending &&
                !inbox.failed,
            change: (operation, id, item) =>
                changeNotification(
                    operation,
                    id,
                    () =>
                        item.isConnected &&
                        panelVisible &&
                        opening === panelController &&
                        !opening.signal.aborted,
                ),
            navigate: (url) => {
                if (
                    !isActive() ||
                    !panelVisible ||
                    opening !== panelController ||
                    opening.signal.aborted
                )
                    return;
                closePanel();
                navigateNotif(url);
            },
        });
    }

    async function openPanel(i18n) {
        if (!panelEl || !listEl || !isActive()) return;
        closeProfileMenu();
        panelController?.abort();
        panelController = new AbortController();
        transientSurfaces.register(panelEl, closePanel, panelController.signal);
        panelEl.hidden = false;
        if (mobileBackdropEl) mobileBackdropEl.hidden = false;
        panelVisible = true;
        const opening = panelController;
        renderPanelContents(i18n);
        await inbox.read({
            isCurrent: () =>
                opening === panelController && !opening.signal.aborted,
        });
    }

    function renderPanelContents(i18n) {
        if (!listEl) return;
        setControlsDisabled(listEl, true);
        listEl.innerHTML = "";
        if (emptyEl) emptyEl.hidden = true;

        if (panelVisible)
            currentNotifications.forEach((n) => seenIds?.add(n.id));
        const panelNotifications = currentNotifications.filter(
            (notification) => notification.metadata?.continuous !== true,
        );
        const unreadCount = panelNotifications.filter((n) => !n.read).length;
        updateBadge(unreadCount);

        if (panelNotifications.length === 0) {
            if (emptyEl) emptyEl.hidden = inbox.rows === null;
            stopRelativeTimeTicker();
            return;
        }

        for (const notif of panelNotifications) {
            listEl.appendChild(renderNotificationItem(notif, i18n));
        }

        setControlsDisabled(
            listEl,
            !panelVisible || inbox.pending || inbox.failed,
        );
        stopRelativeTimeTicker();
        startRelativeTimeTicker();
    }

    function closePanel() {
        panelController?.abort();
        confirmationPending = false;
        if (!panelEl) return;
        setControlsDisabled(listEl, true);
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
        observer = new MutationObserver(() => {
            if (!isActive()) return;
            if (profileMenu.classList.contains("open") && panelVisible) {
                closePanel();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
        });
        signal.addEventListener("abort", () => observer.disconnect(), {
            once: true,
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
            '<span class="notification-icon" aria-hidden="true"><img src="/static/assets/reuse/bell.svg" alt="" class="notification-icon-img" /></span>' +
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
        markAllBtn.textContent = i18n.t(
            "adapter.notify.internal.mark_all_read",
        );
        markAllBtn.addEventListener(
            "click",
            () => {
                if (!isActive() || inbox.pending || !panelVisible) return;
                const opening = panelController;
                void changeNotification(
                    "readAll",
                    undefined,
                    () =>
                        markAllBtn.isConnected &&
                        opening === panelController &&
                        !opening.signal.aborted,
                );
            },
            { signal },
        );
        header.appendChild(markAllBtn);

        clearAllBtn = document.createElement("button");
        clearAllBtn.className = "notification-clear-all";
        clearAllBtn.type = "button";
        clearAllBtn.setAttribute(
            "aria-label",
            i18n.t("adapter.notify.internal.clear_all"),
        );
        clearAllBtn.title = i18n.t("adapter.notify.internal.clear_all");
        clearAllBtn.disabled = true;
        clearAllBtn.innerHTML = "&#x1F5D1;";
        clearAllBtn.addEventListener(
            "click",
            async () => {
                if (
                    !isActive() ||
                    inbox.pending ||
                    !panelVisible ||
                    currentNotifications.length === 0 ||
                    clearAllBtn.disabled
                )
                    return;
                const opening = panelController;
                confirmationPending = true;
                synchronize();
                const result = await openPopup({
                    title: i18n.t("adapter.notify.internal.clear_all"),
                    body: escapeHtml(
                        i18n.t(
                            "adapter.notify.internal.clear_all_confirm_body",
                        ),
                    ),
                    variant: "danger",
                    signal: opening.signal,
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
                if (
                    !isActive() ||
                    opening !== panelController ||
                    opening.signal.aborted
                )
                    return;
                confirmationPending = false;
                synchronize();
                if (result === "confirm")
                    await changeNotification(
                        "clear",
                        undefined,
                        () =>
                            clearAllBtn.isConnected &&
                            opening === panelController &&
                            !opening.signal.aborted,
                    );
            },
            { signal },
        );
        header.appendChild(clearAllBtn);

        retryBtn = document.createElement("button");
        retryBtn.className = "notification-retry btn-neutral";
        retryBtn.type = "button";
        retryBtn.textContent = i18n.t("ui.reuse.retry");
        retryBtn.hidden = true;
        retryBtn.addEventListener(
            "click",
            () => {
                if (isActive() && panelVisible) void inbox.read();
            },
            { signal },
        );
        header.appendChild(retryBtn);
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

        document.addEventListener(
            "click",
            (e) => {
                if (panelVisible && !wrap.contains(e.target)) {
                    closePanel();
                }
            },
            { signal },
        );

        document.addEventListener(
            "keydown",
            (e) => {
                if (e.key === "Escape" && panelVisible) closePanel();
            },
            { signal },
        );

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

    async function pollInbox() {
        if (!isActive()) return;
        const previouslySeen = seenIds === null ? null : new Set(seenIds);
        const result = await inbox.read();
        if (!result || !isActive()) return;
        const initial = previouslySeen === null;
        const arrivals = result.rows.filter((notif) =>
            initial
                ? !notif.read && notif.metadata?.continuous === true
                : !previouslySeen.has(notif.id),
        );
        seenIds = new Set(result.rows.map((notif) => notif.id));
        for (const notif of arrivals) {
            window.dispatchEvent(
                new CustomEvent("cognis:notification-arrival", {
                    detail: { notification: notif },
                }),
            );
            if (
                !notif.read &&
                (notif.metadata?.continuous === true ||
                    (!panelVisible && !isNotificationOwnedByCurrentPage(notif)))
            )
                void showArrivalToast(notif, i18n);
        }
    }

    async function startPolling() {
        function scheduleNext() {
            if (disposed || signal.aborted) return;
            const delay =
                document.visibilityState === "visible"
                    ? POLL_INTERVAL_VISIBLE_MS
                    : POLL_INTERVAL_HIDDEN_MS;
            pollTimer = setTimeout(tick, delay);
        }
        async function tick() {
            await pollInbox();
            scheduleNext();
        }
        await pollInbox();
        scheduleNext();
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
            window.addEventListener("resize", updateNavBottom, {
                passive: true,
                signal,
            });
        }

        if (cachedNavBottom > 0) {
            arrivalToastContainer.style.top = `${Math.round(cachedNavBottom) + 8}px`;
        }

        return arrivalToastContainer;
    }

    async function markArrivalRead(notif) {
        const current = currentNotifications.find(
            (notification) => notification.id === notif.id,
        );
        if (current && !current.read && isActive())
            await changeNotification("read", notif.id);
    }

    async function showArrivalToast(notif, i18n) {
        if (!isActive()) return;
        const expectedIdentity = identity;
        const expectedPage = pageRevision;
        const arrival = arrivalLifetime.begin(notif);
        const container = getArrivalToastContainer();
        const toast = document.createElement("div");
        toast.className = "arrival-toast";
        toast.setAttribute("role", "alert");
        const correlationId = String(notif.metadata?.correlationId ?? "");
        if (correlationId) {
            toast.dataset.notificationCorrelation = correlationId;
        }

        let toastSubject = notif.subject;
        let toastPreview = notif.body;
        if (notif.category === "messages") {
            const genericMessage = i18n.t(
                "adapter.notify.internal.new_message",
            );
            toastSubject = genericMessage;
            toastPreview = genericMessage;
            const roomId = parseRoomId(notif.actionUrl);
            if (roomId) {
                try {
                    const decryptedPreview = await decryptRoomMessage(roomId, {
                        accessToken: localStorage.getItem(
                            "cognis_access_token",
                        ),
                        signal,
                        isCurrent: () =>
                            arrival.isCurrent() &&
                            expectedIdentity === identity &&
                            expectedPage === pageRevision &&
                            container === arrivalToastContainer,
                    });
                    if (decryptedPreview) toastPreview = decryptedPreview;
                } catch (error) {
                    const log = ctx.capabilities.get("ui:log");
                    log?.("error", "Notification preview unavailable.", {
                        component: "notify-internal",
                        operation: "messagePreview",
                        errorName: error?.name,
                    });
                    if (arrival.isCurrent() && expectedPage === pageRevision)
                        reportError("error_preview");
                }
            }
        }

        if (
            !arrival.isCurrent() ||
            expectedIdentity !== identity ||
            expectedPage !== pageRevision ||
            container !== arrivalToastContainer
        )
            return;
        const preview =
            toastPreview.length > TOAST_BODY_PREVIEW_LENGTH
                ? toastPreview.slice(0, TOAST_BODY_PREVIEW_LENGTH) + "\u2026"
                : toastPreview;

        const sender = notif.senderName ?? i18n.t("ui.reuse.system");

        const isPersistent = notif.metadata?.continuous === true;
        toast.classList.toggle("arrival-toast--persistent", isPersistent);
        const primary = createPrimaryAction({
            actionUrl: notif.actionUrl,
            subject: toastSubject,
            buttonLabel: i18n.t("adapter.notify.internal.open_inbox"),
            content:
                '<span class="arrival-toast-icon" aria-hidden="true">\uD83D\uDD14</span>' +
                '<span class="arrival-toast-text">' +
                `<span class="arrival-toast-subject">${escapeHtml(toastSubject)}</span>` +
                `<span class="arrival-toast-sender">${escapeHtml(sender)}</span>` +
                `<span class="arrival-toast-preview">${escapeHtml(preview)}</span>` +
                "</span>",
        });
        toast.appendChild(primary);
        toast.insertAdjacentHTML(
            "beforeend",
            isPersistent
                ? renderNotificationActions(notif)
                : `<button class="arrival-toast-dismiss" type="button" aria-label="${escapeHtml(i18n.t("ui.reuse.dismiss"))}">&#215;</button>`,
        );

        const dismiss = () => {
            arrival.release();
            setControlsDisabled(toast, true);
            toast.classList.add("arrival-toast--out");
            toast.addEventListener("animationend", () => toast.remove(), {
                once: true,
            });
        };

        const isCurrent = () =>
            arrival.isCurrent() &&
            toast.isConnected &&
            !toast.classList.contains("arrival-toast--out");
        toast.addEventListener("auxclick", (event) => {
            if (primary.contains(event.target))
                claimPrimaryActivation(event, primary, isCurrent);
        });
        toast.addEventListener("click", (e) => {
            const actionButton = e.target.closest("[data-notification-action]");
            if (actionButton instanceof HTMLElement) {
                e.stopPropagation();
                if (!isCurrent()) return;
                dismiss();
                void markArrivalRead(notif);
                dispatchNotificationAction(
                    notif,
                    actionButton.dataset.notificationAction,
                );
                return;
            }
            if (e.target.closest(".arrival-toast-dismiss")) return;
            if (!claimPrimaryActivation(e, primary, isCurrent)) return;
            dismiss();
            markArrivalRead(notif);
            if (primary.tagName === "A") {
                navigateNotif(notif.actionUrl);
            } else {
                openPanel(i18n);
            }
        });

        toast
            .querySelector(".arrival-toast-dismiss")
            ?.addEventListener("click", (e) => {
                e.stopPropagation();
                if (isCurrent()) dismiss();
            });

        container.appendChild(toast);
        const metadata = notif.metadata ?? {};
        const remaining = Number(metadata.expiresAt) - Date.now();
        const delay = isPersistent
            ? Math.max(0, Number.isFinite(remaining) ? remaining : 0)
            : TOAST_AUTO_DISMISS_MS;
        const timer = setTimeout(function expireToast() {
            toastTimers.delete(timer);
            if (isActive()) dismiss();
        }, delay);
        toastTimers.add(timer);
        arrival.attach(toast, () => {
            setControlsDisabled(toast, true);
            clearTimeout(timer);
            toastTimers.delete(timer);
        });
    }

    ctx.signal.addEventListener("abort", dispose, { once: true });
    window.addEventListener("pagehide", dispose, { signal });
    window.addEventListener("storage", () => isActive(), { signal });
    try {
        const styleStatus = await loadNotificationStyles(signal);
        if (!isActive()) return dispose;
        i18n = await createI18n({
            componentStringBaseUrls: [
                "/static/gateways/notify-internal/languages",
            ],
        });
        if (!isActive()) return dispose;
        if (styleStatus !== "loaded") {
            dismissStyleError = showToast(
                i18n.t("adapter.notify.internal.error_styles"),
                { variant: "error" },
            );
        }
        inbox = createInbox({
            ctx,
            localize: localizeNotification,
            isActive,
            onChange: synchronize,
            reportError,
        });
        correlations = createCorrelationResolver({
            inbox,
            isActive,
            generation: () => pageRevision,
            change: changeNotification,
            reportError,
            log: ctx.capabilities.get("ui:log"),
            clearPresentation: (correlationId) =>
                arrivalLifetime.clearCorrelation(correlationId),
        });
        wrap = buildButton(i18n);
        insertButton(wrap);
        if (!isActive()) return dispose;
        unregisterSearch = registerSearchIndex(
            "notifications",
            collectNotificationSearchGroups,
        );
        watchProfileMenu();
        window.addEventListener(
            "cognis:notification-resolved",
            (event) => {
                correlations.resolve(String(event.detail?.correlationId ?? ""));
            },
            { signal },
        );
        ctx.extendFlow(
            "logout",
            "revokeSession",
            { id: "notify-internal:logout", order: -1000 },
            dispose,
        );
        ctx.extendFlow(
            "authenticate-session",
            "afterSession",
            { id: "notify-internal:session" },
            () => {
                isActive();
            },
        );
        ctx.extendFlow(
            "page:mounted",
            "publish",
            { id: "notify-internal:page" },
            () => {
                resetPage();
                void pollInbox();
            },
        );
        synchronize();
        await startPolling();
        return dispose;
    } catch (error) {
        dispose();
        throw error;
    }
}
