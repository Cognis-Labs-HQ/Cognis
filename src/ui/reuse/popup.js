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
 * This module lazily injects /static/styles/popup.css into the document
 * <head> on the first call to openPopup(), so callers do not need to include
 * that stylesheet explicitly in their page HTML.
 *
 * Public exports:
 *   openPopup(options) — opens a modal and returns a Promise<string|null>.
 *   createAnchoredPopup(options) — returns a controller for a non-modal popup
 *     positioned beside an anchor element.
 *
 * Usage:
 *   import { openPopup } from '../../reuse/popup.js';
 *
 *   const result = await openPopup({
 *     title: 'Disable module',
 *     body: `Are you sure you want to disable "my-module"?`,
 *     variant: 'danger',
 *     actions: [
 *       { id: 'confirm', label: 'Disable', variant: 'confirm' },
 *       { id: 'cancel',  label: 'Cancel',  variant: 'cancel'  },
 *     ],
 *   });
 *   if (result === 'confirm') { ... }
 *
 * Options:
 *   title    — heading text (rendered as plain text, HTML-escaped).
 *   body     — body content: either an HTML string or a `() => string` render
 *              function. Rendered as innerHTML; callers must escape dynamic values.
 *   variant  — visual style hint: 'info' | 'warning' | 'danger' | 'confirm'.
 *              Defaults to 'info'.
 *   actions  — Array<{ id: string, label: string, variant?: 'confirm' | 'cancel' | 'neutral' }>.
 *              When omitted, a single green 'Done' (confirm) button is rendered.
 *              The × header close button always uses the cancel (danger) style.
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
 * @param {{
 *   title: string,
 *   body: string | (() => string),
 *   variant?: 'info' | 'warning' | 'danger' | 'confirm',
 *   actions?: Array<{ id: string, label: string, variant?: string }>,
 *   maxWidth?: string,
 *   onOpen?: (overlay: HTMLElement) => void,
 *   onAction?: (actionId: string | null, overlay: HTMLElement) => Promise<boolean | void> | boolean | void,
 *   closeProtection?: boolean,
 * }} options
 * @returns {Promise<string|null>}
 */

import { createI18n } from "./i18n.js";
import { createFormDirtyTracker } from "./unsaved-changes.js";

let stylesheetReady = null;
let i18nReady = null;

function getI18n() {
    // Store the Promise, not the resolved value, so concurrent calls
    // before resolution share the same deferred.
    if (!i18nReady) i18nReady = createI18n();
    return i18nReady;
}

const scrollLockState = {
    count: 0,
    bodyOverflow: null,
    mainOverflowValues: [],
};

function getScrollableMainElements() {
    return Array.from(document.querySelectorAll("main"));
}

function lockPageScroll() {
    if (scrollLockState.count === 0) {
        scrollLockState.bodyOverflow = document.body.style.overflow;
        scrollLockState.mainOverflowValues = getScrollableMainElements().map(
            (element) => ({
                element,
                overflow: element.style.overflow,
            }),
        );
        document.body.style.overflow = "hidden";
        scrollLockState.mainOverflowValues.forEach(({ element }) => {
            element.style.overflow = "hidden";
        });
    }
    scrollLockState.count += 1;
}

function unlockPageScroll() {
    scrollLockState.count = Math.max(0, scrollLockState.count - 1);
    if (scrollLockState.count > 0) return;

    document.body.style.overflow = scrollLockState.bodyOverflow ?? "";
    scrollLockState.mainOverflowValues.forEach(({ element, overflow }) => {
        element.style.overflow = overflow;
    });
    scrollLockState.bodyOverflow = null;
    scrollLockState.mainOverflowValues = [];
}

