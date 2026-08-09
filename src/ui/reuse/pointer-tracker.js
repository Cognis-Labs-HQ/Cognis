/**
 * Page composer pointer tracker.
 *
 * Public exports:
 *   createPointerTracker(options) — records local pointer movement within a
 *     composer content grid, renders remote pointers, and mounts the pointer
 *     style switcher button used by pages that opt in through page composer.
 *
 * Usage:
 *   const tracker = createPointerTracker({
 *     contentGrid,
 *     i18n,
 *     requestPresenceUpdate: () => void sendPresence(true),
 *   });
 *   tracker.render(remotePresenceEntries, currentSessionId);
 *
 * @param {object} options - Pointer tracker options.
 * @returns {{ getPointerPayload(): object|null, render(entries: Array<object>, sessionId: string): void, destroy(): void }}
 */

import { escapeHtml } from "./escape-html.js";
import { pickInitialsColor } from "./avatar-utils.js";
import { uiCtx } from "./ui-ctx.js";

const POINTER_STYLE_STORAGE_KEY = "cognis_page_pointer_style";
const POINTER_STYLES = ["mouse", "laser", "crosshair"];
const POINTER_SEND_THROTTLE_MS = 120;

function normalizeStyle(value) {
    return POINTER_STYLES.includes(value) ? value : "mouse";
}

function resolveLabel(i18n, key, fallback) {
    const translated = i18n?.t?.(key);
    return translated && translated !== key ? translated : fallback;
}

function getDisplayName(entry) {
    return String(entry?.displayName || entry?.handle || entry?.id || "Guest")
        .replace(/^#+/, "")
        .trim();
}

function getPointerColor(entry) {
    return pickInitialsColor(entry?.handle || getDisplayName(entry));
}

function normalizeSelectionItems(selection) {
    const items = Array.isArray(selection?.items) ? selection.items : [];
    return items
        .map((item) => {
            const x = Number(item?.x);
            const y = Number(item?.y);
            const width = Number(item?.width);
            const height = Number(item?.height);
            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !Number.isFinite(width) ||
                !Number.isFinite(height) ||
                width <= 0 ||
                height <= 0
            ) {
                return null;
            }
            return {
                x,
                y,
                width,
                height,
            };
        })
        .filter(Boolean);
}

function renderPointerIcon(style) {
    if (style === "laser") {
        return '<span class="page-pointer__laser-dot" aria-hidden="true"></span>';
    }
    if (style === "crosshair") {
        return '<span class="page-pointer__crosshair" aria-hidden="true"></span>';
    }
    return '<span class="page-pointer__mouse" aria-hidden="true">➤</span>';
}

function renderPointerButtonIcon(style) {
    if (style === "laser") {
        return '<span class="pointer-style-toggle__laser" aria-hidden="true"></span>';
    }
    return renderPointerIcon(style);
}

