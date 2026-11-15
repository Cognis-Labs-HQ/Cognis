/**
 * Reusable popup / modal dialog.
 *
 * Renders a modal overlay and returns a Promise that resolves with the `id` of
 * the action the user clicked, or `null` when the popup is dismissed via the
 * backdrop, the × close button, or the Escape key.
 *
 * The action descriptor array mirrors the page-composer `elements` pattern:
 * each entry is a plain object with `id`, `label`, and an optional `variant`.
 *
 * This module keeps /static/styles/popup.css in browser Cache Storage and
 * injects the cached CSS when a popup opens, so dialogs remain styled through
 * temporary server interruptions.
 *
 * Public exports:
 *   primePopupStylesheet() — refreshes the browser-cached popup stylesheet.
 *   openPopup(options) — opens a modal and returns a Promise<string|null>.
 *   createAnchoredPopup(options) — returns a controller for a non-modal popup
 *     positioned beside an anchor element.
 *
 * Usage:
 *   import { openPopup, primePopupStylesheet } from '../../reuse/popup.js';
 *
 *   void primePopupStylesheet();
 *   const result = await openPopup({
 *     title: 'Disable module',
 *     body: `Are you sure you want to disable "my-module"?`,
 *     variant: 'danger',
 *     actions: [
 *       { id: 'confirm', label: 'Disable', variant: 'cancel' },
 *       { id: 'cancel',  label: 'Cancel',  variant: 'neutral' },
 *     ],
 *   });
 *   if (result === 'confirm') { ... }
 *
 * Options:
 *   title    — heading text (rendered as plain text, HTML-escaped).
 *   titleDetail — optional secondary heading text rendered smaller beside the title.
 *   titleDetailItems — optional ordered `{ label, actionId?, placement? }` secondary heading fragments.
 *   headingLayout — "inline" (default) or "annotated" with aside/below detail placements.
 *   titleLeading — optional trusted HTML rendered immediately before the title.
 *   titleAction — optional `{ id, label }` that renders the heading as an action.
 *   titleItems — optional ordered `{ label, actionId? }` title fragments.
 *   body     — body content: either an HTML string or a `() => string` render
 *              function. Rendered as innerHTML; callers must escape dynamic values.
 *   variant  — visual style hint: 'info' | 'warning' | 'danger' | 'confirm'.
 *              Defaults to 'info'.
 *   actions  — Array<{ id: string, label: string, variant?: 'confirm' | 'cancel' | 'neutral', disabled?: boolean, icon?: { light: string, dark?: string, position?: 'before' | 'after', flip?: boolean } }>.
 *              When omitted, a single neutral 'Done' button is rendered. An empty array renders no footer actions.
 *   closeButtonVariant — Optional variant for the × header close button.
 *   mandatory — When true, hides the header close button and disables
 *              backdrop and Escape-key dismissal. Explicit actions still work.
 *   maxWidth — CSS max-width value (e.g. '40%', '600px') applied to the dialog
 *              window. Defaults to the CSS-defined value (480px).
 *
 *   onOpen   — Optional callback invoked with the popup overlay element immediately
 *              after it is appended to the document body. Use this to bind event
 *              handlers on elements rendered inside the popup body before the
 *              fade-in animation begins.
 *
 *   onAction — Optional async/sync callback invoked before dismissal when an
 *              action button is clicked. Return `false` to keep the popup open.
 *
 *   closeProtection — When true, intercepts cancel-path dismissals (backdrop
 *              click, × button, Escape key). If any input/textarea/select has
 *              been changed from its initial value, a confirmation popup is shown
 *              before the original popup is dismissed. Strings are resolved
 *              internally from the user's active locale.
 *
 *   timeoutMs        — Optional. When set, the popup automatically dismisses
 *              itself with `timeoutActionId` after this many milliseconds if
 *              the user has not already responded. The timer is cleared as
 *              soon as any dismissal path runs.
 *   timeoutActionId  — Action id to resolve with when `timeoutMs` elapses.
 *              Defaults to `null` (same as a cancel-path dismissal). If an
 *              action button with this id is rendered, its label is
 *              suffixed with a live "(Ns)" countdown that ticks down every
 *              second until the timeout fires, so the user can see the
 *              action will happen automatically.
 *
 * @param {{
 *   title: string,
 *   titleDetail?: string,
 *   headingLayout?: "inline" | "annotated",
 *   titleDetailItems?: Array<{ label: string, actionId?: string, placement?: string }>,
 *   titleLeading?: string,
 *   titleAction?: { id: string, label: string },
 *   titleItems?: Array<{ label: string, actionId?: string }>,
 *   stackTitleDetailOnOverflow?: boolean,
 *   headerActions?: Array<{ id: string, label: string, icon?: string | { light: string, dark?: string } }>,
 *   body: string | (() => string),
 *   variant?: 'info' | 'warning' | 'danger' | 'confirm',
 *   actions?: Array<{ id: string, label: string, variant?: string, disabled?: boolean, icon?: { light: string, dark?: string, position?: 'before' | 'after', flip?: boolean } }>,
 *   maxWidth?: string,
 *   onOpen?: (overlay: HTMLElement, dismiss: () => void, api: PopupApi) => void,
 *   onAction?: (actionId: string | null, overlay: HTMLElement, api: PopupApi) => Promise<boolean | void> | boolean | void,
 *   closeProtection?: boolean,
 *   signal?: AbortSignal,
 *   timeoutMs?: number,
 *   timeoutActionId?: string | null,
 *   closeButtonVariant?: 'cancel' | 'neutral',
 *   mandatory?: boolean,
 * }} options
 * @returns {Promise<string|null>}
 */