function ensureStylesheet() {
    if (stylesheetReady) return stylesheetReady;

    const existing = document.querySelector(
        'link[href="/static/styles/popup.css"]',
    );
    if (existing) {
        stylesheetReady = existing.sheet
            ? Promise.resolve()
            : new Promise((resolve) => {
                  existing.addEventListener("load", resolve, { once: true });
                  existing.addEventListener("error", resolve, { once: true });
              });
        return stylesheetReady;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/styles/popup.css";
    stylesheetReady = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", resolve, { once: true });
    });
    document.head.appendChild(link);
    return stylesheetReady;
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

    function getPopupElement() {
        if (popupElement instanceof HTMLElement) {
            return popupElement;
        }
        void ensureStylesheet();
        popupElement = document.createElement(tagName);
        popupElement.className = className.trim();
        popupElement.setAttribute("role", role);
        popupElement.hidden = true;
        document.body.appendChild(popupElement);
        return popupElement;
    }

    function hide() {
        anchorElement = null;
        if (!(popupElement instanceof HTMLElement)) return;
        popupElement.hidden = true;
        popupElement.innerHTML = "";
    }

    return {
        show(anchor, body) {
            if (!(anchor instanceof HTMLElement)) return;
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
    body,
    variant = "info",
    actions,
    maxWidth,
    onOpen,
    onAction,
    closeProtection = false,
} = {}) {
    await ensureStylesheet();
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "popup-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "popup-title");
        let closeProtectionTracker = null;

        function escapeHtml(value) {
            return String(value)
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#39;");
        }

        let dismissed = false;
        async function dismiss(actionId) {
            closeProtectionTracker?.sync();
            const hasUnsavedChanges =
                closeProtectionTracker?.isAnyDirty() ??
                hasUnsavedFormChanges(overlay);
            if (actionId === null && closeProtection && hasUnsavedChanges) {
                const i18n = await getI18n();
                const confirmed = await openPopup({
                    title: i18n.t("ui.reuse.unsaved_changes"),
                    body: `<p>${escapeHtml(i18n.t("ui.reuse.close_form_warning"))}</p>`,
                    variant: "warning",
                    actions: [
                        {
                            id: "discard",
                            label: i18n.t("ui.reuse.discard"),
                            variant: "confirm",
                        },
                        {
                            id: "keep",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "cancel",
                        },
                    ],
                });
                if (confirmed !== "discard") return;
            }
            if (dismissed) return;
            dismissed = true;
            document.removeEventListener("keydown", onKeyDown);
            closeProtectionTracker?.destroy();
            closeProtectionTracker = null;
            let removed = false;
            function removeOverlay() {
                if (!removed) {
                    removed = true;
                    overlay.remove();
                    unlockPageScroll();
                }
            }
            overlay.addEventListener("transitionend", removeOverlay, {
                once: true,
            });
            setTimeout(removeOverlay, 500); // fallback if no transition fires (line 109 above)
            overlay.classList.remove("popup-overlay--visible");
            resolve(actionId ?? null);
        }

        const resolvedBody = typeof body === "function" ? body() : (body ?? "");

        const effectiveActions =
            Array.isArray(actions) && actions.length > 0
                ? actions
                : [{ id: "close", label: "Done", variant: "confirm" }];

        const actionButtons = effectiveActions
            .map((action) => {
                const btnVariant = action.variant ?? "neutral";
                const btnClass =
                    btnVariant === "confirm"
                        ? "btn-confirm btn-animated popup-action-btn"
                        : btnVariant === "cancel"
                          ? "btn-cancel btn-animated popup-action-btn"
                          : "popup-action-btn popup-action-btn--neutral btn-animated";
                return `<button class="${btnClass}" data-popup-action="${escapeHtml(action.id)}" type="button">${escapeHtml(action.label)}</button>`;
            })
            .join("");

        overlay.innerHTML = `
      <div class="popup-dialog popup-dialog--${escapeHtml(variant)}">
        <div class="popup-header">
          <h2 class="popup-title" id="popup-title">${escapeHtml(title ?? "")}</h2>
          <button class="popup-close-btn btn-cancel btn-animated" data-popup-action="close" type="button" aria-label="Close">&#x2715;</button>
        </div>
        <div class="popup-body">${resolvedBody}</div>
        ${actionButtons ? `<div class="popup-footer">${actionButtons}</div>` : ""}
      </div>
    `;

        if (maxWidth && !window.matchMedia("(max-width: 640px)").matches) {
            overlay.querySelector(".popup-dialog").style.maxWidth = maxWidth;
        }

        overlay.addEventListener("click", async (event) => {
            if (event.target === overlay) await dismiss(null);
        });

        overlay.querySelectorAll("[data-popup-action]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const actionId = btn.dataset.popupAction;
                const resolvedActionId = actionId === "close" ? null : actionId;
                if (typeof onAction === "function") {
                    try {
                        const shouldDismiss = await onAction(
                            resolvedActionId,
                            overlay,
                        );
                        if (shouldDismiss === false) return;
                    } catch {
                        return;
                    }
                }
                await dismiss(resolvedActionId);
            });
        });

        function onKeyDown(event) {
            const overlays = document.querySelectorAll(".popup-overlay");
            if (overlays[overlays.length - 1] !== overlay) return;
            if (event.key === "Escape") {
                dismiss(null).catch((error) =>
                    console.error("[popup] dismiss failed:", error),
                );
                return;
            }
            if (event.key === "Enter") {
                if (document.activeElement instanceof HTMLTextAreaElement)
                    return;
                const confirmBtn = overlay.querySelector(
                    "[data-popup-action].btn-confirm",
                );
                if (confirmBtn instanceof HTMLButtonElement) {
                    event.preventDefault();
                    confirmBtn.click();
                }
            }
        }
        document.addEventListener("keydown", onKeyDown);

        document.body.appendChild(overlay);
        lockPageScroll();

        if (typeof onOpen === "function") {
            onOpen(overlay, () => dismiss(null));
        }
        if (closeProtection) {
            closeProtectionTracker = createFormDirtyTracker(overlay, {
                quiet: true,
            });
        }

        requestAnimationFrame(() => {
            overlay.classList.add("popup-overlay--visible");
        });

        const firstFocusable = overlay.querySelector("button");
        firstFocusable?.focus();
    });
}

