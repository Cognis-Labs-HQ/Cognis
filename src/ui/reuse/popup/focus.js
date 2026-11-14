/**
 * Owns keyboard containment and focus restoration for one modal lifetime.
 * Public export: bindPopupFocus installs a modal's focus lifecycle.
 * @example const focus = bindPopupFocus(overlay, invoker); focus.activate();
 */

import { uiCtx } from "../ui-ctx.js";
import { popupFocusOwnership } from "./focus-ownership.js";

const ACTIVE_POPUP = ".popup-overlay[data-popup-active]";
const FOCUSABLE =
    'a[href], area[href], button, input, select, textarea, iframe, [tabindex], [contenteditable="true"]';

function available(element) {
    if (
        !element?.isConnected ||
        element.matches(':disabled, input[type="hidden"]')
    )
        return false;
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.hidden || ancestor.inert || ancestor.hasAttribute("inert"))
            return false;
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

function focusableElements(overlay) {
    return [...overlay.querySelectorAll(FOCUSABLE)]
        .filter((element) => element.tabIndex >= 0 && available(element))
        .sort(
            (left, right) =>
                (left.tabIndex || Infinity) - (right.tabIndex || Infinity),
        );
}

/**
 * @param {HTMLElement} overlay Modal whose interactive lifetime is being bound.
 * @param {Element|null} invoker Focused element captured before asynchronous opening.
 * @returns {{activate: Function, isTopmost: Function, release: Function}}
 */
export function bindPopupFocus(overlay, invoker) {
    const log = console.info.bind(console);
    const document = overlay.ownerDocument;
    const window = document.defaultView;
    let released = false;
    let lastFocus = null;
    overlay.tabIndex = -1;
    overlay.setAttribute("data-popup-active", "");
    log("[popup] modal focus acquired", {
        component: "ui.popup",
        operation: "bindFocus",
    });
    const topmost = () => [...document.querySelectorAll(ACTIVE_POPUP)].at(-1);
    const isTopmost = () => !released && topmost() === overlay;

    function focusInside(preferred) {
        if (!isTopmost()) return;
        const controls = focusableElements(overlay);
        const target =
            overlay.contains(preferred) && available(preferred)
                ? preferred
                : overlay.contains(lastFocus) && available(lastFocus)
                  ? lastFocus
                  : (controls.find((element) =>
                        element.matches("input, textarea, select"),
                    ) ??
                    controls.find(
                        (element) => !element.matches(".popup-close-btn"),
                    ) ??
                    controls[0] ??
                    overlay);
        target.focus({ preventScroll: true });
    }

    const ownership = popupFocusOwnership(uiCtx);
    const owner = ownership.register(overlay, {
        active: isTopmost,
        contains: (element) => overlay.contains(element),
        focus: focusInside,
    });

    function onFocus(event) {
        if (!isTopmost()) return;
        if (owner.contains(event.target)) {
            if (overlay.contains(event.target)) lastFocus = event.target;
        } else owner.focus();
    }

    function onKeyDown(event) {
        if (!isTopmost() || owner.delegated || event.key !== "Tab") return;
        const controls = focusableElements(overlay);
        const index = controls.indexOf(document.activeElement);
        if (
            index < 0 ||
            (event.shiftKey ? index === 0 : index === controls.length - 1)
        ) {
            event.preventDefault();
            const target =
                (event.shiftKey ? controls.at(-1) : controls[0]) ?? overlay;
            target.focus({ preventScroll: true });
        }
    }

    const observer = new window.MutationObserver(() => {
        if (
            isTopmost() &&
            (!owner.contains(document.activeElement) ||
                !available(document.activeElement))
        )
            owner.focus();
    });
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKeyDown);
    observer.observe(overlay, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
            "disabled",
            "hidden",
            "inert",
            "style",
            "class",
            "tabindex",
        ],
    });

    return {
        isTopmost,
        activate: () => {
            if (isTopmost()) owner.focus();
        },
        release({ restore = true } = {}) {
            if (released) return;
            const wasTopmost = isTopmost();
            released = true;
            owner.release();
            observer.disconnect();
            document.removeEventListener("focusin", onFocus);
            document.removeEventListener("keydown", onKeyDown);
            overlay.removeAttribute("data-popup-active");
            overlay.inert = true;
            log("[popup] modal focus released", {
                component: "ui.popup",
                operation: "releaseFocus",
                restore,
            });
            if (!wasTopmost) return;
            const parent = topmost();
            if (!restore && !parent) return;
            if (
                parent &&
                ownership.restore(parent, available(invoker) ? invoker : null)
            )
                return;
            if (
                available(invoker) &&
                invoker.matches(FOCUSABLE) &&
                !invoker.closest(".popup-overlay[inert]") &&
                (!parent || parent.contains(invoker))
            ) {
                invoker.focus({ preventScroll: true });
            } else if (parent) {
                (focusableElements(parent)[0] ?? parent).focus({
                    preventScroll: true,
                });
            } else {
                const previousTabIndex = document.body.getAttribute("tabindex");
                document.body.tabIndex = -1;
                document.body.focus({ preventScroll: true });
                if (previousTabIndex === null)
                    document.body.removeAttribute("tabindex");
                else document.body.setAttribute("tabindex", previousTabIndex);
            }
        },
    };
}
