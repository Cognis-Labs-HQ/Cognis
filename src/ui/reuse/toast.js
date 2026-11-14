/**
 * Toast notification system.
 *
 * Displays non-blocking, auto-dismissing feedback messages at the top-right
 * corner of the viewport. Stacks multiple toasts vertically. The CSS is
 * lazily injected on the first call, so no explicit stylesheet link is needed.
 *
 * Public exports:
 *   showToast(message, options) — display a toast and return a dismiss function.
 *   configureToastDismissLabel(label) — set the localised aria-label for the
 *     dismiss button; call once during page initialisation (e.g. from the page
 *     composer) so the button is accessible in the user's language.
 *
 * Usage:
 *   import { showToast } from '../../reuse/toast.js';
 *
 *   showToast('Saved.', { variant: 'success' });
 *   showToast('Connection failed.', { variant: 'error' });
 *   showToast('Check your input.', { variant: 'warning' });
 *   showToast('Update available.', { variant: 'info' });
 *
 *   const dismiss = showToast('Loading…');
 *   dismiss(); // dismiss programmatically before the timer fires
 *
 * Options:
 *   variant   — 'info' | 'success' | 'warning' | 'error'. Default: 'info'.
 *   minRole   — optional minimum access role; unknown/missing roles fail closed.
 *   duration  — auto-dismiss delay in ms. Default: 4000 for info/success,
 *               7000 for warning/error.
 *   permanent — when true the toast never auto-dismisses (only the × button
 *               removes it). Overrides duration.
 *
 * @param {string} message - Plain-text message to display.
 * @param {{ variant?: 'info' | 'success' | 'warning' | 'error', duration?: number, permanent?: boolean, minRole?: string, linkHref?: string, linkLabel?: string, onDismiss?: () => void, onExpire?: () => void }} [options]
 * @returns {() => void} dismiss — call to immediately dismiss the toast.
 */

import { hasMinAccessRole } from "./access-role.js";
import { isOfflineTransition } from "./offline-state.js";
import { escapeHtml } from "./escape-html.js";

const VARIANT_CLASSES = {
    info: "toast--info",
    success: "toast--success",
    warning: "toast--warning",
    error: "toast--error",
};

const VARIANT_ICONS = {
    info: "&#x2139;",
    success: "&#x2713;",
    warning: "&#x26A0;",
    error: "&#x2715;",
};

let stylesheetReady = null;
const failedStylesheets = new WeakSet();
const stylesheetHref = "/static/styles/reuse/toast.css";
let dismissLabel = "Dismiss";

/**
 * Set the localised aria-label for the toast dismiss button.
 * Call once during page initialisation (e.g. from the page composer) so the
 * button is accessible in the user's language.
 *
 * @param {string} label - Translated dismiss label.
 */
export function configureToastDismissLabel(label) {
    dismissLabel = label;
}

function loadStylesheet() {
    const existing = document.querySelector(`link[href="${stylesheetHref}"]`);
    if (existing?.sheet) return Promise.resolve(true);
    const owned = !existing || failedStylesheets.has(existing);
    const link = owned ? document.createElement("link") : existing;
    return new Promise((resolve) => {
        let settled = false;
        const finish = (loaded) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            link.removeEventListener("load", onLoad);
            link.removeEventListener("error", onError);
            if (!loaded) {
                console.error("[toast] failed to load stylesheet", {
                    component: "ui",
                    operation: "loadToastStylesheet",
                    href: stylesheetHref,
                });
                failedStylesheets.add(link);
                if (owned) link.remove();
            }
            resolve(loaded);
        };
        const onLoad = () => finish(true);
        const onError = () => finish(false);
        const timeout = setTimeout(onError, 5_000);
        link.addEventListener("load", onLoad);
        link.addEventListener("error", onError);
        if (owned) {
            link.rel = "stylesheet";
            link.href = stylesheetHref;
            document.head.appendChild(link);
        }
    });
}

function ensureStylesheet() {
    if (stylesheetReady) return stylesheetReady;
    stylesheetReady = (async () => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            if (await loadStylesheet()) return;
        }
        stylesheetReady = null;
    })();
    return stylesheetReady;
}

function ensureTray() {
    let tray = document.querySelector(".toast-tray");
    if (!tray) {
        tray = document.createElement("div");
        tray.className = "toast-tray";
        tray.setAttribute("aria-live", "polite");
        tray.setAttribute("aria-relevant", "additions removals");
        document.body.appendChild(tray);
    }
    return tray;
}

function resolveToastLinkHref(linkHref) {
    if (typeof linkHref !== "string") {
        return "";
    }
    const normalizedLinkHref = linkHref.trim();
    if (!normalizedLinkHref) {
        return "";
    }
    if (normalizedLinkHref.startsWith("/")) {
        return normalizedLinkHref;
    }
    try {
        const parsed = new URL(normalizedLinkHref, window.location.origin);
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return "";
        }
        return parsed.href;
    } catch {
        return "";
    }
}