import {
    createPopupContentApi,
    bindPopupActionIcons,
} from "./popup/content.js";
import { bindPopupFocus } from "./popup/focus.js";
import {
    renderPopupActions,
    isPopupControlAvailable,
    popupEnterAction,
} from "./popup/controls.js";
import { confirmPopupDiscard } from "./popup/discard-confirmation.js";
import { createI18n } from "./i18n.js";
import { lockPageScroll } from "./page-scroll-lock.js";
import { createFormDirtyTracker } from "./unsaved-changes.js";

/** @typedef {ReturnType<typeof createPopupContentApi> & {updateBody: (body: string | (() => string)) => HTMLElement | null, setPage: (id: string) => boolean, pageId?: string, markDirty: () => void, requestClose?: () => void}} PopupApi */

import { uiCtx } from "./ui-ctx.js";
import { showToast } from "./toast.js";
import {
    popupPreparation,
    waitForPopupPreparation,
} from "./popup/preparation.js";

let i18nReady = null;

function getI18n() {
    // Store the Promise, not the resolved value, so concurrent calls
    // before resolution share the same deferred.
    if (!i18nReady)
        i18nReady = createI18n().catch((error) => {
            i18nReady = null;
            throw error;
        });
    return i18nReady;
}

/** @returns {Promise<void>} Complete-sheet cache refresh; failures are logged. */
export function primePopupStylesheet() {
    return popupPreparation(uiCtx).primeStylesheet();
}

async function preparePopup(signal, requiresLocale = true) {
    let failure;
    try {
        await waitForPopupPreparation(
            popupPreparation(uiCtx).ensureStylesheet(),
            signal,
        );
    } catch (error) {
        failure = error;
    }
    if (signal?.aborted) return null;
    if (!failure && !requiresLocale) return true;
    const i18n = await waitForPopupPreparation(getI18n(), signal);
    if (signal?.aborted) return null;
    if (failure) {
        const message = i18n.t("ui.reuse.error");
        popupPreparation(uiCtx).reportFailure(failure, () => {
            showToast(message, { variant: "error" });
        });
        throw failure;
    }
    return i18n;
}

function positionAnchoredPopup(anchorElement, popupElement) {
    const anchorBounds = anchorElement.getBoundingClientRect();
    popupElement.style.left = "0";
    popupElement.style.top = "0";
    popupElement.hidden = false;
    const popupBounds = popupElement.getBoundingClientRect();
    const viewportPadding = 8;
    const popupGap = 8;
    let leftPosition =
        anchorBounds.left + anchorBounds.width / 2 - popupBounds.width / 2;
    leftPosition = Math.max(
        viewportPadding,
        Math.min(
            leftPosition,
            window.innerWidth - popupBounds.width - viewportPadding,
        ),
    );
    let topPosition = anchorBounds.bottom + popupGap;
    if (
        topPosition + popupBounds.height >
        window.innerHeight - viewportPadding
    ) {
        topPosition = anchorBounds.top - popupBounds.height - popupGap;
    }
    topPosition = Math.max(
        viewportPadding,
        Math.min(
            topPosition,
            window.innerHeight - popupBounds.height - viewportPadding,
        ),
    );
    popupElement.style.left = `${Math.round(leftPosition)}px`;
    popupElement.style.top = `${Math.round(topPosition)}px`;
}

