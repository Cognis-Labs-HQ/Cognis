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
let focusedTooltipButton = null;
let hoveredTooltipButton = null;
let hoveredPanelButton = null;
let dismissedTooltipButtons = new WeakSet();
let addedDescription = false;
let runtimeDocument = null;
let runtimeEventAbortController = null;
let runtimeObserver = null;
const tooltipTextById = new Map();

function getOrCreateTooltipOverlay() {
    if (typeof document === "undefined") return null;
    if (tooltipOverlayElement?.isConnected) {
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
    tooltipOverlay.style.setProperty("--info-tooltip-gap", `${tooltipGap}px`);
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
    if (tooltipOverlayElement) {
        tooltipOverlayElement.hidden = true;
        if (tooltipOverlayElement.hasChildNodes())
            tooltipOverlayElement.textContent = "";
        delete tooltipOverlayElement.dataset.placement;
    }
    releaseActiveTooltip();
    hoveredPanelButton = null;
}

function releaseActiveTooltip() {
    if (activeTooltipButton && addedDescription) {
        const descriptions = descriptionTokens(activeTooltipButton).filter(
            (token) => token !== tooltipOverlayElement.id,
        );
        if (descriptions.length) {
            activeTooltipButton.setAttribute(
                "aria-describedby",
                descriptions.join(" "),
            );
        } else {
            activeTooltipButton.removeAttribute("aria-describedby");
        }
    }
    addedDescription = false;
    activeTooltipButton = null;
}

function descriptionTokens(button) {
    return (button.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean);
}

function showInfoTooltip(button) {
    if (activeTooltipButton === button && !tooltipOverlayElement?.hidden)
        return;
    const tooltipId = String(
        button.getAttribute("data-info-tooltip-id") ?? "",
    ).trim();
    const tooltipText = String(tooltipTextById.get(tooltipId) ?? "").trim();
    if (!tooltipText) {
        hideInfoTooltip();
        return;
    }
    const overlay = getOrCreateTooltipOverlay();
    if (!overlay) return;
    releaseActiveTooltip();
    activeTooltipButton = button;
    if (hoveredPanelButton) hoveredPanelButton = button;
    overlay.textContent = tooltipText;
    const descriptions = descriptionTokens(button);
    addedDescription = !descriptions.includes(overlay.id);
    if (addedDescription) {
        button.setAttribute(
            "aria-describedby",
            [...descriptions, overlay.id].join(" "),
        );
    }
    positionTooltipOverlay(button, overlay);
}

function hasInteraction(button) {
    return (
        button &&
        (button === focusedTooltipButton ||
            button === hoveredTooltipButton ||
            button === hoveredPanelButton)
    );
}

function releaseDismissal(button) {
    if (button && !hasInteraction(button))
        dismissedTooltipButtons.delete(button);
}

function isConnectedOwner(button) {
    return button?.isConnected && button.ownerDocument === runtimeDocument;
}

function connectedInteraction(button) {
    if (isConnectedOwner(button)) return button;
    if (button) dismissedTooltipButtons.delete(button);
    return null;
}

function reconcileInfoTooltip(preferredButton) {
    focusedTooltipButton = connectedInteraction(focusedTooltipButton);
    hoveredTooltipButton = connectedInteraction(hoveredTooltipButton);
    hoveredPanelButton = connectedInteraction(hoveredPanelButton);
    if (
        !isConnectedOwner(activeTooltipButton) ||
        !tooltipOverlayElement?.isConnected
    ) {
        hideInfoTooltip();
    }
    const nextButton = [
        preferredButton,
        activeTooltipButton,
        focusedTooltipButton,
        hoveredTooltipButton,
        hoveredPanelButton,
    ].find(
        (button) =>
            isConnectedOwner(button) &&
            hasInteraction(button) &&
            !dismissedTooltipButtons.has(button),
    );
    if (nextButton) showInfoTooltip(nextButton);
    else hideInfoTooltip();
}

function dismissInfoTooltip() {
    const panelButton = hoveredPanelButton;
    for (const button of [
        focusedTooltipButton,
        hoveredTooltipButton,
        hoveredPanelButton,
    ]) {
        if (button) dismissedTooltipButtons.add(button);
    }
    hideInfoTooltip();
    releaseDismissal(panelButton);
}

function resetInfoTooltip() {
    hideInfoTooltip();
    focusedTooltipButton = null;
    hoveredTooltipButton = null;
    hoveredPanelButton = null;
    dismissedTooltipButtons = new WeakSet();
}

function tooltipButtonAt(target) {
    if (!target) return null;
    const ownerWindow = runtimeDocument.defaultView;
    const element =
        target instanceof ownerWindow.Element ? target : target.parentElement;
    const button = element?.closest(".info-tooltip__btn");
    return button instanceof ownerWindow.HTMLButtonElement ? button : null;
}

function isTooltipPanel(target) {
    return (
        target instanceof runtimeDocument.defaultView.Node &&
        tooltipOverlayElement?.contains(target)
    );
}

function enterInfoTooltip(event) {
    const button = tooltipButtonAt(event.target);
    if (button) {
        if (tooltipButtonAt(event.relatedTarget) === button) return;
        const previousButton = hoveredTooltipButton;
        hoveredTooltipButton = button;
        hoveredPanelButton = null;
        releaseDismissal(previousButton);
        reconcileInfoTooltip(button);
    } else if (isTooltipPanel(event.target) && !tooltipOverlayElement.hidden) {
        if (isTooltipPanel(event.relatedTarget)) return;
        const previousButton = hoveredTooltipButton;
        hoveredTooltipButton = null;
        hoveredPanelButton = activeTooltipButton;
        releaseDismissal(previousButton);
        reconcileInfoTooltip();
    }
}

function leaveInfoTooltip(event) {
    const button = tooltipButtonAt(event.target);
    const nextButton = tooltipButtonAt(event.relatedTarget);
    if (button) {
        if (nextButton === button) return;
        if (hoveredTooltipButton === button) hoveredTooltipButton = nextButton;
        if (
            activeTooltipButton === button &&
            isTooltipPanel(event.relatedTarget)
        ) {
            hoveredPanelButton = button;
        }
        releaseDismissal(button);
        reconcileInfoTooltip(nextButton);
    } else if (isTooltipPanel(event.target)) {
        if (isTooltipPanel(event.relatedTarget)) return;
        const previousButton = hoveredPanelButton;
        hoveredPanelButton = null;
        hoveredTooltipButton = nextButton;
        releaseDismissal(previousButton);
        reconcileInfoTooltip(nextButton);
    }
}

function initInfoTooltipRuntime() {
    if (typeof document === "undefined") return;
    if (runtimeDocument === document) {
        reconcileInfoTooltip();
        return;
    }
    resetInfoTooltip();
    runtimeEventAbortController?.abort();
    runtimeObserver?.disconnect();
    tooltipOverlayElement = null;
    if (runtimeDocument) tooltipTextById.clear();
    runtimeDocument = document;
    runtimeEventAbortController = new window.AbortController();
    const runtimeEventSignal = runtimeEventAbortController.signal;
    document.addEventListener("mouseover", enterInfoTooltip, {
        signal: runtimeEventSignal,
    });
    document.addEventListener("mouseout", leaveInfoTooltip, {
        signal: runtimeEventSignal,
    });
    document.addEventListener(
        "focusin",
        (event) => {
            const previousButton = focusedTooltipButton;
            focusedTooltipButton = tooltipButtonAt(event.target);
            releaseDismissal(previousButton);
            reconcileInfoTooltip(focusedTooltipButton);
        },
        { signal: runtimeEventSignal },
    );
    document.addEventListener(
        "focusout",
        (event) => {
            const button = tooltipButtonAt(event.target);
            const nextButton = tooltipButtonAt(event.relatedTarget);
            if (!button || button === nextButton) return;
            if (focusedTooltipButton === button)
                focusedTooltipButton = nextButton;
            releaseDismissal(button);
            reconcileInfoTooltip(nextButton);
        },
        { signal: runtimeEventSignal },
    );
    window.addEventListener("scroll", dismissInfoTooltip, {
        capture: true,
        signal: runtimeEventSignal,
    });
    window.addEventListener("resize", dismissInfoTooltip, {
        signal: runtimeEventSignal,
    });
    window.addEventListener(
        "pagehide",
        () => {
            runtimeObserver.disconnect();
            resetInfoTooltip();
        },
        { signal: runtimeEventSignal },
    );
    window.addEventListener(
        "pageshow",
        () => {
            runtimeObserver.observe(runtimeDocument, {
                childList: true,
                subtree: true,
            });
        },
        { signal: runtimeEventSignal },
    );
    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Escape") dismissInfoTooltip();
        },
        { signal: runtimeEventSignal },
    );
    runtimeObserver = new window.MutationObserver(() => {
        if (
            focusedTooltipButton &&
            tooltipButtonAt(runtimeDocument.activeElement) !==
                focusedTooltipButton
        ) {
            const previousButton = focusedTooltipButton;
            focusedTooltipButton = null;
            releaseDismissal(previousButton);
        }
        reconcileInfoTooltip();
    });
    runtimeObserver.observe(document, { childList: true, subtree: true });
}

export function renderInfoTooltip(text, ariaLabel = "More information", id) {
    initInfoTooltipRuntime();
    const baseTooltipId = id ?? "info-tooltip";
    const tooltipId = `${baseTooltipId}-${++tooltipSequence}`;
    tooltipTextById.set(tooltipId, String(text ?? ""));
    return `<span class="info-tooltip" data-info-tooltip="${escapeHtml(tooltipId)}">
      <button
        class="info-tooltip__btn"
        type="button"
        aria-label="${escapeHtml(ariaLabel)}"
        data-info-tooltip-id="${escapeHtml(tooltipId)}"
        tabindex="0"
      >ℹ</button>
    </span>`;
}