export function showToast(
    message,
    {
        variant = "info",
        minRole,
        duration,
        permanent = false,
        linkHref = "",
        linkLabel = "",
        onDismiss,
        onExpire,
    } = {},
) {
    if (
        minRole !== undefined &&
        !hasMinAccessRole(
            globalThis.localStorage?.getItem("cognis_role"),
            minRole,
        )
    )
        return () => {};
    if (variant === "error" && isOfflineTransition()) return () => {};
    const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.info;
    const icon = VARIANT_ICONS[variant] ?? VARIANT_ICONS.info;
    const effectiveDuration = permanent
        ? null
        : (duration ??
          (variant === "warning" || variant === "error" ? 7000 : 4000));

    ensureStylesheet();

    const tray = ensureTray();

    const toast = document.createElement("div");
    toast.className = `toast ${variantClass}`;
    if (!permanent) toast.classList.add("toast--dismissible");
    if (effectiveDuration !== null) {
        toast.style.setProperty("--toast-duration", `${effectiveDuration}ms`);
    }
    toast.setAttribute(
        "role",
        variant === "warning" || variant === "error" ? "alert" : "status",
    );

    const resolvedLinkHref = resolveToastLinkHref(linkHref);
    const messageHtml = `${escapeHtml(message)}${
        resolvedLinkHref && linkLabel
            ? ` <a href="${escapeHtml(resolvedLinkHref)}">${escapeHtml(linkLabel)}</a>`
            : ""
    }`;

    toast.innerHTML = `${
        effectiveDuration !== null
            ? '<span class="toast-timebar" aria-hidden="true"></span>'
            : ""
    }<span class="toast-icon" aria-hidden="true">${icon}</span><span class="toast-message">${messageHtml}</span>${
        permanent
            ? `<button class="toast-dismiss" type="button" aria-label="${escapeHtml(dismissLabel)}">&#x2715;</button>`
            : ""
    }`;

    tray.appendChild(toast);

    let dismissed = false;
    let dismissTimer = null;
    let dragPointerId = null;
    let dragStartX = 0;
    let dragDistance = 0;
    const dragDismissDistance = 64;

    function startDismissTimer() {
        if (dismissTimer !== null) clearTimeout(dismissTimer);
        dismissTimer = setTimeout(() => dismiss("expired"), effectiveDuration);
    }

    function restartTimebar() {
        const timebar = toast.querySelector(".toast-timebar");
        if (!timebar) return;
        timebar.style.animation = "none";
        void timebar.offsetWidth;
        timebar.style.removeProperty("animation");
    }

    function resetDrag() {
        dragPointerId = null;
        dragDistance = 0;
        toast.classList.remove("toast--dragging");
        toast.style.removeProperty("transform");
        toast.style.removeProperty("opacity");
    }

    function dismiss(reason = "dismissed") {
        if (dismissed) return;
        dismissed = true;
        if (dismissTimer !== null) clearTimeout(dismissTimer);
        resetDrag();
        toast.classList.remove("toast--visible");
        toast.classList.add("toast--hiding");
        let removalFinished = false;
        const onEnd = () => {
            if (removalFinished) return;
            removalFinished = true;
            toast.remove();
            onDismiss?.();
            if (reason === "expired") onExpire?.();
        };
        toast.addEventListener("transitionend", onEnd, { once: true });
        setTimeout(onEnd, 400);
    }

    toast.querySelector(".toast-dismiss")?.addEventListener("click", dismiss);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (!dismissed) toast.classList.add("toast--visible");
        });
    });

    if (effectiveDuration !== null) {
        toast.addEventListener("mouseenter", () => {
            clearTimeout(dismissTimer);
            dismissTimer = null;
        });
        toast.addEventListener("mouseleave", () => {
            if (dismissed || dragPointerId !== null) return;
            restartTimebar();
            startDismissTimer();
        });
        toast.addEventListener("pointerdown", (event) => {
            if (
                !event.isPrimary ||
                (event.pointerType === "mouse" && event.button !== 0)
            ) {
                return;
            }
            dragPointerId = event.pointerId;
            dragStartX = event.clientX;
            clearTimeout(dismissTimer);
            dismissTimer = null;
            toast.setPointerCapture(event.pointerId);
            toast.classList.add("toast--dragging");
        });
        toast.addEventListener("pointermove", (event) => {
            if (event.pointerId !== dragPointerId) return;
            dragDistance = Math.max(0, event.clientX - dragStartX);
            toast.style.transform = `translateX(${dragDistance}px)`;
            toast.style.opacity = `${Math.max(0.4, 1 - dragDistance / 240)}`;
        });

        const cancelDrag = (event) => {
            if (event.pointerId !== dragPointerId) return;
            resetDrag();
            if (event.pointerType !== "mouse" || !toast.matches(":hover")) {
                restartTimebar();
                startDismissTimer();
            }
        };
        toast.addEventListener("pointerup", (event) => {
            if (event.pointerId !== dragPointerId) return;
            if (dragDistance >= dragDismissDistance) {
                dismiss();
                return;
            }
            cancelDrag(event);
        });
        toast.addEventListener("pointercancel", cancelDrag);
        startDismissTimer();
    }

    return dismiss;
}