export function createAnchoredPopup({
    className = "",
    role = "tooltip",
    tagName = "aside",
} = {}) {
    let popupElement = null;
    let anchorElement = null;
    let preparationController = null;

    function getPopupElement() {
        if (popupElement instanceof HTMLElement) {
            return popupElement;
        }
        popupElement = document.createElement(tagName);
        popupElement.className = className.trim();
        popupElement.setAttribute("role", role);
        popupElement.hidden = true;
        document.body.appendChild(popupElement);
        return popupElement;
    }

    function hide() {
        preparationController?.abort();
        preparationController = null;
        anchorElement = null;
        if (!(popupElement instanceof HTMLElement)) return;
        popupElement.hidden = true;
        popupElement.innerHTML = "";
    }

    return {
        show(anchor, body) {
            if (!(anchor instanceof HTMLElement)) return;
            preparationController?.abort();
            const controller = new AbortController();
            preparationController = controller;
            let resolvedBody = body ?? "";
            if (typeof body === "function") {
                try {
                    resolvedBody = body();
                } catch {
                    hide();
                    return;
                }
            }
            if (!resolvedBody) {
                hide();
                return;
            }
            void preparePopup(controller.signal, false).catch((error) => {
                if (controller.signal.aborted) return;
                hide();
                const log = console.error.bind(console);
                log("[popup] Anchored preparation failed", {
                    component: "ui.popup",
                    operation: "prepareAnchoredPopup",
                    errorName: error?.name,
                });
            });
            const element = getPopupElement();
            anchorElement = anchor;
            element.innerHTML = resolvedBody;
            positionAnchoredPopup(anchor, element);
        },
        hide,
        reposition() {
            if (
                !(anchorElement instanceof HTMLElement) ||
                !(popupElement instanceof HTMLElement) ||
                popupElement.hidden
            ) {
                return;
            }
            positionAnchoredPopup(anchorElement, popupElement);
        },
        destroy() {
            hide();
            popupElement?.remove();
            popupElement = null;
        },
    };
}

/**
 * Returns true if any input, textarea, or select within the element has been
 * changed from its initial (default) value.
 *
 * @param {HTMLElement} overlayElement - The popup overlay to inspect.
 * @returns {boolean} Whether any form field has an unsaved change.
 */
function hasUnsavedFormChanges(overlayElement) {
    const fields = overlayElement.querySelectorAll("input, textarea, select");
    for (const field of fields) {
        if (field instanceof HTMLInputElement) {
            if (field.type === "checkbox" || field.type === "radio") {
                if (field.checked !== field.defaultChecked) return true;
            } else if (field.value !== field.defaultValue) {
                return true;
            }
        } else if (
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
        ) {
            if (field.value !== field.defaultValue) return true;
        }
    }
    return false;
}

