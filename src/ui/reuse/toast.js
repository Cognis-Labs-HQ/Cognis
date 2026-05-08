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
 *   duration  — auto-dismiss delay in ms. Default: 4000 for info/success,
 *               7000 for warning/error.
 *   permanent — when true the toast never auto-dismisses (only the × button
 *               removes it). Overrides duration.
 *
 * @param {string} message - Plain-text message to display.
 * @param {{ variant?: 'info' | 'success' | 'warning' | 'error', duration?: number, permanent?: boolean }} [options]
 * @returns {() => void} dismiss — call to immediately dismiss the toast.
 */

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

function ensureStylesheet() {
    if (stylesheetReady) return stylesheetReady;

    const existing = document.querySelector(
        'link[href="/static/styles/reuse/toast.css"]',
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
    link.href = "/static/styles/reuse/toast.css";
    stylesheetReady = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", resolve, { once: true });
    });
    document.head.appendChild(link);
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

export function showToast(
    message,
    { variant = "info", duration, permanent = false } = {},
) {
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
    if (effectiveDuration !== null) {
        toast.style.setProperty("--toast-duration", `${effectiveDuration}ms`);
    }
    toast.setAttribute(
        "role",
        variant === "warning" || variant === "error" ? "alert" : "status",
    );

    toast.innerHTML = `${
        effectiveDuration !== null
            ? '<span class="toast-timebar" aria-hidden="true"></span>'
            : ""
    }<span class="toast-icon" aria-hidden="true">${icon}</span><span class="toast-message">${escapeHtml(message)}</span>${
        permanent
            ? `<button class="toast-dismiss" type="button" aria-label="${escapeHtml(dismissLabel)}">&#x2715;</button>`
            : ""
    }`;

    tray.appendChild(toast);

    let dismissed = false;

    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        toast.classList.remove("toast--visible");
        toast.classList.add("toast--hiding");
        const onEnd = () => toast.remove();
        toast.addEventListener("transitionend", onEnd, { once: true });
        setTimeout(onEnd, 400);
    }

    toast.querySelector(".toast-dismiss")?.addEventListener("click", dismiss);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add("toast--visible");
        });
    });

    if (effectiveDuration !== null) {
        setTimeout(dismiss, effectiveDuration);
    }

    return dismiss;
}
