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

import { escapeHtml } from "../escape-html.js";
import { pickInitialsColor } from "../avatar-utils.js";

const POINTER_STYLE_STORAGE_KEY = "cognis_page_pointer_style";
const POINTER_STYLES = ["mouse", "laser", "crosshair"];
const POINTER_SEND_THROTTLE_MS = 120;
const POINTER_VISIBLE_MS = 5000;

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

function renderPointerIcon(style) {
    if (style === "laser") {
        return '<span class="page-pointer__laser" aria-hidden="true"></span>';
    }
    if (style === "crosshair") {
        return '<span class="page-pointer__crosshair" aria-hidden="true"></span>';
    }
    return '<span class="page-pointer__mouse" aria-hidden="true">➤</span>';
}

export function createPointerTracker({
    contentGrid,
    i18n,
    requestPresenceUpdate,
} = {}) {
    if (!(contentGrid instanceof HTMLElement)) {
        return {
            getPointerPayload: () => null,
            render: () => {},
            destroy: () => {},
        };
    }

    let pointerStyle = normalizeStyle(
        window.localStorage.getItem(POINTER_STYLE_STORAGE_KEY),
    );
    let pointerPayload = null;
    let destroyed = false;
    let lastSentAt = 0;
    const overlay = document.createElement("div");
    overlay.className = "page-pointer-layer";
    overlay.setAttribute("aria-hidden", "true");
    contentGrid.appendChild(overlay);

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
        button.innerHTML = renderPointerIcon(pointerStyle);
    }

    function sendSoon() {
        const now = Date.now();
        if (now - lastSentAt < POINTER_SEND_THROTTLE_MS) return;
        lastSentAt = now;
        requestPresenceUpdate?.();
    }

    function recordPointer(event) {
        if (destroyed) return;
        const bounds = contentGrid.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        pointerPayload = {
            x: Math.min(
                1,
                Math.max(0, (event.clientX - bounds.left) / bounds.width),
            ),
            y: Math.min(
                1,
                Math.max(0, (event.clientY - bounds.top) / bounds.height),
            ),
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
        const now = Date.now();
        overlay.innerHTML = entries
            .filter(
                (entry) => String(entry?.sessionId ?? "") !== currentSessionId,
            )
            .filter((entry) => entry?.pointer && entry.active !== false)
            .filter((entry) => {
                const updatedAt = Date.parse(entry.pointer.updatedAt || "");
                return (
                    Number.isFinite(updatedAt) &&
                    now - updatedAt <= POINTER_VISIBLE_MS
                );
            })
            .map((entry) => {
                const pointer = entry.pointer;
                const x = Math.min(1, Math.max(0, Number(pointer.x ?? 0)));
                const y = Math.min(1, Math.max(0, Number(pointer.y ?? 0)));
                const style = normalizeStyle(pointer.style);
                const displayName = getDisplayName(entry);
                const color = getPointerColor(entry);
                return `<div class="page-pointer page-pointer--${escapeHtml(style)}" style="--pointer-x:${x}; --pointer-y:${y}; --pointer-color:${escapeHtml(color)};"><div class="page-pointer__icon">${renderPointerIcon(style)}</div><div class="page-pointer__label">${escapeHtml(displayName)}</div></div>`;
            })
            .join("");
    }

    function destroy() {
        destroyed = true;
        contentGrid.removeEventListener("pointermove", recordPointer);
        button.removeEventListener("click", cycleStyle);
        overlay.remove();
        button.remove();
    }

    updateButton();
    document.body.appendChild(button);
    contentGrid.addEventListener("pointermove", recordPointer, {
        passive: true,
    });
    button.addEventListener("click", cycleStyle);

    return { getPointerPayload, render, destroy };
}