export async function openPopup({
    title,
    titleDetail,
    titleDetailItems,
    titleLeading,
    titleAction,
    titleItems,
    stackTitleDetailOnOverflow = false,
    headingLayout = "inline",
    headerActions = [],
    body,
    variant = "info",
    actions,
    maxWidth,
    onOpen,
    onAction,
    closeProtection = false,
    signal,
    timeoutMs = 0,
    timeoutActionId = null,
    closeButtonVariant = "cancel",
    mandatory = false,
    pages,
    initialPageId,
} = {}) {
    if (signal?.aborted) return null;
    const invoker = document.activeElement;
    const i18n = await preparePopup(signal);
    if (signal?.aborted) return null;
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "popup-overlay";
        const highestPopupZIndex = Array.from(
            document.querySelectorAll(".popup-overlay"),
            (candidate) => Number.parseInt(candidate.style.zIndex, 10) || 2000,
        ).reduce((highest, zIndex) => Math.max(highest, zIndex), 1990);
        overlay.style.zIndex = String(highestPopupZIndex + 10);
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        const headingId = `popup-title-${window.crypto.randomUUID()}`;
        overlay.setAttribute("aria-labelledby", headingId);
        let focusLifecycle;
        let closeProtectionTracker = null;
        let manuallyDirty = false;
        let releaseScroll;

        function escapeHtml(value) {
            return String(value)
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#39;");
        }

        function renderPopupHeading(
            titleValue,
            detailValue,
            actionValue,
            leadingValue,
            itemValues,
            detailItemValues,
        ) {
            const detail = String(detailValue ?? "");
            const renderHeadingItems = (items) => {
                const rendered = items.map((item) => {
                    const content = item.actionId
                        ? `<button class="popup-title-action btn-neutral" data-popup-action="${escapeHtml(item.actionId)}" type="button">${escapeHtml(item.label)}</button>`
                        : escapeHtml(item.label);
                    return { content, placement: item.placement };
                });
                const groups = [];
                for (const item of rendered) {
                    const previous = groups.at(-1);
                    if (
                        item.placement &&
                        previous?.placement === item.placement
                    )
                        previous.content += item.content;
                    else groups.push({ ...item });
                }
                return groups
                    .map(({ content, placement }) =>
                        placement
                            ? `<span data-popup-title-placement="${escapeHtml(placement)}">${content}</span>`
                            : content,
                    )
                    .join("");
            };
            const titleContent =
                Array.isArray(itemValues) && itemValues.length
                    ? renderHeadingItems(itemValues)
                    : actionValue
                      ? `<button class="popup-title-action btn-neutral" data-popup-action="${escapeHtml(actionValue.id)}" type="button">${escapeHtml(actionValue.label)}</button>`
                      : escapeHtml(titleValue ?? "");
            const detailContent =
                Array.isArray(detailItemValues) && detailItemValues.length
                    ? renderHeadingItems(detailItemValues)
                    : escapeHtml(detail);
            return `${leadingValue ? `<span class="popup-title-leading">${leadingValue}</span>` : ""}<h2 class="popup-title" id="${headingId}">${titleContent}</h2>${detailContent ? `<h4 class="popup-title-detail">${detailContent}</h4>` : ""}`;
        }

        let dismissed = false;
        let discardDecision;
        const discardController = new AbortController();
        let timeoutHandle = null;
        let countdownInterval = null;
        async function dismiss(actionId, aborted = false) {
            if (dismissed) return true;
            closeProtectionTracker?.sync();
            const hasUnsavedChanges =
                manuallyDirty ||
                (closeProtectionTracker?.isAnyDirty() ??
                    hasUnsavedFormChanges(overlay));
            if (
                (actionId === null || actionId === "cancel") &&
                closeProtection &&
                !aborted &&
                hasUnsavedChanges
            ) {
                discardDecision ??= confirmPopupDiscard(
                    i18n,
                    discardController.signal,
                );
                const confirmed = await discardDecision;
                discardDecision = undefined;
                if (!confirmed) return false;
            }
            if (dismissed) return;
            releasePopup({ restore: !aborted, immediate: aborted });
            resolve(actionId ?? null);
            return true;
        }

        function releasePopup({ restore = true, immediate = false } = {}) {
            if (dismissed) return;
            dismissed = true;
            try {
                focusLifecycle?.release({ restore });
            } finally {
                discardController.abort();
                signal?.removeEventListener("abort", abortPopup);
                if (timeoutHandle !== null) {
                    clearTimeout(timeoutHandle);
                    timeoutHandle = null;
                }
                if (countdownInterval !== null) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                document.removeEventListener("keydown", onKeyDown);
                window.removeEventListener("resize", fitPopupTitleRow);
                closeProtectionTracker?.destroy();
                closeProtectionTracker = null;
                let removed = false;
                function removeOverlay() {
                    if (!removed) {
                        removed = true;
                        overlay.remove();
                        releaseScroll?.();
                    }
                }
                if (immediate) removeOverlay();
                else {
                    overlay.addEventListener("transitionend", removeOverlay, {
                        once: true,
                    });
                    setTimeout(removeOverlay, 500); // fallback for the transitionend handler above
                }
                overlay.classList.remove("popup-overlay--visible");
            }
        }

        const abortPopup = () => void dismiss(null, true);

        const popupPages =
            Array.isArray(pages) && pages.length > 0 ? pages : null;
        let currentPage = popupPages
            ? (popupPages.find((page) => page.id === initialPageId) ??
              popupPages[0])
            : null;

        function resolvePageValue(pageValue, fallbackValue) {
            const value = pageValue ?? fallbackValue;
            return typeof value === "function" ? value() : (value ?? "");
        }

        const resolvedBody = popupPages
            ? resolvePageValue(currentPage?.body, body)
            : typeof body === "function"
              ? body()
              : (body ?? "");

        const effectiveActions = popupPages
            ? (currentPage?.actions ?? actions ?? [])
            : Array.isArray(actions)
              ? actions
              : [
                    {
                        id: "close",
                        label: i18n.t("ui.reuse.done"),
                        variant: "neutral",
                    },
                ];

        const closeButtonClass =
            closeButtonVariant === "neutral"
                ? "popup-close-btn btn-close btn-neutral"
                : "popup-close-btn btn-close btn-cancel";

        const actionButtons = renderPopupActions(effectiveActions);

        overlay.innerHTML = `
      <div class="popup-dialog popup-dialog--${escapeHtml(variant)}">
        <div class="popup-header">
          <div class="popup-heading${headingLayout === "annotated" ? " popup-heading--annotated" : ""}">${renderPopupHeading(
              currentPage?.title ?? title,
              currentPage?.titleDetail ?? titleDetail,
              currentPage?.titleAction ?? titleAction,
              currentPage?.titleLeading ?? titleLeading,
              currentPage?.titleItems ?? titleItems,
              currentPage?.titleDetailItems ?? titleDetailItems,
          )}</div>
          <div class="popup-header-actions">${headerActions
              .map((action) => {
                  const icon = action.icon;
                  const content =
                      icon && typeof icon === "object" && icon.light
                          ? `<picture class="popup-header-action-icon" aria-hidden="true"><source media="(prefers-color-scheme: dark)" srcset="${escapeHtml(icon.dark ?? icon.light)}"><img src="${escapeHtml(icon.light)}" alt="" data-resource-error-handled="true"></picture>`
                          : icon
                            ? `<span aria-hidden="true">${escapeHtml(icon)}</span>`
                            : escapeHtml(action.label);
                  return `<button class="btn-neutral popup-header-action" data-popup-action="${escapeHtml(action.id)}" type="button" aria-label="${escapeHtml(action.label)}" title="${escapeHtml(action.label)}">${content}</button>`;
              })
              .join(
                  "",
              )}${mandatory ? "" : `<button class="${closeButtonClass}" data-popup-action="close" type="button" aria-label="${escapeHtml(i18n.t("ui.reuse.close"))}">&#x2715;</button>`}</div>
        </div>
        <div class="popup-body">${resolvedBody}</div>
        ${actionButtons ? `<div class="popup-footer">${actionButtons}</div>` : ""}
      </div>
    `;
        if (maxWidth && !window.matchMedia("(max-width: 640px)").matches) {
            overlay.querySelector(".popup-dialog").style.maxWidth = maxWidth;
        }

        overlay.addEventListener("click", async (event) => {
            if (!mandatory && event.target === overlay) await dismiss(null);
        });

        const contentApi = createPopupContentApi(overlay, fitPopupTitleRow);

        function renderPopupPage(pageId) {
            if (dismissed || !popupPages) return false;
            const nextPage = popupPages.find((page) => page.id === pageId);
            if (!nextPage) return false;
            currentPage = nextPage;
            const headingEl = overlay.querySelector(".popup-heading");
            const bodyEl = overlay.querySelector(".popup-body");
            let footerEl = overlay.querySelector(".popup-footer");
            if (headingEl) {
                headingEl.innerHTML = renderPopupHeading(
                    currentPage.title ?? title,
                    currentPage.titleDetail ?? titleDetail,
                    currentPage.titleAction ?? titleAction,
                    currentPage.titleLeading ?? titleLeading,
                    currentPage.titleItems ?? titleItems,
                    currentPage.titleDetailItems ?? titleDetailItems,
                );
                bindActionButtons(headingEl);
                fitPopupTitleRow();
            }
            if (bodyEl) {
                bodyEl.innerHTML = resolvePageValue(currentPage.body, body);
                bindActionButtons(bodyEl);
            }
            if (closeProtection) {
                closeProtectionTracker?.destroy();
                closeProtectionTracker = createFormDirtyTracker(overlay, {
                    quiet: true,
                });
            }
            const pageActions = currentPage.actions ?? actions ?? [];
            if (pageActions.length) {
                if (!footerEl) {
                    footerEl = document.createElement("div");
                    footerEl.className = "popup-footer";
                    overlay.querySelector(".popup-dialog").append(footerEl);
                }
                footerEl.innerHTML = renderPopupActions(pageActions);
                bindActionButtons(footerEl);
            } else footerEl?.remove();
            onOpen?.(overlay, () => dismiss(null), {
                setPage: renderPopupPage,
                pageId: currentPage.id,
                updateBody,
                ...contentApi,
                markDirty: () => {
                    manuallyDirty = true;
                },
            });
            return true;
        }

        function updateBody(nextBody) {
            const bodyElement = overlay.querySelector(".popup-body");
            if (dismissed || !bodyElement) return null;
            bodyElement.innerHTML =
                typeof nextBody === "function" ? nextBody() : nextBody;
            bindActionButtons(bodyElement);
            return bodyElement;
        }

        const pendingActions = new Set();

        function bindActionButtons(root) {
            bindPopupActionIcons(root);
            root.querySelectorAll("[data-popup-action]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const actionId = btn.dataset.popupAction;
                    const resolvedActionId =
                        actionId === "close" ? null : actionId;
                    const closing =
                        resolvedActionId === null ||
                        resolvedActionId === "cancel";
                    if (
                        dismissed ||
                        !focusLifecycle?.isTopmost() ||
                        !overlay.contains(btn) ||
                        !isPopupControlAvailable(btn, { visible: false }) ||
                        btn.closest('[aria-disabled="true"]') ||
                        pendingActions.has(actionId) ||
                        (pendingActions.size && !closing)
                    )
                        return;
                    pendingActions.add(actionId);
                    try {
                        if (typeof onAction === "function") {
                            try {
                                const shouldDismiss = await onAction(
                                    resolvedActionId,
                                    overlay,
                                    {
                                        setPage: renderPopupPage,
                                        pageId: currentPage?.id,
                                        requestClose: () => dismiss(null),
                                        updateBody,
                                        ...contentApi,
                                        markDirty: () => {
                                            manuallyDirty = true;
                                        },
                                    },
                                );
                                if (shouldDismiss === false) return;
                            } catch {
                                return;
                            }
                        }
                        await dismiss(resolvedActionId);
                    } finally {
                        pendingActions.delete(actionId);
                    }
                });
            });
        }

        function fitPopupTitleRow() {
            if (dismissed) return;
            const heading = overlay.querySelector(".popup-heading");
            const titleElement = heading?.querySelector(".popup-title");
            const detailElement = heading?.querySelector(".popup-title-detail");
            if (!heading || !titleElement) return;
            heading.classList.remove("popup-heading--stacked-detail");
            heading.style.setProperty("--popup-title-scale", "1");
            heading.style.setProperty("--popup-title-detail-scale", "1");
            const style = window.getComputedStyle(heading);
            const gap = Number.parseFloat(style.columnGap || style.gap) || 0;
            const contentWidth = () =>
                Array.from(heading.children).reduce(
                    (width, element) => width + element.scrollWidth,
                    gap * Math.max(0, heading.children.length - 1),
                );
            let detailScale = 1;
            while (
                detailElement &&
                contentWidth() > heading.clientWidth &&
                detailScale > 0.5
            ) {
                detailScale = Math.max(0.5, detailScale - 0.05);
                heading.style.setProperty(
                    "--popup-title-detail-scale",
                    String(detailScale),
                );
            }
            let titleScale = 1;
            while (contentWidth() > heading.clientWidth && titleScale > 0.7) {
                titleScale = Math.max(0.7, titleScale - 0.05);
                heading.style.setProperty(
                    "--popup-title-scale",
                    String(titleScale),
                );
            }
            const detailIsStressed = Array.from(
                detailElement?.children ?? [],
            ).some((element) => {
                const elementStyle = window.getComputedStyle(element);
                const lineHeight = Number.parseFloat(elementStyle.lineHeight);
                return (
                    element.scrollWidth > element.clientWidth + 1 ||
                    (Number.isFinite(lineHeight) &&
                        element.scrollHeight > lineHeight * 1.5)
                );
            });
            if (
                stackTitleDetailOnOverflow &&
                (titleElement.scrollWidth > titleElement.clientWidth + 1 ||
                    detailIsStressed)
            ) {
                heading.classList.add("popup-heading--stacked-detail");
                heading.style.setProperty("--popup-title-scale", "1");
                heading.style.setProperty("--popup-title-detail-scale", "1");
            }
        }
        bindActionButtons(overlay);

        function onKeyDown(event) {
            if (
                dismissed ||
                event.defaultPrevented ||
                !focusLifecycle?.isTopmost()
            )
                return;
            if (event.key === "Escape") {
                if (mandatory) return;
                dismiss(null).catch((error) =>
                    console.error("[popup] dismiss failed:", error),
                );
                return;
            }
            if (event.key === "Enter") {
                const defaultAction = popupEnterAction(
                    overlay,
                    event,
                    currentPage?.actions ??
                        (popupPages ? (actions ?? []) : effectiveActions),
                );
                if (defaultAction) {
                    event.preventDefault();
                    defaultAction.click();
                }
            }
        }
        try {
            document.addEventListener("keydown", onKeyDown);

            document.body.appendChild(overlay);
            focusLifecycle = bindPopupFocus(overlay, invoker);
            releaseScroll = lockPageScroll(document);
            window.addEventListener("resize", fitPopupTitleRow);
            fitPopupTitleRow();
            document.fonts?.ready.then(fitPopupTitleRow);

            signal?.addEventListener("abort", abortPopup, { once: true });
            if (signal?.aborted) {
                abortPopup();
                return;
            }
            if (typeof onOpen === "function") {
                onOpen(overlay, () => dismiss(null), {
                    updateBody,
                    ...contentApi,
                    setPage: renderPopupPage,
                    pageId: currentPage?.id,
                    markDirty: () => {
                        manuallyDirty = true;
                    },
                });
            }
            if (dismissed) return;
            if (closeProtection) {
                closeProtectionTracker = createFormDirtyTracker(overlay, {
                    quiet: true,
                });
            }
            if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
                timeoutHandle = setTimeout(() => {
                    dismiss(timeoutActionId).catch((error) =>
                        console.error("[popup] timeout dismiss failed:", error),
                    );
                }, timeoutMs);

                const timeoutButton = timeoutActionId
                    ? overlay.querySelector(
                          `[data-popup-action="${CSS.escape(timeoutActionId)}"]`,
                      )
                    : null;
                if (timeoutButton instanceof HTMLButtonElement) {
                    const originalLabel = timeoutButton.textContent ?? "";
                    const startedAt = Date.now();
                    const updateCountdown = () => {
                        const remainingSeconds = Math.max(
                            0,
                            Math.ceil(
                                (timeoutMs - (Date.now() - startedAt)) / 1000,
                            ),
                        );
                        timeoutButton.textContent = `${originalLabel} (${remainingSeconds})`;
                    };
                    updateCountdown();
                    countdownInterval = setInterval(updateCountdown, 1000);
                }
            }

            requestAnimationFrame(() => {
                if (dismissed) return;
                overlay.classList.add("popup-overlay--visible");
            });

            focusLifecycle.activate();
        } catch (error) {
            try {
                releasePopup({ immediate: true });
                const log = console.error.bind(console);
                log("[popup] Initial opening failed", {
                    component: "ui.popup",
                    operation: "openPopup",
                    errorName: error?.name,
                });
            } finally {
                throw error;
            }
        }
    });
}

export {
    markPopupFieldInvalid,
    openConfigFormPopup,
    resolveFieldErrorId,
} from "./popup/config-form.js";
