/**
 * Owns keyboard focus and background isolation while a drawer is open.
 * Public export: beginDrawerSession starts a session and returns its cleanup.
 * @example const close = beginDrawerSession({ panel, trigger, backdrop, onDismiss });
 */

import { lockPageScroll } from "./page-scroll-lock.js";

const FOCUSABLE =
    'a[href], button, input, select, textarea, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
const inertLocks = new WeakMap();

function lockInert(element) {
    let state = inertLocks.get(element);
    if (!state) {
        state = { count: 0, inert: element.inert };
        inertLocks.set(element, state);
        element.inert = true;
    }
    state.count += 1;
    return () => {
        state.count -= 1;
        if (state.count > 0) return;
        element.inert = state.inert;
        inertLocks.delete(element);
    };
}

function isFocusable(element) {
    return (
        !element.disabled &&
        (element.tabIndex >= 0 || element.isContentEditable) &&
        !element.closest('[hidden], [inert], [aria-disabled="true"]') &&
        element.getClientRects().length > 0
    );
}

/**
 * Isolates an open drawer without changing the owner's visual open state.
 * @param {object} options Panel, trigger, backdrop, owner signal and Escape handler.
 * @returns {Function} Idempotent cleanup accepting an optional restoreFocus flag.
 */
export function beginDrawerSession({
    panel,
    trigger,
    backdrop,
    signal,
    onDismiss,
}) {
    signal?.throwIfAborted();
    const document = panel.ownerDocument;
    const releases = [lockPageScroll(document)];
    const preservedAttributes = new Map(
        ["role", "aria-modal", "tabindex"].map((name) => [
            name,
            panel.getAttribute(name),
        ]),
    );
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("tabindex", "-1");

    const window = document.defaultView;
    const panelLevel = Number(window.getComputedStyle(panel).zIndex) || 0;
    function isForegroundSurface(element) {
        const styles = window.getComputedStyle(element);
        return (
            styles.position === "fixed" && Number(styles.zIndex) > panelLevel
        );
    }

    const permitted = [panel, trigger, backdrop].filter(Boolean);
    function isolateChildren(parent) {
        for (const child of parent.children) {
            if (permitted.includes(child) || isForegroundSurface(child))
                continue;
            if (permitted.some((element) => child.contains(element)))
                isolateChildren(child);
            else releases.push(lockInert(child));
        }
    }
    isolateChildren(document.body);

    const focusableControls = () => {
        const controls = [...panel.querySelectorAll(FOCUSABLE)].filter(
            isFocusable,
        );
        if (trigger && !panel.contains(trigger) && isFocusable(trigger))
            controls.push(trigger);
        return controls;
    };

    let closed = false;
    function close({ restoreFocus = true } = {}) {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", handleKeydown);
        signal?.removeEventListener("abort", abort);
        for (const release of releases.reverse()) release();
        for (const [name, value] of preservedAttributes) {
            if (value === null) panel.removeAttribute(name);
            else panel.setAttribute(name, value);
        }
        if (restoreFocus && trigger?.isConnected && isFocusable(trigger))
            trigger.focus({ preventScroll: true });
    }

    function abort() {
        close({ restoreFocus: false });
    }

    function handleKeydown(event) {
        if (event.defaultPrevented) return;
        const activeDialog = document.activeElement?.closest(
            '[role="dialog"][aria-modal="true"]',
        );
        if (activeDialog && activeDialog !== panel) return;
        let activeBranch = document.activeElement;
        while (activeBranch && activeBranch !== document.body) {
            if (activeBranch === panel || activeBranch === trigger) break;
            if (isForegroundSurface(activeBranch)) return;
            activeBranch = activeBranch.parentElement;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            onDismiss?.();
            return;
        }
        if (event.key !== "Tab") return;
        const controls = focusableControls();
        const activeIndex = controls.indexOf(document.activeElement);
        const nextIndex = event.shiftKey
            ? (activeIndex <= 0 ? controls.length : activeIndex) - 1
            : (activeIndex + 1) % controls.length;
        event.preventDefault();
        (controls[nextIndex] ?? panel).focus({ preventScroll: true });
    }

    document.addEventListener("keydown", handleKeydown);
    signal?.addEventListener("abort", abort, { once: true });
    (focusableControls()[0] ?? panel).focus({ preventScroll: true });
    return close;
}
