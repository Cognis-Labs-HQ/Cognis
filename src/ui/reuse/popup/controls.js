/**
 * Renders popup footer controls and checks their interactive availability.
 * Public exports: renderPopupActions creates native consequence-styled actions;
 * isPopupControlAvailable checks connected, enabled and visible controls;
 * popupEnterAction resolves the bounded single-line constructive shortcut.
 * @example footer.innerHTML = renderPopupActions(actions);
 */
import { escapeHtml } from "../escape-html.js";

/**
 * @param {Element} element
 * @param {{visible?: boolean}} options Whether keyboard visibility is required.
 * @returns {boolean}
 */
export function isPopupControlAvailable(element, { visible = true } = {}) {
    if (
        !element?.isConnected ||
        element.matches(':disabled, input[type="hidden"]')
    )
        return false;
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        if (
            (visible && ancestor.hidden) ||
            ancestor.inert ||
            ancestor.hasAttribute("inert")
        )
            return false;
        if (!visible) continue;
        const style =
            ancestor.ownerDocument.defaultView.getComputedStyle(ancestor);
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.visibility === "collapse"
        )
            return false;
    }
    return true;
}

function renderActionContent(action) {
    const label = escapeHtml(action.label);
    if (!action.icon?.light) return label;
    const dark = action.icon.dark ?? action.icon.light;
    const icon = `<picture class="popup-action-icon${action.icon.flip ? " popup-action-icon--flip" : ""}" aria-hidden="true"><source media="(prefers-color-scheme: dark)" srcset="${escapeHtml(dark)}"><img src="${escapeHtml(action.icon.light)}" alt=""></picture>`;
    return action.icon.position === "after"
        ? `${label}${icon}`
        : `${icon}${label}`;
}

/** @param {Array<object>} actions @returns {string} */
export function renderPopupActions(actions) {
    return actions
        .map((action) => {
            const variant = ["confirm", "cancel"].includes(action.variant)
                ? action.variant
                : "neutral";
            const neutralClass =
                variant === "neutral" ? " popup-action-btn--neutral" : "";
            return `<button class="btn-${variant} btn-animated popup-action-btn${neutralClass}" data-popup-action="${escapeHtml(action.id)}" type="button"${action.disabled ? " disabled" : ""}>${renderActionContent(action)}</button>`;
        })
        .join("");
}

/**
 * @param {HTMLElement} overlay Active popup whose controls own the event.
 * @param {KeyboardEvent} event Unhandled Enter key event.
 * @param {Array<object>} actions Current footer descriptors, not presentation classes.
 * @returns {HTMLButtonElement|null} Eligible constructive action, or native event handling.
 */
export function popupEnterAction(overlay, event, actions) {
    const active = overlay.ownerDocument.activeElement;
    if (
        event.target !== active ||
        !overlay.contains(active) ||
        !isPopupControlAvailable(active) ||
        active.closest('[aria-disabled="true"]') ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
    )
        return null;
    // A held key must not activate a newly focused nested confirmation.
    if (event.repeat) {
        if (active.matches("button, input")) event.preventDefault();
        return null;
    }
    if (
        !active.matches("input:not([role])") ||
        active.hasAttribute("list") ||
        !["text", "search", "email", "url", "tel", "password"].includes(
            active.type,
        ) ||
        active.closest("[contenteditable]:not([contenteditable='false'])")
    )
        return null;
    const form = active.form;
    if (
        form &&
        (!overlay.contains(form) ||
            form.dataset.formSubmit !== "external" ||
            [...form.ownerDocument.querySelectorAll("button, input")].some(
                (control) =>
                    control.form === form &&
                    ["submit", "image"].includes(control.type),
            ))
    )
        return null;
    for (const action of actions) {
        if (action.variant !== "confirm" || action.disabled) continue;
        const button = [
            ...overlay.querySelectorAll(".popup-footer [data-popup-action]"),
        ].find((candidate) => candidate.dataset.popupAction === action.id);
        if (
            button?.matches("button") &&
            !button.closest('[aria-disabled="true"]') &&
            isPopupControlAvailable(button)
        )
            return button;
    }
    return null;
}
