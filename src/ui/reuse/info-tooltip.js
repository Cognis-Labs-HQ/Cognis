/**
 * Reusable info-tooltip component for delivering contextual help text inline.
 *
 * Renders a small ℹ icon button that reveals a tooltip panel on hover or
 * keyboard focus. Prefer this over inline hint text for any description
 * longer than one short phrase — it keeps forms and headings visually clean
 * while still making the context available on demand.
 *
 * Public exports:
 *   renderInfoTooltip(text, ariaLabel?, id?) — Returns an HTML string: a positioned
 *     wrapper containing the icon button.
 *
 * Usage:
 *   import { renderInfoTooltip } from '../../reuse/info-tooltip.js';
 *
 *   const heading = `
 *     <h3>
 *       ${escapeHtml(label)}
 *       ${renderInfoTooltip(i18n.t('my.hint.key'))}
 *     </h3>
 *   `;
 *
 * @param {string} text   — Plain text to show inside the tooltip.
 *                           Do not pass raw HTML; the value is escaped.
 * @param {string} [ariaLabel] — Accessible label for the icon button.
 *                               Pass `i18n.t('ui.reuse.more_information')`.
 *                               Defaults to 'More information'.
 * @param {string} [id]   — Optional stable id prefix; generated when omitted.
 * @returns {string}
 */

import { escapeHtml } from "./escape-html.js";

let tooltipSequence = 0;
let activeTooltipButton = null;
let tooltipOverlayElement = null;
const tooltipTextById = new Map();

function ensureTooltipOverlayElement() {
    if (typeof document === "undefined") return null;
    if (tooltipOverlayElement instanceof HTMLElement) {
        return tooltipOverlayElement;
    }
    const existingTooltipOverlay = document.getElementById(
        "info-tooltip-overlay",
    );
    if (existingTooltipOverlay instanceof HTMLElement) {
        tooltipOverlayElement = existingTooltipOverlay;
        return tooltipOverlayElement;
    }
    tooltipOverlayElement = document.createElement("div");
    tooltipOverlayElement.id = "info-tooltip-overlay";
    tooltipOverlayElement.className = "info-tooltip-overlay";
    tooltipOverlayElement.setAttribute("role", "tooltip");
    tooltipOverlayElement.hidden = true;
    document.body.appendChild(tooltipOverlayElement);
    return tooltipOverlayElement;
}

function positionTooltipOverlay(tooltipButtonElement, tooltipOverlay) {
    const buttonBounds = tooltipButtonElement.getBoundingClientRect();
    tooltipOverlay.style.left = "0";
    tooltipOverlay.style.top = "0";
    tooltipOverlay.hidden = false;
    const overlayWidth = tooltipOverlay.offsetWidth;
    const overlayHeight = tooltipOverlay.offsetHeight;
    const viewportPadding = 8;
    const tooltipGap = 8;
    let leftPosition =
        buttonBounds.left + buttonBounds.width / 2 - overlayWidth / 2;
    leftPosition = Math.max(
        viewportPadding,
        Math.min(
            leftPosition,
            window.innerWidth - overlayWidth - viewportPadding,
        ),
    );
    let topPosition = buttonBounds.top - overlayHeight - tooltipGap;
    let placement = "top";
    if (topPosition < viewportPadding) {
        topPosition = buttonBounds.bottom + tooltipGap;
        placement = "bottom";
    }
    if (topPosition + overlayHeight > window.innerHeight - viewportPadding) {
        topPosition = Math.max(
            viewportPadding,
            buttonBounds.top - overlayHeight - tooltipGap,
        );
        placement = "top";
    }
    tooltipOverlay.style.left = `${Math.round(leftPosition)}px`;
    tooltipOverlay.style.top = `${Math.round(topPosition)}px`;
    tooltipOverlay.dataset.placement = placement;
}

function hideInfoTooltip() {
    if (!(activeTooltipButton instanceof HTMLElement)) return;
    const tooltipOverlay = ensureTooltipOverlayElement();
    if (tooltipOverlay instanceof HTMLElement) {
        tooltipOverlay.hidden = true;
        tooltipOverlay.textContent = "";
        delete tooltipOverlay.dataset.placement;
    }
    activeTooltipButton.removeAttribute("aria-describedby");
    activeTooltipButton = null;
}