/**
 * Opens a reusable configuration form popup backed by load/save endpoints.
 * Callers provide translated labels, field descriptors, request helpers, and
 * toast callbacks so module and gateway settings can share one popup flow.
 */
export async function openConfigFormPopup({
    i18n,
    apiFetch,
    showToast,
    escapeHtml,
    loadUrl,
    saveUrl,
    titleKey,
    fields,
    noteKey,
    loadFailedKey,
    successKey,
    failedKey,
}) {
    const loadResponse = await apiFetch(loadUrl);
    if (!loadResponse.ok) {
        showToast(i18n.t(loadFailedKey ?? failedKey), { variant: "error" });
        return false;
    }
    const loadPayload = await loadResponse.json().catch(() => ({ data: {} }));
    const config = loadPayload?.data ?? {};

    let popupOverlay = null;
    const fieldRows = (Array.isArray(fields) ? fields : [])
        .map((field) => {
            const fieldId = String(field.id ?? "").trim();
            if (!fieldId) return "";
            const label = i18n.t(field.labelKey);
            const rawValue = config?.[field.configKey];
            const value = rawValue == null ? "" : String(rawValue);
            const placeholder = field.placeholderKey
                ? i18n.t(field.placeholderKey)
                : "";
            const description = field.descriptionKey
                ? i18n.t(field.descriptionKey)
                : "";
            const descriptionBlock = description
                ? `<p class="module-settings-popup-description">${escapeHtml(description)}</p>`
                : "";
            const inputType = field.type === "url" ? "url" : "text";
            return `
      <label class="module-settings-popup-field">
        <span class="module-settings-popup-label">${escapeHtml(label)}</span>
        ${descriptionBlock}
        <input id="${escapeHtml(fieldId)}" type="${escapeHtml(inputType)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
      </label>
    `;
        })
        .join("");
    const noteBlock = noteKey
        ? `<p class="module-settings-popup-note">${escapeHtml(i18n.t(noteKey))}</p>`
        : "";

    const action = await openPopup({
        title: i18n.t(titleKey),
        body: () => `
      <div class="module-settings-popup-fields">
        ${fieldRows}
      </div>
      ${noteBlock}
    `,
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        closeProtection: true,
        onOpen: (overlay) => {
            popupOverlay = overlay;
        },
    });

    if (action !== "save" || !(popupOverlay instanceof HTMLElement)) {
        return false;
    }

    const values = {};
    for (const field of fields ?? []) {
        const fieldId = String(field.id ?? "").trim();
        if (!fieldId) continue;
        const input = popupOverlay.querySelector(`#${fieldId}`);
        const rawValue =
            input instanceof HTMLInputElement ? input.value.trim() : "";
        values[field.configKey] =
            typeof field.serialize === "function"
                ? field.serialize(rawValue)
                : rawValue;
    }

    const saveResponse = await apiFetch(saveUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
    });

    if (!saveResponse.ok) {
        showToast(i18n.t(failedKey), { variant: "error" });
        return false;
    }

    showToast(i18n.t(successKey), { variant: "success" });
    return true;
}