export function createPointerTracker({
    contentGrid,
    overlayRoot = null,
    i18n,
    requestPresenceUpdate,
    noteActivity,
    getPointerOffset,
} = {}) {
    if (!(contentGrid instanceof HTMLElement)) {
        return {
            getPointerPayload: () => null,
            render: () => {},
            destroy: () => {},
        };
    }

    const renderRoot =
        overlayRoot instanceof HTMLElement ? overlayRoot : contentGrid;
    let pointerStyle = normalizeStyle(
        window.localStorage.getItem(POINTER_STYLE_STORAGE_KEY),
    );
    let pointerPayload = null;
    let destroyed = false;
    let lastSentAt = 0;
    let removePageAction = null;
    const overlay = document.createElement("div");
    overlay.className = "page-pointer-layer";
    overlay.setAttribute("aria-hidden", "true");
    renderRoot.appendChild(overlay);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pointer-style-toggle";

    function updateButton() {
        const label = resolveLabel(
            i18n,
            "ui.reuse.pointer_style",
            "Pointer style",
        );
        const styleLabel = resolveLabel(
            i18n,
            `ui.reuse.pointer_${pointerStyle}`,
            pointerStyle,
        );
        button.title = `${label}: ${styleLabel}`;
        button.setAttribute("aria-label", button.title);
        button.dataset.pointerStyle = pointerStyle;
        button.innerHTML = renderPointerButtonIcon(pointerStyle);
    }

    function sendSoon() {
        const now = Date.now();
        if (now - lastSentAt < POINTER_SEND_THROTTLE_MS) return;
        lastSentAt = now;
        requestPresenceUpdate?.();
    }

    function currentPointerOffset() {
        const offset =
            typeof getPointerOffset === "function" ? getPointerOffset() : null;
        return {
            x: Number(offset?.x) || 0,
            y: Number(offset?.y) || 0,
        };
    }

    function recordPointer(event) {
        if (destroyed) return;
        const bounds = renderRoot.getBoundingClientRect();
        const trackingWidth = Math.max(renderRoot.scrollWidth, bounds.width);
        const trackingHeight = Math.max(renderRoot.scrollHeight, bounds.height);
        if (
            !bounds.width ||
            !bounds.height ||
            !trackingWidth ||
            !trackingHeight
        )
            return;
        noteActivity?.();
        const offset = currentPointerOffset();
        pointerPayload = {
            x:
                (event.clientX -
                    bounds.left +
                    renderRoot.scrollLeft +
                    offset.x) /
                trackingWidth,
            y:
                (event.clientY - bounds.top + renderRoot.scrollTop + offset.y) /
                trackingHeight,
            style: pointerStyle,
            updatedAt: new Date().toISOString(),
        };
        sendSoon();
    }

    function cycleStyle() {
        const index = POINTER_STYLES.indexOf(pointerStyle);
        pointerStyle = POINTER_STYLES[(index + 1) % POINTER_STYLES.length];
        window.localStorage.setItem(POINTER_STYLE_STORAGE_KEY, pointerStyle);
        if (pointerPayload) {
            noteActivity?.();
            pointerPayload = {
                ...pointerPayload,
                style: pointerStyle,
                updatedAt: new Date().toISOString(),
            };
        }
        updateButton();
        sendSoon();
    }

    function getPointerPayload() {
        if (!pointerPayload) return null;
        return { ...pointerPayload, style: pointerStyle };
    }

    function render(entries = [], currentSessionId = "") {
        if (destroyed) return;
        overlay.innerHTML = entries
            .filter(
                (entry) => String(entry?.sessionId ?? "") !== currentSessionId,
            )
            .filter((entry) => entry?.active !== false)
            .flatMap((entry) => {
                const displayName = getDisplayName(entry);
                const color = getPointerColor(entry);
                const rootWidth = Math.max(
                    renderRoot.scrollWidth,
                    renderRoot.clientWidth,
                );
                const rootHeight = Math.max(
                    renderRoot.scrollHeight,
                    renderRoot.clientHeight,
                );
                const selectionItems = normalizeSelectionItems(entry.selection);
                const selectionMarkup = selectionItems.map((item, index) => {
                    const offset = currentPointerOffset();
                    const left =
                        item.x * rootWidth - renderRoot.scrollLeft - offset.x;
                    const top =
                        item.y * rootHeight - renderRoot.scrollTop - offset.y;
                    const width = item.width * rootWidth;
                    const height = item.height * rootHeight;
                    return `<div class="page-selection" style="--selection-x:${left}px; --selection-y:${top}px; --selection-width:${width}px; --selection-height:${height}px; --selection-color:${escapeHtml(color)};"><div class="page-selection__label">${index === 0 ? escapeHtml(displayName) : ""}</div></div>`;
                });
                if (!entry?.pointer) return selectionMarkup;
                const updatedAt = Date.parse(entry.pointer.updatedAt || "");
                if (!Number.isFinite(updatedAt)) return selectionMarkup;
                const pointer = entry.pointer;
                const x = Number(pointer.x ?? 0);
                const y = Number(pointer.y ?? 0);
                const offset = currentPointerOffset();
                const pointerLeft =
                    x * rootWidth - renderRoot.scrollLeft - offset.x;
                const pointerTop =
                    y * rootHeight - renderRoot.scrollTop - offset.y;
                const style = normalizeStyle(pointer.style);
                return [
                    ...selectionMarkup,
                    `<div class="page-pointer page-pointer--${escapeHtml(style)}" style="--pointer-x:${pointerLeft}px; --pointer-y:${pointerTop}px; --pointer-color:${escapeHtml(color)};"><div class="page-pointer__icon">${renderPointerIcon(style)}</div><div class="page-pointer__label">${escapeHtml(displayName)}</div></div>`,
                ];
            })
            .join("");
    }

    function destroy() {
        destroyed = true;
        contentGrid.removeEventListener("pointermove", recordPointer);
        button.removeEventListener("click", cycleStyle);
        overlay.remove();
        removePageAction?.();
        removePageAction = null;
        button.remove();
    }

    updateButton();
    const pageActionRegistry = uiCtx.capabilities.get("page:actions");
    if (pageActionRegistry?.add) {
        removePageAction = pageActionRegistry.add({
            id: "presence:pointer-style",
            element: button,
            order: 20,
        });
    }
    contentGrid.addEventListener("pointermove", recordPointer, {
        passive: true,
    });
    button.addEventListener("click", cycleStyle);

    return { getPointerPayload, render, destroy };
}