function showInfoTooltip(tooltipButtonElement) {
    const tooltipId = String(
        tooltipButtonElement.getAttribute("data-info-tooltip-id") ?? "",
    ).trim();
    const tooltipText = String(tooltipTextById.get(tooltipId) ?? "").trim();
    if (!tooltipText) {
        hideInfoTooltip();
        return;
    }
    const tooltipOverlay = ensureTooltipOverlayElement();
    if (!(tooltipOverlay instanceof HTMLElement)) return;
    if (
        activeTooltipButton instanceof HTMLElement &&
        activeTooltipButton !== tooltipButtonElement
    ) {
        activeTooltipButton.removeAttribute("aria-describedby");
    }
    activeTooltipButton = tooltipButtonElement;
    tooltipOverlay.textContent = tooltipText;
    tooltipOverlay.hidden = false;
    tooltipButtonElement.setAttribute("aria-describedby", tooltipOverlay.id);
    positionTooltipOverlay(tooltipButtonElement, tooltipOverlay);
}

function initInfoTooltipRuntime() {
    if (typeof document === "undefined") return;
    if (document.body?.dataset.infoTooltipRuntimeReady === "true") return;
    if (document.body) {
        document.body.dataset.infoTooltipRuntimeReady = "true";
    } else {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                document.body.dataset.infoTooltipRuntimeReady = "true";
            },
            { once: true },
        );
    }
    document.addEventListener("mouseover", (event) => {
        const hoveredElement = event.target;
        if (!(hoveredElement instanceof Element)) return;
        const tooltipButtonElement =
            hoveredElement.closest(".info-tooltip__btn");
        if (!(tooltipButtonElement instanceof HTMLButtonElement)) return;
        showInfoTooltip(tooltipButtonElement);
    });
    document.addEventListener("mouseout", (event) => {
        const originElement = event.target;
        if (!(originElement instanceof Element)) return;
        const tooltipButtonElement =
            originElement.closest(".info-tooltip__btn");
        if (!(tooltipButtonElement instanceof HTMLButtonElement)) return;
        const relatedElement = event.relatedTarget;
        if (
            relatedElement instanceof Element &&
            relatedElement.closest(".info-tooltip__btn") ===
                tooltipButtonElement
        ) {
            return;
        }
        hideInfoTooltip();
    });
    document.addEventListener("focusin", (event) => {
        const focusedElement = event.target;
        if (!(focusedElement instanceof Element)) return;
        const tooltipButtonElement =
            focusedElement.closest(".info-tooltip__btn");
        if (!(tooltipButtonElement instanceof HTMLButtonElement)) return;
        showInfoTooltip(tooltipButtonElement);
    });
    document.addEventListener("focusout", (event) => {
        const blurredElement = event.target;
        if (!(blurredElement instanceof Element)) return;
        const tooltipButtonElement =
            blurredElement.closest(".info-tooltip__btn");
        if (!(tooltipButtonElement instanceof HTMLButtonElement)) return;
        const nextFocusedElement = event.relatedTarget;
        if (
            nextFocusedElement instanceof Element &&
            nextFocusedElement.closest(".info-tooltip__btn") ===
                tooltipButtonElement
        ) {
            return;
        }
        hideInfoTooltip();
    });
    window.addEventListener("scroll", hideInfoTooltip, true);
    window.addEventListener("resize", hideInfoTooltip);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            hideInfoTooltip();
        }
    });
}

export function renderInfoTooltip(text, ariaLabel = "More information", id) {
    const uid = id ?? `info-tooltip-${++tooltipSequence}`;
    tooltipTextById.set(uid, String(text ?? ""));
    return `<span class="info-tooltip" data-info-tooltip="${uid}">
      <button
        class="info-tooltip__btn"
        type="button"
        aria-label="${escapeHtml(ariaLabel)}"
        data-info-tooltip-id="${uid}"
        tabindex="0"
      >ℹ</button>
    </span>`;
}

initInfoTooltipRuntime();
