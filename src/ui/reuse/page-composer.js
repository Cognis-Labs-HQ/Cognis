/**
 * Page composer — orchestrates the full dashboard layout for a page. For pages
 * without sub-page navigation, renders a free-form grid (Android-widget-style)
 * where elements are absolutely positioned, draggable, and resizable. For
 * sub-page navigation pages (settings, administration, docs), renders the
 * traditional vertical list with section switching.
 *
 * Layouts are persisted to the user-preferences API under the caller-supplied key
 * so each page retains its own arrangement independently.
 *
 * Public exports:
 *   createPageComposer(root, options) — creates a layout composer and returns
 *     an instance with init() and refresh() methods.
 *
 * Usage:
 *   const composer = createPageComposer(document.querySelector('#app'), {
 *     allowCustomization: true,
 *     elements: [
 *       {
 *         id: 'modules',
 *         label: 'Modules',
 *         render: () => '<h2>Modules</h2>...',
 *         gridSize: { default: [4, 3], min: [2, 2], max: [6, 4] },
 *       },
 *       { id: 'pinned-widget', label: 'Widget', render: () => '...', pinned: true },
 *     ],
 *     preferenceKey: 'administration-layout',
 *     i18n,
 *     pageContext: { title: 'Administration', subtitle: 'Admin tools and controls.' },
 *     onRender: () => bindMyPageEvents(),
 *   });
 *   await composer.init();
 *   // Later, re-render with fresh data:
 *   composer.refresh(updatedElements);
 *
 * Sub-page navigation:
 *   Pass subPageNavigation: true to show only one element at a time. Toolbar
 *   buttons with [data-composer-scroll] become section selectors — clicking one
 *   shows that section, hides the others, and marks the button active. The active
 *   section is also reflected in the URL hash so deep-links work.
 *
 * Pinned elements:
 *   Set pinned: true on an element to prevent it from being removed by the user.
 *   Pinned elements still appear in the drag handle for reordering but have no
 *   remove button.
 *
 * Grid size:
 *   Each element may declare a gridSize field to control its size on the grid.
 *   Example: gridSize: { default: [4, 3], min: [2, 2], max: [6, 4] }
 *   When absent, defaults to { default: [4, 3], min: [2, 2] }.
 *   Each value is [width, height] in grid units (90 px each).
 *   Magic string values for max:
 *     'full'  — spans all available columns (full width).
 *     'half'  — spans half the available columns (half width).
 *   To apply half on both axes (quadrant), use max: ['half', 'half'].
 *   To mix, use max: ['half', n] (half-width, numeric max height) or
 *   max: [n, 'half'] (numeric max width, half-height).
 *
 * Multi-column layout:
 *   Pass columns: 2 to render the content grid in two columns (sub-page navigation
 *   path only). Grid mode handles layout natively and ignores this option.
 *
 * Sub-composer heading:
 *   Pass heading: 'Section title' in subComposerOptions to render an h2 above the
 *   sub-composer grid. The heading is rendered outside the inner grid container so
 *   it is preserved across re-renders triggered by resize or sub-page switching.
 *
 * @param {HTMLElement} root - The #app root element for the page.
 * @param {{
 *   allowCustomization: boolean,
 *   elements: Array<{
 *     id: string,
 *     label: string,
 *     render: () => string,
 *     onRender?: () => void,
 *     onUnmount?: () => void,
 *     pinned?: boolean,
 *     gridSize?: { default: [number, number], min: [number, number], max?: [number, number] | 'full' | 'half' | ['half'|number, 'half'|number] },
 *   }>,
 *   preferenceKey: string,
 *   i18n: object,
 *   onRender?: () => void,
 *   pageContext?: { title: string, subtitle: string },
 *   toolbar?: Array<{ id: string, label: string, render: () => string }>,
 *   floatingMenu?: Array<{ id: string, label: string, render: () => string }>,
 *   subPageNavigation?: boolean,
 *   columns?: number,
 *   showTopbar?: boolean,
 *   showNavbar?: boolean,
 *   showThemeToggle?: boolean,
 *   showFooter?: boolean,
 *   persistLayoutPreferences?: boolean,
 *   pageOverrides?: Record<string, { showThemeToggle?: boolean }>,
 *   onBeforeSubPageSwitch?: (fromId: string|null, toId: string) => Promise<boolean>,
 * }} options
 * @returns {{ init(): Promise<void>, refresh(elements: Array): void, getFloatingSlot(id: string): HTMLElement|null, showToast(message: string, options?: object): () => void }}
 */

import { apiFetch } from "./api-client.js";
import { renderDashboardLayout } from "../layouts/dashboard-layout.js";
import { prefersReducedMotion } from "./motion.js";
import { showToast, configureToastDismissLabel } from "./toast.js";

export function createPageComposer(
    root,
    {
        allowCustomization,
        elements: initialElements,
        preferenceKey,
        i18n,
        onRender,
        pageContext,
        toolbar = [],
        floatingMenu = [],
        subPageNavigation = false,
        columns = 1,
        showTopbar = true,
        showNavbar = true,
        showThemeToggle = true,
        showFooter = true,
        frameless = false,
        persistLayoutPreferences = true,
        pageOverrides = {},
        onBeforeSubPageSwitch,
    },
) {
    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    let elements = initialElements;
    let layout = null;
    let editing = false;
    let dragSourceId = null;
    let contentGrid = null;
    let activeSubPageId = null;
    let panelPosition = null;
    let layoutSnapshot = null;
    let gridCols = 1;
    let gridRows = 6;
    let resizeObserver = null;
    let lastObservedCols = 0;
    let gridSection = null;
    let editToggleAbortController = null;

    const UNIT = 90; // grid cell size in pixels
    const TOOLBAR_COLLAPSE_EXPAND_ICON = "▸";
    const TOOLBAR_COLLAPSE_COLLAPSE_ICON = "◂";

    function handleBeforeUnload(e) {
        e.preventDefault();
        e.returnValue = "";
    }

    let activeEdits = 0;

    function beginEditMode() {
        activeEdits++;
        if (activeEdits === 1) {
            window.addEventListener("beforeunload", handleBeforeUnload);
        }
    }

    function endEditMode() {
        activeEdits = Math.max(0, activeEdits - 1);
        if (activeEdits === 0) {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        }
    }

    async function loadLayout() {
        const account = localStorage.getItem("cognis_account");
        const token = localStorage.getItem("cognis_token");
        if (!account || !token) return null;
        try {
            const response = await apiFetch(
                `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(preferenceKey)}`,
            );
            if (!response.ok) return null;
            const payload = await response.json();
            const raw = payload?.data?.layoutJson;
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async function saveLayout() {
        const account = localStorage.getItem("cognis_account");
        const token = localStorage.getItem("cognis_token");
        if (!account || !token) return;
        await apiFetch(
            `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(preferenceKey)}`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ layout }),
            },
        );
    }

    function getGridSize(el) {
        const maxVal = el.gridSize?.max;

        if (maxVal === "full") {
            return {
                default: el.gridSize.default ?? [4, 3],
                min: el.gridSize.min ?? [2, 2],
                max: null,
                fullWidth: true,
                halfWidth: false,
                halfHeight: false,
            };
        }

        if (maxVal === "half") {
            return {
                default: el.gridSize?.default ?? [4, 3],
                min: el.gridSize?.min ?? [2, 2],
                max: null,
                fullWidth: false,
                halfWidth: true,
                halfHeight: false,
            };
        }

        let resolvedMax = maxVal ?? null;
        let halfWidth = false;
        let halfHeight = false;

        if (Array.isArray(maxVal)) {
            halfWidth = maxVal[0] === "half";
            halfHeight = maxVal[1] === "half";
            const rW = halfWidth ? null : (maxVal[0] ?? null);
            const rH = halfHeight ? null : (maxVal[1] ?? null);
            resolvedMax = rW === null && rH === null ? null : [rW, rH];
        }

        return {
            default: el.gridSize?.default ?? [4, 3],
            min: el.gridSize?.min ?? [2, 2],
            max: resolvedMax,
            fullWidth: false,
            halfWidth,
            halfHeight,
        };
    }

    function computeGridDimensions() {
        if (!contentGrid) return;
        contentGrid.style.width = "";
        const width = contentGrid.getBoundingClientRect().width;
        gridCols = Math.max(1, Math.floor(width / UNIT));
        const visiblePlacements = (layout?.placements ?? []).filter(
            (p) => !(layout?.hidden ?? []).includes(p.id),
        );
        const maxBottom = visiblePlacements.reduce(
            (m, p) => Math.max(m, p.row + p.h),
            0,
        );
        const extra = editing ? 1 : 0;
        gridRows = Math.max(editing ? 6 : 1, maxBottom + extra);
        contentGrid.style.minHeight = `${gridRows * UNIT}px`;
        contentGrid.style.width = `${gridCols * UNIT}px`;
        if (editing && gridSection) {
            gridSection.style.minHeight = `${gridRows * UNIT}px`;
            gridSection.style.width = `${gridCols * UNIT}px`;
        }
    }

    function canPlace(col, row, w, h, excludeId) {
        if (col < 0 || row < 0 || col + w > gridCols) return false;
        const occupied = new Set();
        for (const placement of layout?.placements ?? []) {
            if (placement.id === excludeId) continue;
            if ((layout?.hidden ?? []).includes(placement.id)) continue;
            for (let r = placement.row; r < placement.row + placement.h; r++) {
                for (
                    let c = placement.col;
                    c < placement.col + placement.w;
                    c++
                ) {
                    occupied.add(`${c},${r}`);
                }
            }
        }
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (occupied.has(`${c},${r}`)) return false;
            }
        }
        return true;
    }

    function applyGravity(col, row, w, h, excludeId) {
        for (let r = 0; r <= row; r++) {
            if (canPlace(col, r, w, h, excludeId)) return r;
        }
        return row;
    }

    function findSwapCandidate(col, row, w, h, excludeId) {
        const displaced = [];
        for (const placement of layout?.placements ?? []) {
            if (placement.id === excludeId) continue;
            if ((layout?.hidden ?? []).includes(placement.id)) continue;
            const overlapsH =
                col < placement.col + placement.w && col + w > placement.col;
            const overlapsV =
                row < placement.row + placement.h && row + h > placement.row;
            if (overlapsH && overlapsV) displaced.push(placement);
        }
        if (displaced.length !== 1) return null;
        const candidate = displaced[0];
        const source = layout.placements.find((p) => p.id === excludeId);
        if (!source) return null;
        if (source.col + candidate.w > gridCols) return null;
        const others = (layout?.placements ?? []).filter(
            (p) =>
                p.id !== excludeId &&
                p.id !== candidate.id &&
                !(layout?.hidden ?? []).includes(p.id),
        );
        const occupied = new Set();
        for (const placement of others) {
            for (let r = placement.row; r < placement.row + placement.h; r++) {
                for (
                    let c = placement.col;
                    c < placement.col + placement.w;
                    c++
                ) {
                    occupied.add(`${c},${r}`);
                }
            }
        }
        for (let r = source.row; r < source.row + candidate.h; r++) {
            for (let c = source.col; c < source.col + candidate.w; c++) {
                if (occupied.has(`${c},${r}`)) return null;
            }
        }
        const postSwapColsOverlap =
            candidate.col < source.col + candidate.w &&
            candidate.col + w > source.col;
        const postSwapRowsOverlap =
            candidate.row < source.row + candidate.h &&
            candidate.row + h > source.row;
        if (postSwapColsOverlap && postSwapRowsOverlap) return null;
        return candidate;
    }

    function buildDropZoneLine(srcCol, srcRow, candidate, tgtCol, tgtRow) {
        const line = document.createElement("div");
        line.className = "composer-dropzone-line";
        const dCol = Math.abs(tgtCol - srcCol);
        const dRow = Math.abs(tgtRow - srcRow);
        if (dCol >= dRow) {
            line.classList.add("composer-dropzone-line--v");
            const lineX =
                tgtCol >= srcCol
                    ? (candidate.col + candidate.w) * UNIT
                    : candidate.col * UNIT;
            line.style.left = `${lineX}px`;
            line.style.top = `${candidate.row * UNIT}px`;
            line.style.height = `${candidate.h * UNIT}px`;
        } else {
            line.classList.add("composer-dropzone-line--h");
            const lineY =
                tgtRow >= srcRow
                    ? (candidate.row + candidate.h) * UNIT
                    : candidate.row * UNIT;
            line.style.top = `${lineY}px`;
            line.style.left = `${candidate.col * UNIT}px`;
            line.style.width = `${candidate.w * UNIT}px`;
        }
        return line;
    }

    function initializePlacements() {
        if (!layout.placements) layout.placements = [];
        if (!layout.hidden) layout.hidden = [];
        layout.placements = layout.placements.filter((p) =>
            elements.some((e) => e.id === p.id),
        );
        layout.hidden = layout.hidden.filter((id) =>
            elements.some((e) => e.id === id),
        );
        for (const el of elements) {
            if (layout.hidden.includes(el.id)) continue;
            if (layout.placements.some((p) => p.id === el.id)) continue;
            if (el.defaultHidden && !el.pinned) {
                layout.hidden.push(el.id);
                continue;
            }
            const gs = getGridSize(el);
            const w = gs.fullWidth
                ? gridCols
                : gs.halfWidth
                  ? Math.max(gs.min[0], Math.floor(gridCols / 2))
                  : Math.min(gs.default[0], gridCols);
            const h = gs.halfHeight
                ? Math.max(gs.min[1], Math.floor(gridRows / 2))
                : gs.default[1];
            let placed = false;
            for (let row = 0; !placed; row++) {
                for (let col = 0; col <= Math.max(0, gridCols - w); col++) {
                    if (canPlace(col, row, w, h, null)) {
                        layout.placements.push({ id: el.id, col, row, w, h });
                        placed = true;
                        break;
                    }
                }
            }
        }
    }

    function createGridOverlay() {
        const overlay = document.createElement("div");
        overlay.className = "composer-grid-overlay";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.width = `${gridCols * UNIT}px`;
        overlay.style.height = `${gridRows * UNIT}px`;
        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const cell = document.createElement("div");
                cell.className = "composer-grid-cell";
                cell.style.left = `${c * UNIT}px`;
                cell.style.top = `${r * UNIT}px`;
                cell.style.width = `${UNIT}px`;
                cell.style.height = `${UNIT}px`;
                overlay.appendChild(cell);
            }
        }
        return overlay;
    }

    function createCell(el, placement) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = el.id;
        cell.style.left = `${placement.col * UNIT}px`;
        cell.style.top = `${placement.row * UNIT}px`;
        cell.style.width = `${placement.w * UNIT}px`;
        cell.style.height = `${placement.h * UNIT}px`;

        if (editing) {
            cell.classList.add("composer-cell--editable");

            cell.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                if (e.target.closest("button")) return;
                e.preventDefault();
                cell.setPointerCapture(e.pointerId);

                const shade = document.createElement("div");
                shade.className = "composer-shade";
                shade.style.left = `${placement.col * UNIT}px`;
                shade.style.top = `${placement.row * UNIT}px`;
                shade.style.width = `${placement.w * UNIT}px`;
                shade.style.height = `${placement.h * UNIT}px`;
                gridSection.appendChild(shade);

                cell.classList.add("composer-cell--dragging");

                let currentCol = placement.col;
                let currentRow = placement.row;
                let swapTarget = null;
                let dropZoneLine = null;

                function onMove(e) {
                    const panel = document.getElementById(
                        "composer-elements-panel",
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    swapTarget = null;

                    if (overPanel && !el.pinned) {
                        shade.classList.add("composer-shade--invalid");
                        panel?.classList.add("composer-panel--drop-target");
                        return;
                    }
                    shade.classList.remove("composer-shade--invalid");
                    panel?.classList.remove("composer-panel--drop-target");

                    const gridRect = gridSection.getBoundingClientRect();
                    const x = e.clientX - gridRect.left;
                    const y = e.clientY - gridRect.top;
                    const col = Math.max(
                        0,
                        Math.min(
                            gridCols - placement.w,
                            Math.round(x / UNIT - placement.w / 2),
                        ),
                    );
                    const rawRow = Math.max(
                        0,
                        Math.round(y / UNIT - placement.h / 2),
                    );

                    if (rawRow + placement.h > gridRows) {
                        gridRows = rawRow + placement.h + 1;
                        gridSection.style.minHeight = `${gridRows * UNIT}px`;
                    }

                    currentCol = col;
                    currentRow = rawRow;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${rawRow * UNIT}px`;

                    if (
                        !canPlace(col, rawRow, placement.w, placement.h, el.id)
                    ) {
                        const candidate = findSwapCandidate(
                            col,
                            rawRow,
                            placement.w,
                            placement.h,
                            el.id,
                        );
                        if (candidate) {
                            swapTarget = candidate;
                            dropZoneLine = buildDropZoneLine(
                                placement.col,
                                placement.row,
                                candidate,
                                col,
                                rawRow,
                            );
                            gridSection.appendChild(dropZoneLine);
                        } else {
                            shade.classList.add("composer-shade--invalid");
                        }
                    }
                }

                async function onUp(e) {
                    cell.removeEventListener("pointermove", onMove);
                    cell.removeEventListener("pointerup", onUp);
                    cell.removeEventListener("pointercancel", onUp);
                    document
                        .getElementById("composer-elements-panel")
                        ?.classList.remove("composer-panel--drop-target");
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    shade.remove();
                    cell.classList.remove("composer-cell--dragging");

                    const panel = document.getElementById(
                        "composer-elements-panel",
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (overPanel && !el.pinned) {
                        layout.hidden.push(el.id);
                        layout.placements = layout.placements.filter(
                            (p) => p.id !== el.id,
                        );
                        renderGridComposer();
                        return;
                    }

                    const currentSwapTarget = swapTarget;
                    swapTarget = null;

                    if (currentSwapTarget) {
                        const targetPlacement = layout.placements.find(
                            (lp) => lp.id === el.id,
                        );
                        const swapPlacement = layout.placements.find(
                            (lp) => lp.id === currentSwapTarget.id,
                        );
                        if (targetPlacement && swapPlacement) {
                            const oldCol = targetPlacement.col;
                            const oldRow = targetPlacement.row;
                            targetPlacement.col = currentSwapTarget.col;
                            targetPlacement.row = currentSwapTarget.row;
                            swapPlacement.col = oldCol;
                            swapPlacement.row = oldRow;
                            renderGridComposer();
                        }
                    } else {
                        const moved =
                            currentCol !== placement.col ||
                            currentRow !== placement.row;
                        if (
                            moved &&
                            canPlace(
                                currentCol,
                                currentRow,
                                placement.w,
                                placement.h,
                                el.id,
                            )
                        ) {
                            const targetPlacement = layout.placements.find(
                                (lp) => lp.id === el.id,
                            );
                            if (targetPlacement) {
                                targetPlacement.col = currentCol;
                                targetPlacement.row = currentRow;
                            }
                            renderGridComposer();
                        }
                    }
                }

                cell.addEventListener("pointermove", onMove);
                cell.addEventListener("pointerup", onUp);
                cell.addEventListener("pointercancel", onUp);
            });

            if (!el.pinned) {
                const closeBtn = document.createElement("button");
                closeBtn.className = "composer-close-btn";
                closeBtn.type = "button";
                closeBtn.textContent = "×";
                closeBtn.setAttribute(
                    "aria-label",
                    i18n.t("ui.reuse.generic.remove"),
                );
                closeBtn.addEventListener("pointerdown", (e) =>
                    e.stopPropagation(),
                );
                closeBtn.addEventListener("click", () => {
                    layout.hidden.push(el.id);
                    layout.placements = layout.placements.filter(
                        (p) => p.id !== el.id,
                    );
                    renderGridComposer();
                });
                cell.appendChild(closeBtn);
            }
        }

        const content = document.createElement("div");
        content.className = "widget-card composer-cell-content";
        content.innerHTML = el.render();
        cell.appendChild(content);

        if (editing) {
            const gs = getGridSize(el);
            const canResizeE =
                !gs.fullWidth && (!gs.max || gs.max[0] > gs.min[0]);
            const canResizeS = !gs.max || gs.max[1] > gs.min[1];

            if (canResizeE) {
                const handleE = document.createElement("div");
                handleE.className = "composer-resize-handle composer-resize-e";
                bindResizeHandle(handleE, "e", el, placement);
                cell.appendChild(handleE);
            }
            if (canResizeS) {
                const handleS = document.createElement("div");
                handleS.className = "composer-resize-handle composer-resize-s";
                bindResizeHandle(handleS, "s", el, placement);
                cell.appendChild(handleS);
            }
            if (canResizeE && canResizeS) {
                const handleSE = document.createElement("div");
                handleSE.className =
                    "composer-resize-handle composer-resize-se";
                bindResizeHandle(handleSE, "se", el, placement);
                cell.appendChild(handleSE);
            }
        }

        return cell;
    }

    function bindResizeHandle(handle, direction, el, placement) {
        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            handle.setPointerCapture(e.pointerId);

            const gs = getGridSize(el);

            const shade = document.createElement("div");
            shade.className = "composer-shade";
            shade.style.left = `${placement.col * UNIT}px`;
            shade.style.top = `${placement.row * UNIT}px`;
            shade.style.width = `${placement.w * UNIT}px`;
            shade.style.height = `${placement.h * UNIT}px`;
            gridSection.appendChild(shade);

            const cell = handle.closest(".composer-cell");
            cell.classList.add("composer-cell--resizing");

            let currentW = placement.w;
            let currentH = placement.h;

            function clampValue(val, min, max) {
                if (max != null) return Math.max(min, Math.min(max, val));
                return Math.max(min, val);
            }

            function onMove(e) {
                const gridRect = gridSection.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                if (direction === "e" || direction === "se") {
                    const rawW = Math.round((x - placement.col * UNIT) / UNIT);
                    const maxW = gs.max ? gs.max[0] : gridCols - placement.col;
                    currentW = clampValue(
                        rawW,
                        gs.min[0],
                        Math.min(maxW, gridCols - placement.col),
                    );
                }
                if (direction === "s" || direction === "se") {
                    const rawH = Math.round((y - placement.row * UNIT) / UNIT);
                    currentH = clampValue(
                        rawH,
                        gs.min[1],
                        gs.max ? gs.max[1] : null,
                    );
                }
                shade.style.width = `${currentW * UNIT}px`;
                shade.style.height = `${currentH * UNIT}px`;
                shade.classList.toggle(
                    "composer-shade--invalid",
                    !canPlace(
                        placement.col,
                        placement.row,
                        currentW,
                        currentH,
                        el.id,
                    ),
                );
            }

            function onUp() {
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                handle.removeEventListener("pointercancel", onUp);
                shade.remove();
                cell.classList.remove("composer-cell--resizing");
                const sizeChanged =
                    currentW !== placement.w || currentH !== placement.h;
                const valid = canPlace(
                    placement.col,
                    placement.row,
                    currentW,
                    currentH,
                    el.id,
                );
                if (sizeChanged && valid) {
                    const targetPlacement = layout.placements.find(
                        (lp) => lp.id === el.id,
                    );
                    if (targetPlacement) {
                        targetPlacement.w = currentW;
                        targetPlacement.h = currentH;
                    }
                    renderGridComposer();
                }
            }

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
            handle.addEventListener("pointercancel", onUp);
        });
    }

    function canPlaceInSet(set, col, row, w, h) {
        if (col < 0 || row < 0 || col + w > gridCols) return false;
        const occupied = new Set();
        for (const placement of set) {
            for (let r = placement.row; r < placement.row + placement.h; r++) {
                for (
                    let c = placement.col;
                    c < placement.col + placement.w;
                    c++
                ) {
                    occupied.add(`${c},${r}`);
                }
            }
        }
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (occupied.has(`${c},${r}`)) return false;
            }
        }
        return true;
    }

    function compactPlacements() {
        const visible = layout.placements.filter(
            (p) => !layout.hidden.includes(p.id),
        );
        visible.sort((a, b) => a.row - b.row || a.col - b.col);
        const settled = [];
        for (const placement of visible) {
            let bestRow = placement.row;
            for (let r = 0; r < placement.row; r++) {
                if (
                    canPlaceInSet(
                        settled,
                        placement.col,
                        r,
                        placement.w,
                        placement.h,
                    )
                ) {
                    bestRow = r;
                    break;
                }
            }
            settled.push({ ...placement, row: bestRow });
        }
        for (const placement of settled) {
            const orig = layout.placements.find((lp) => lp.id === placement.id);
            if (orig) orig.row = placement.row;
        }
    }

    function bindPanelItemDrag(item, el) {
        item.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            item.setPointerCapture(e.pointerId);

            const gs = getGridSize(el);
            const w = gs.fullWidth
                ? gridCols
                : gs.halfWidth
                  ? Math.max(gs.min[0], Math.floor(gridCols / 2))
                  : Math.min(gs.default[0], gridCols);
            const h = gs.halfHeight
                ? Math.max(gs.min[1], Math.floor(gridRows / 2))
                : gs.default[1];

            let shade = null;
            let currentCol = -1;
            let currentRow = -1;
            let overGrid = false;

            function onMove(e) {
                const gridRect = gridSection.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                const inGrid = x >= 0 && x <= gridRect.width && y >= 0;

                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${w * UNIT}px`;
                        shade.style.height = `${h * UNIT}px`;
                        gridSection.appendChild(shade);
                    }
                    const col = Math.max(
                        0,
                        Math.min(gridCols - w, Math.floor(x / UNIT)),
                    );
                    const rawRow = Math.max(0, Math.floor(y / UNIT));
                    const row = applyGravity(col, rawRow, w, h, null);
                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${row * UNIT}px`;
                    shade.classList.toggle(
                        "composer-shade--invalid",
                        !canPlace(col, row, w, h, null),
                    );
                    overGrid = true;
                } else {
                    if (shade) {
                        shade.remove();
                        shade = null;
                    }
                    overGrid = false;
                }
            }

            function onUp() {
                item.removeEventListener("pointermove", onMove);
                item.removeEventListener("pointerup", onUp);
                item.removeEventListener("pointercancel", onUp);
                if (shade) shade.remove();
                if (overGrid && canPlace(currentCol, currentRow, w, h, null)) {
                    layout.hidden = layout.hidden.filter((id) => id !== el.id);
                    layout.placements.push({
                        id: el.id,
                        col: currentCol,
                        row: currentRow,
                        w,
                        h,
                    });
                    renderGridComposer();
                }
            }

            item.addEventListener("pointermove", onMove);
            item.addEventListener("pointerup", onUp);
            item.addEventListener("pointercancel", onUp);
        });
    }

    function bindPanelDrag(panel) {
        const handle = panel.querySelector("#composer-panel-drag-handle");
        if (!handle) return;

        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            if (e.target.closest("button")) return;
            e.preventDefault();
            handle.setPointerCapture(e.pointerId);

            const startX = e.clientX - panel.offsetLeft;
            const startY = e.clientY - panel.offsetTop;

            function onMove(e) {
                const maxLeft = window.innerWidth - panel.offsetWidth - 4;
                const maxTop = window.innerHeight - panel.offsetHeight - 4;
                const newLeft = Math.max(
                    4,
                    Math.min(maxLeft, e.clientX - startX),
                );
                const newTop = Math.max(
                    4,
                    Math.min(maxTop, e.clientY - startY),
                );
                panel.style.left = `${newLeft}px`;
                panel.style.top = `${newTop}px`;
                panelPosition = { top: newTop, left: newLeft };
            }

            function onUp() {
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                handle.removeEventListener("pointercancel", onUp);
            }

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
            handle.addEventListener("pointercancel", onUp);
        });
    }

    function createElementsPanel() {
        const hiddenElements = elements.filter((e) =>
            layout.hidden.includes(e.id),
        );

        const panel = document.createElement("div");
        panel.id = "composer-elements-panel";
        panel.className = "composer-panel";

        let listHtml;
        if (hiddenElements.length === 0) {
            listHtml = `<li class="composer-library-empty">${i18n.t("ui.reuse.page_composer.all_visible")}</li>`;
        } else {
            listHtml = hiddenElements
                .map(
                    (el) =>
                        `<li class="composer-library-item" data-composer-panel-item="${el.id}"><span>${el.label}</span></li>`,
                )
                .join("");
        }

        panel.innerHTML = `
      <div id="composer-panel-drag-handle" class="composer-panel-header">
        <span class="composer-panel-title">${i18n.t("ui.reuse.page_composer.elements")}</span>
        <button class="composer-panel-minimize-btn" type="button">−</button>
      </div>
      <div class="composer-panel-body">
        <ul class="composer-library-list">${listHtml}</ul>
      </div>
      <div class="composer-panel-actions">
        <button class="composer-discard-btn" type="button">${i18n.t("ui.reuse.generic.discard")}</button>
        <button class="composer-done-btn" type="button">${i18n.t("ui.reuse.generic.done")}</button>
      </div>
    `;

        if (panelPosition !== null) {
            panel.style.top = `${panelPosition.top}px`;
            panel.style.left = `${panelPosition.left}px`;
            panel.style.right = "auto";
        } else {
            const gridRect = contentGrid.getBoundingClientRect();
            const panelLeft = gridRect.right + 12;
            const panelTop = gridRect.top + window.scrollY;
            const viewportWidth = window.innerWidth;

            if (panelLeft < 0 || panelLeft + 240 > viewportWidth) {
                panel.style.top = "80px";
                panel.style.right = "12px";
                panel.style.left = "auto";
            } else {
                panel.style.top = `${Math.max(80, panelTop)}px`;
                panel.style.left = `${panelLeft}px`;
                panel.style.right = "auto";
            }
        }
        document.body.appendChild(panel);
        bindPanelDrag(panel);

        panel
            .querySelector(".composer-panel-minimize-btn")
            .addEventListener("click", () => {
                const minimized = panel.classList.toggle(
                    "composer-panel--minimized",
                );
                panel.querySelector(
                    ".composer-panel-minimize-btn",
                ).textContent = minimized ? "+" : "−";
            });

        panel
            .querySelector(".composer-done-btn")
            .addEventListener("click", async () => {
                compactPlacements();
                editing = false;
                endEditMode();
                await saveLayout();
                renderGridComposer();
            });

        panel
            .querySelector(".composer-discard-btn")
            .addEventListener("click", () => {
                layout = layoutSnapshot;
                editing = false;
                endEditMode();
                renderGridComposer();
            });

        panel.querySelectorAll("[data-composer-panel-item]").forEach((item) => {
            const elId = item.dataset.composerPanelItem;
            const el = elements.find((e) => e.id === elId);
            if (el) bindPanelItemDrag(item, el);
        });
    }

    const subStates = new Map();

    async function loadLayoutFor(key) {
        const account = localStorage.getItem("cognis_account");
        if (!account) return null;
        try {
            const response = await apiFetch(
                `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(key)}`,
            );
            if (!response.ok) return null;
            const payload = await response.json();
            const raw = payload?.data?.layoutJson;
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async function saveLayoutFor(key, layoutData) {
        const account = localStorage.getItem("cognis_account");
        if (!account) return;
        await apiFetch(
            `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(key)}`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ layout: layoutData }),
            },
        );
    }

    function getSubPanelId(preferenceKey) {
        return (
            "composer-elements-panel-" +
            preferenceKey.replace(/[^a-z0-9]/g, "-")
        );
    }

    function computeSubGridDimensions(state) {
        if (!state.container) return;
        state.container.style.width = "";
        const width = state.container.getBoundingClientRect().width;
        state.gridCols = Math.max(1, Math.floor(width / UNIT));
        const visiblePlacements = (state.layout?.placements ?? []).filter(
            (p) => !(state.layout?.hidden ?? []).includes(p.id),
        );
        const maxBottom = visiblePlacements.reduce(
            (m, p) => Math.max(m, p.row + p.h),
            0,
        );
        const extra = state.editing ? 1 : 0;
        state.gridRows = Math.max(state.editing ? 6 : 1, maxBottom + extra);
        state.container.style.minHeight = `${state.gridRows * UNIT}px`;
        state.container.style.width = `${state.gridCols * UNIT}px`;
    }

    function canSubPlace(state, col, row, w, h, excludeId) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const occupied = new Set();
        for (const placement of state.layout?.placements ?? []) {
            if (placement.id === excludeId) continue;
            if ((state.layout?.hidden ?? []).includes(placement.id)) continue;
            for (let r = placement.row; r < placement.row + placement.h; r++) {
                for (
                    let c = placement.col;
                    c < placement.col + placement.w;
                    c++
                ) {
                    occupied.add(`${c},${r}`);
                }
            }
        }
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (occupied.has(`${c},${r}`)) return false;
            }
        }
        return true;
    }

    function canSubPlaceInSet(state, set, col, row, w, h) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const occupied = new Set();
        for (const placement of set) {
            for (let r = placement.row; r < placement.row + placement.h; r++) {
                for (
                    let c = placement.col;
                    c < placement.col + placement.w;
                    c++
                ) {
                    occupied.add(`${c},${r}`);
                }
            }
        }
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (occupied.has(`${c},${r}`)) return false;
            }
        }
        return true;
    }

    function findSubSwapCandidate(state, col, row, w, h, excludeId) {
        const displaced = [];
        for (const placement of state.layout?.placements ?? []) {
            if (placement.id === excludeId) continue;
            if ((state.layout?.hidden ?? []).includes(placement.id)) continue;
            const overlapsH =
                col < placement.col + placement.w && col + w > placement.col;
            const overlapsV =
                row < placement.row + placement.h && row + h > placement.row;
            if (overlapsH && overlapsV) displaced.push(placement);
        }
        if (displaced.length !== 1) return null;
        const candidate = displaced[0];
        const source = state.layout.placements.find((p) => p.id === excludeId);
        if (!source) return null;
        if (source.col + candidate.w > state.gridCols) return null;
        const others = (state.layout?.placements ?? []).filter(
            (p) =>
                p.id !== excludeId &&
                p.id !== candidate.id &&
                !(state.layout?.hidden ?? []).includes(p.id),
        );
        const occupied = new Set();
        for (const placement of others) {
            for (let r = placement.row; r < placement.row + placement.h; r++) {
                for (
                    let c = placement.col;
                    c < placement.col + placement.w;
                    c++
                ) {
                    occupied.add(`${c},${r}`);
                }
            }
        }
        for (let r = source.row; r < source.row + candidate.h; r++) {
            for (let c = source.col; c < source.col + candidate.w; c++) {
                if (occupied.has(`${c},${r}`)) return null;
            }
        }
        const postSwapColsOverlap =
            candidate.col < source.col + candidate.w &&
            candidate.col + w > source.col;
        const postSwapRowsOverlap =
            candidate.row < source.row + candidate.h &&
            candidate.row + h > source.row;
        if (postSwapColsOverlap && postSwapRowsOverlap) return null;
        return candidate;
    }

    function initializeSubPlacements(state) {
        if (!state.layout.placements) state.layout.placements = [];
        if (!state.layout.hidden) state.layout.hidden = [];
        state.layout.placements = state.layout.placements.filter((p) =>
            state.elements.some((e) => e.id === p.id),
        );
        state.layout.hidden = state.layout.hidden.filter((id) =>
            state.elements.some((e) => e.id === id),
        );
        for (const el of state.elements) {
            if (state.layout.hidden.includes(el.id)) continue;
            if (state.layout.placements.some((p) => p.id === el.id)) continue;
            if (el.defaultHidden && !el.pinned) {
                state.layout.hidden.push(el.id);
                continue;
            }
            const gs = getGridSize(el);
            const w = gs.fullWidth
                ? state.gridCols
                : gs.halfWidth
                  ? Math.max(gs.min[0], Math.floor(state.gridCols / 2))
                  : Math.min(gs.default[0], state.gridCols);
            const h = gs.halfHeight
                ? Math.max(gs.min[1], Math.floor(state.gridRows / 2))
                : gs.default[1];
            let placed = false;
            for (let row = 0; !placed; row++) {
                for (
                    let col = 0;
                    col <= Math.max(0, state.gridCols - w);
                    col++
                ) {
                    if (canSubPlace(state, col, row, w, h, null)) {
                        state.layout.placements.push({
                            id: el.id,
                            col,
                            row,
                            w,
                            h,
                        });
                        placed = true;
                        break;
                    }
                }
            }
        }
    }

    function compactSubPlacements(state) {
        const visible = state.layout.placements.filter(
            (p) => !state.layout.hidden.includes(p.id),
        );
        visible.sort((a, b) => a.row - b.row || a.col - b.col);
        const settled = [];
        for (const placement of visible) {
            let bestRow = placement.row;
            for (let r = 0; r < placement.row; r++) {
                if (
                    canSubPlaceInSet(
                        state,
                        settled,
                        placement.col,
                        r,
                        placement.w,
                        placement.h,
                    )
                ) {
                    bestRow = r;
                    break;
                }
            }
            settled.push({ ...placement, row: bestRow });
        }
        for (const placement of settled) {
            const orig = state.layout.placements.find(
                (lp) => lp.id === placement.id,
            );
            if (orig) orig.row = placement.row;
        }
    }

    function createSubGridOverlay(state) {
        const overlay = document.createElement("div");
        overlay.className = "composer-grid-overlay";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.width = `${state.gridCols * UNIT}px`;
        overlay.style.height = `${state.gridRows * UNIT}px`;
        for (let r = 0; r < state.gridRows; r++) {
            for (let c = 0; c < state.gridCols; c++) {
                const cell = document.createElement("div");
                cell.className = "composer-grid-cell";
                cell.style.left = `${c * UNIT}px`;
                cell.style.top = `${r * UNIT}px`;
                cell.style.width = `${UNIT}px`;
                cell.style.height = `${UNIT}px`;
                overlay.appendChild(cell);
            }
        }
        return overlay;
    }

    function bindSubResizeHandle(handle, direction, el, placement, state) {
        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            handle.setPointerCapture(e.pointerId);

            const gs = getGridSize(el);

            const shade = document.createElement("div");
            shade.className = "composer-shade";
            shade.style.left = `${placement.col * UNIT}px`;
            shade.style.top = `${placement.row * UNIT}px`;
            shade.style.width = `${placement.w * UNIT}px`;
            shade.style.height = `${placement.h * UNIT}px`;
            state.container.appendChild(shade);

            const cell = handle.closest(".composer-cell");
            cell.classList.add("composer-cell--resizing");

            let currentW = placement.w;
            let currentH = placement.h;

            function clampValue(val, min, max) {
                if (max != null) return Math.max(min, Math.min(max, val));
                return Math.max(min, val);
            }

            function onMove(e) {
                const gridRect = state.container.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                if (direction === "e" || direction === "se") {
                    const rawW = Math.round((x - placement.col * UNIT) / UNIT);
                    const maxW = gs.max
                        ? gs.max[0]
                        : state.gridCols - placement.col;
                    currentW = clampValue(
                        rawW,
                        gs.min[0],
                        Math.min(maxW, state.gridCols - placement.col),
                    );
                }
                if (direction === "s" || direction === "se") {
                    const rawH = Math.round((y - placement.row * UNIT) / UNIT);
                    currentH = clampValue(
                        rawH,
                        gs.min[1],
                        gs.max ? gs.max[1] : null,
                    );
                }
                shade.style.width = `${currentW * UNIT}px`;
                shade.style.height = `${currentH * UNIT}px`;
                shade.classList.toggle(
                    "composer-shade--invalid",
                    !canSubPlace(
                        state,
                        placement.col,
                        placement.row,
                        currentW,
                        currentH,
                        el.id,
                    ),
                );
            }

            function onUp() {
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                handle.removeEventListener("pointercancel", onUp);
                shade.remove();
                cell.classList.remove("composer-cell--resizing");
                const sizeChanged =
                    currentW !== placement.w || currentH !== placement.h;
                const valid = canSubPlace(
                    state,
                    placement.col,
                    placement.row,
                    currentW,
                    currentH,
                    el.id,
                );
                if (sizeChanged && valid) {
                    const targetPlacement = state.layout.placements.find(
                        (lp) => lp.id === el.id,
                    );
                    if (targetPlacement) {
                        targetPlacement.w = currentW;
                        targetPlacement.h = currentH;
                    }
                    renderSubGrid(state);
                }
            }

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
            handle.addEventListener("pointercancel", onUp);
        });
    }

    function createSubCell(el, placement, state) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = el.id;
        cell.style.left = `${placement.col * UNIT}px`;
        cell.style.top = `${placement.row * UNIT}px`;
        cell.style.width = `${placement.w * UNIT}px`;
        cell.style.height = `${placement.h * UNIT}px`;

        if (state.editing) {
            cell.classList.add("composer-cell--editable");

            cell.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                if (e.target.closest("button")) return;
                e.preventDefault();
                cell.setPointerCapture(e.pointerId);

                const shade = document.createElement("div");
                shade.className = "composer-shade";
                shade.style.left = `${placement.col * UNIT}px`;
                shade.style.top = `${placement.row * UNIT}px`;
                shade.style.width = `${placement.w * UNIT}px`;
                shade.style.height = `${placement.h * UNIT}px`;
                state.container.appendChild(shade);

                cell.classList.add("composer-cell--dragging");

                let currentCol = placement.col;
                let currentRow = placement.row;
                let swapTarget = null;
                let dropZoneLine = null;

                function onMove(e) {
                    const panel = document.getElementById(
                        getSubPanelId(state.preferenceKey),
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    swapTarget = null;

                    if (overPanel && !el.pinned) {
                        shade.classList.add("composer-shade--invalid");
                        panel?.classList.add("composer-panel--drop-target");
                        return;
                    }
                    shade.classList.remove("composer-shade--invalid");
                    panel?.classList.remove("composer-panel--drop-target");

                    const gridRect = state.container.getBoundingClientRect();
                    const x = e.clientX - gridRect.left;
                    const y = e.clientY - gridRect.top;
                    const col = Math.max(
                        0,
                        Math.min(
                            state.gridCols - placement.w,
                            Math.round(x / UNIT - placement.w / 2),
                        ),
                    );
                    const row = Math.max(
                        0,
                        Math.round(y / UNIT - placement.h / 2),
                    );

                    if (row + placement.h > state.gridRows) {
                        state.gridRows = row + placement.h + 1;
                        state.container.style.minHeight = `${state.gridRows * UNIT}px`;
                    }

                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${row * UNIT}px`;

                    if (
                        !canSubPlace(
                            state,
                            col,
                            row,
                            placement.w,
                            placement.h,
                            el.id,
                        )
                    ) {
                        const candidate = findSubSwapCandidate(
                            state,
                            col,
                            row,
                            placement.w,
                            placement.h,
                            el.id,
                        );
                        if (candidate) {
                            swapTarget = candidate;
                            dropZoneLine = buildDropZoneLine(
                                placement.col,
                                placement.row,
                                candidate,
                                col,
                                row,
                            );
                            state.container.appendChild(dropZoneLine);
                        } else {
                            shade.classList.add("composer-shade--invalid");
                        }
                    }
                }

                async function onUp(e) {
                    cell.removeEventListener("pointermove", onMove);
                    cell.removeEventListener("pointerup", onUp);
                    cell.removeEventListener("pointercancel", onUp);
                    document
                        .getElementById(getSubPanelId(state.preferenceKey))
                        ?.classList.remove("composer-panel--drop-target");
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    shade.remove();
                    cell.classList.remove("composer-cell--dragging");

                    const panel = document.getElementById(
                        getSubPanelId(state.preferenceKey),
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (overPanel && !el.pinned) {
                        state.layout.hidden.push(el.id);
                        state.layout.placements =
                            state.layout.placements.filter(
                                (p) => p.id !== el.id,
                            );
                        renderSubGrid(state);
                        return;
                    }

                    const currentSwapTarget = swapTarget;
                    swapTarget = null;

                    if (currentSwapTarget) {
                        const targetPlacement = state.layout.placements.find(
                            (lp) => lp.id === el.id,
                        );
                        const swapPlacement = state.layout.placements.find(
                            (lp) => lp.id === currentSwapTarget.id,
                        );
                        if (targetPlacement && swapPlacement) {
                            const oldCol = targetPlacement.col;
                            const oldRow = targetPlacement.row;
                            targetPlacement.col = currentSwapTarget.col;
                            targetPlacement.row = currentSwapTarget.row;
                            swapPlacement.col = oldCol;
                            swapPlacement.row = oldRow;
                            renderSubGrid(state);
                        }
                    } else {
                        const moved =
                            currentCol !== placement.col ||
                            currentRow !== placement.row;
                        if (
                            moved &&
                            canSubPlace(
                                state,
                                currentCol,
                                currentRow,
                                placement.w,
                                placement.h,
                                el.id,
                            )
                        ) {
                            const targetPlacement =
                                state.layout.placements.find(
                                    (lp) => lp.id === el.id,
                                );
                            if (targetPlacement) {
                                targetPlacement.col = currentCol;
                                targetPlacement.row = currentRow;
                            }
                            renderSubGrid(state);
                        }
                    }
                }

                cell.addEventListener("pointermove", onMove);
                cell.addEventListener("pointerup", onUp);
                cell.addEventListener("pointercancel", onUp);
            });

            if (!el.pinned) {
                const closeBtn = document.createElement("button");
                closeBtn.className = "composer-close-btn";
                closeBtn.type = "button";
                closeBtn.textContent = "×";
                closeBtn.setAttribute(
                    "aria-label",
                    i18n.t("ui.reuse.generic.remove"),
                );
                closeBtn.addEventListener("pointerdown", (e) =>
                    e.stopPropagation(),
                );
                closeBtn.addEventListener("click", () => {
                    state.layout.hidden.push(el.id);
                    state.layout.placements = state.layout.placements.filter(
                        (p) => p.id !== el.id,
                    );
                    renderSubGrid(state);
                });
                cell.appendChild(closeBtn);
            }
        }

        const content = document.createElement("div");
        content.className = "widget-card composer-cell-content";
        content.innerHTML = el.render();
        cell.appendChild(content);

        if (state.editing) {
            const gs = getGridSize(el);
            const canResizeE =
                !gs.fullWidth && (!gs.max || gs.max[0] > gs.min[0]);
            const canResizeS = !gs.max || gs.max[1] > gs.min[1];

            if (canResizeE) {
                const handleE = document.createElement("div");
                handleE.className = "composer-resize-handle composer-resize-e";
                bindSubResizeHandle(handleE, "e", el, placement, state);
                cell.appendChild(handleE);
            }
            if (canResizeS) {
                const handleS = document.createElement("div");
                handleS.className = "composer-resize-handle composer-resize-s";
                bindSubResizeHandle(handleS, "s", el, placement, state);
                cell.appendChild(handleS);
            }
            if (canResizeE && canResizeS) {
                const handleSE = document.createElement("div");
                handleSE.className =
                    "composer-resize-handle composer-resize-se";
                bindSubResizeHandle(handleSE, "se", el, placement, state);
                cell.appendChild(handleSE);
            }
        }

        return cell;
    }

    function bindSubPanelItemDrag(item, el, state) {
        item.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            item.setPointerCapture(e.pointerId);

            const gs = getGridSize(el);
            const w = gs.fullWidth
                ? state.gridCols
                : gs.halfWidth
                  ? Math.max(gs.min[0], Math.floor(state.gridCols / 2))
                  : Math.min(gs.default[0], state.gridCols);
            const h = gs.halfHeight
                ? Math.max(gs.min[1], Math.floor(state.gridRows / 2))
                : gs.default[1];

            let shade = null;
            let currentCol = -1;
            let currentRow = -1;
            let overGrid = false;

            function onMove(e) {
                const gridRect = state.container.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                const inGrid = x >= 0 && x <= gridRect.width && y >= 0;

                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${w * UNIT}px`;
                        shade.style.height = `${h * UNIT}px`;
                        state.container.appendChild(shade);
                    }
                    const col = Math.max(
                        0,
                        Math.min(state.gridCols - w, Math.floor(x / UNIT)),
                    );
                    const row = Math.max(0, Math.floor(y / UNIT));
                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${row * UNIT}px`;
                    shade.classList.toggle(
                        "composer-shade--invalid",
                        !canSubPlace(state, col, row, w, h, null),
                    );
                    overGrid = true;
                } else {
                    if (shade) {
                        shade.remove();
                        shade = null;
                    }
                    overGrid = false;
                }
            }

            function onUp() {
                item.removeEventListener("pointermove", onMove);
                item.removeEventListener("pointerup", onUp);
                item.removeEventListener("pointercancel", onUp);
                if (shade) shade.remove();
                if (
                    overGrid &&
                    canSubPlace(state, currentCol, currentRow, w, h, null)
                ) {
                    state.layout.hidden = state.layout.hidden.filter(
                        (id) => id !== el.id,
                    );
                    state.layout.placements.push({
                        id: el.id,
                        col: currentCol,
                        row: currentRow,
                        w,
                        h,
                    });
                    renderSubGrid(state);
                }
            }

            item.addEventListener("pointermove", onMove);
            item.addEventListener("pointerup", onUp);
            item.addEventListener("pointercancel", onUp);
        });
    }

    function createSubElementsPanel(state) {
        const panelId = getSubPanelId(state.preferenceKey);
        const hiddenElements = state.elements.filter((e) =>
            state.layout.hidden.includes(e.id),
        );

        const panel = document.createElement("div");
        panel.id = panelId;
        panel.className = "composer-panel";

        let listHtml;
        if (hiddenElements.length === 0) {
            listHtml = `<li class="composer-library-empty">${i18n.t("ui.reuse.page_composer.all_visible")}</li>`;
        } else {
            listHtml = hiddenElements
                .map(
                    (el) =>
                        `<li class="composer-library-item" data-composer-panel-item="${el.id}"><span>${el.label}</span></li>`,
                )
                .join("");
        }

        panel.innerHTML = `
      <div id="${panelId}-drag-handle" class="composer-panel-header">
        <span class="composer-panel-title">${i18n.t("ui.reuse.page_composer.elements")}</span>
        <button class="composer-panel-minimize-btn" type="button">−</button>
      </div>
      <div class="composer-panel-body">
        <ul class="composer-library-list">${listHtml}</ul>
      </div>
      <div class="composer-panel-actions">
        <button class="composer-discard-btn" type="button">${i18n.t("ui.reuse.generic.discard")}</button>
        <button class="composer-done-btn" type="button">${i18n.t("ui.reuse.generic.done")}</button>
      </div>
    `;

        if (state.panelPosition !== null) {
            panel.style.top = `${state.panelPosition.top}px`;
            panel.style.left = `${state.panelPosition.left}px`;
            panel.style.right = "auto";
        } else {
            const gridRect = state.container.getBoundingClientRect();
            const panelLeft = gridRect.right + 12;
            const panelTop = gridRect.top + window.scrollY;
            const viewportWidth = window.innerWidth;
            if (panelLeft < 0 || panelLeft + 240 > viewportWidth) {
                panel.style.top = "80px";
                panel.style.right = "12px";
                panel.style.left = "auto";
            } else {
                panel.style.top = `${Math.max(80, panelTop)}px`;
                panel.style.left = `${panelLeft}px`;
                panel.style.right = "auto";
            }
        }

        document.body.appendChild(panel);

        const dragHandle = panel.querySelector(`#${panelId}-drag-handle`);
        if (dragHandle) {
            dragHandle.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                if (e.target.closest("button")) return;
                e.preventDefault();
                dragHandle.setPointerCapture(e.pointerId);
                const startX = e.clientX - panel.offsetLeft;
                const startY = e.clientY - panel.offsetTop;
                function onMove(e) {
                    const maxLeft = window.innerWidth - panel.offsetWidth - 4;
                    const maxTop = window.innerHeight - panel.offsetHeight - 4;
                    const newLeft = Math.max(
                        4,
                        Math.min(maxLeft, e.clientX - startX),
                    );
                    const newTop = Math.max(
                        4,
                        Math.min(maxTop, e.clientY - startY),
                    );
                    panel.style.left = `${newLeft}px`;
                    panel.style.top = `${newTop}px`;
                    state.panelPosition = { top: newTop, left: newLeft };
                }
                function onUp() {
                    dragHandle.removeEventListener("pointermove", onMove);
                    dragHandle.removeEventListener("pointerup", onUp);
                    dragHandle.removeEventListener("pointercancel", onUp);
                }
                dragHandle.addEventListener("pointermove", onMove);
                dragHandle.addEventListener("pointerup", onUp);
                dragHandle.addEventListener("pointercancel", onUp);
            });
        }

        panel
            .querySelector(".composer-panel-minimize-btn")
            .addEventListener("click", () => {
                const minimized = panel.classList.toggle(
                    "composer-panel--minimized",
                );
                panel.querySelector(
                    ".composer-panel-minimize-btn",
                ).textContent = minimized ? "+" : "−";
            });

        panel
            .querySelector(".composer-done-btn")
            .addEventListener("click", async () => {
                compactSubPlacements(state);
                state.editing = false;
                endEditMode();
                await saveLayoutFor(state.preferenceKey, state.layout);
                renderSubGrid(state);
            });

        panel
            .querySelector(".composer-discard-btn")
            .addEventListener("click", () => {
                state.layout = state.layoutSnapshot;
                state.editing = false;
                endEditMode();
                renderSubGrid(state);
            });

        panel.querySelectorAll("[data-composer-panel-item]").forEach((item) => {
            const elId = item.dataset.composerPanelItem;
            const el = state.elements.find((e) => e.id === elId);
            if (el) bindSubPanelItemDrag(item, el, state);
        });
    }

    function renderSubGrid(state) {
        document.getElementById(getSubPanelId(state.preferenceKey))?.remove();

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        computeSubGridDimensions(state);

        state.container.innerHTML = "";

        if (state.editing) {
            state.container.classList.add("composer-grid-active");
            state.container.style.minHeight = `${state.gridRows * UNIT}px`;
            state.container.style.width = `${state.gridCols * UNIT}px`;
            state.container.appendChild(createSubGridOverlay(state));

            const visiblePlacements = state.layout.placements.filter(
                (p) => !state.layout.hidden.includes(p.id),
            );
            for (const placement of visiblePlacements) {
                const el = state.elements.find((e) => e.id === placement.id);
                if (!el) continue;
                state.container.appendChild(
                    createSubCell(el, placement, state),
                );
            }
        } else {
            state.container.classList.remove("composer-grid-active");
            state.container.style.minHeight = "";
            state.container.style.width = "";

            if (state.columns === 2) {
                state.container.classList.add("content-grid--two-column");
            }

            const sorted = computeSubViewPlacements(state);

            for (const placement of sorted) {
                const el = state.elements.find((e) => e.id === placement.id);
                if (!el) continue;
                const card = document.createElement("div");
                card.className = "widget-card";
                card.dataset.composerElement = el.id;
                card.innerHTML = el.render();
                state.container.appendChild(card);
            }
        }

        syncSubEditToggle(state);

        if (state.editing) {
            createSubElementsPanel(state);
        }

        state.onRender?.();
    }

    async function mountSubComposer(el, sectionContainer) {
        let state = subStates.get(el.id);
        if (!state) {
            state = {
                layout: null,
                editing: false,
                layoutSnapshot: null,
                gridCols: 1,
                gridRows: 6,
                lastObservedCols: 0,
                panelPosition: null,
                resizeObserver: null,
                container: null,
                columns: el.subComposerOptions.columns ?? 1,
                elements: el.subComposerOptions.elements,
                allowCustomization:
                    el.subComposerOptions.allowCustomization ?? false,
                preferenceKey: el.subComposerOptions.preferenceKey,
                onRender: el.subComposerOptions.onRender,
                onUnmount: el.subComposerOptions.onUnmount,
            };
            state.layout = await loadLayoutFor(state.preferenceKey);
            subStates.set(el.id, state);
        }

        state.container = sectionContainer;

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        computeSubGridDimensions(state);
        renderSubGrid(state);

        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
        }
        state.resizeObserver = new ResizeObserver(() => {
            if (!state.container) return;
            state.container.style.width = "";
            const width = state.container.getBoundingClientRect().width;
            const newCols = Math.max(1, Math.floor(width / UNIT));
            if (newCols !== state.lastObservedCols) {
                state.lastObservedCols = newCols;
                computeSubGridDimensions(state);
                renderSubGrid(state);
            }
        });
        state.resizeObserver.observe(sectionContainer);
    }

    function unmountSubComposer(el) {
        const state = subStates.get(el.id);
        if (!state) return;
        state.onUnmount?.();
        document.getElementById(getSubPanelId(state.preferenceKey))?.remove();
        state.resizeObserver?.disconnect();
        state.resizeObserver = null;
        if (state.container) {
            state.container.classList.remove("composer-grid-active");
            state.container.classList.remove("content-grid--two-column");
            state.container.innerHTML = "";
        }
        state.container = null;
    }

    function getOrCreateFloatingToolbar() {
        let ft = root.querySelector(".floating-toolbar");
        if (!ft) {
            ft = document.createElement("div");
            ft.className = "floating-toolbar";
            ft.hidden = true;
            root.appendChild(ft);
        }
        return ft;
    }

    function syncSubEditToggle(state) {
        const editBtn = document.getElementById("composer-edit-toggle");
        if (!editBtn) return;
        if (!state.allowCustomization) {
            editBtn.hidden = true;
            return;
        }
        editBtn.hidden = false;
        state.editToggleAbortController?.abort();
        state.editToggleAbortController = new AbortController();
        const { signal } = state.editToggleAbortController;
        if (!state.editing) {
            editBtn.innerHTML =
                '<span class="composer-edit-icon" aria-hidden="true"></span>';
            editBtn.title = i18n.t("ui.reuse.page_composer.edit_layout");
            editBtn.addEventListener(
                "click",
                () => {
                    syncSubLayoutToCurrentGridColumns(state);
                    state.layoutSnapshot = JSON.parse(
                        JSON.stringify(state.layout),
                    );
                    state.editing = true;
                    beginEditMode();
                    renderSubGrid(state);
                },
                { signal },
            );
        } else {
            editBtn.textContent = "✓";
            editBtn.title = i18n.t("ui.reuse.generic.done");
            editBtn.addEventListener(
                "click",
                async () => {
                    compactSubPlacements(state);
                    state.editing = false;
                    endEditMode();
                    await saveLayoutFor(state.preferenceKey, state.layout);
                    renderSubGrid(state);
                },
                { signal },
            );
        }
    }

    function syncEditToggle() {
        const editBtn = document.getElementById("composer-edit-toggle");
        if (!editBtn) return;
        if (!allowCustomization) {
            editBtn.hidden = true;
            return;
        }
        editBtn.hidden = false;
        editToggleAbortController?.abort();
        editToggleAbortController = new AbortController();
        const { signal } = editToggleAbortController;
        if (!editing) {
            editBtn.innerHTML =
                '<span class="composer-edit-icon" aria-hidden="true"></span>';
            editBtn.title = i18n.t("ui.reuse.page_composer.edit_layout");
            editBtn.addEventListener(
                "click",
                () => {
                    syncLayoutToCurrentGridColumns();
                    layoutSnapshot = JSON.parse(JSON.stringify(layout));
                    editing = true;
                    beginEditMode();
                    render();
                },
                { signal },
            );
        } else {
            editBtn.textContent = "✓";
            editBtn.title = i18n.t("ui.reuse.generic.done");
            editBtn.addEventListener(
                "click",
                async () => {
                    if (!subPageNavigation) {
                        compactPlacements();
                    }
                    editing = false;
                    endEditMode();
                    await saveLayout();
                    render();
                },
                { signal },
            );
        }
    }

    function repackPlacementsIntoColumns(sortedVisible, maxCols) {
        const packed = [];
        for (const orig of sortedVisible) {
            const w = Math.min(orig.w, maxCols);
            const h = orig.h;
            let placed = false;
            for (let row = 0; !placed; row++) {
                for (let col = 0; col <= Math.max(0, maxCols - w); col++) {
                    const occupied = new Set();
                    for (const existing of packed) {
                        for (
                            let r = existing.row;
                            r < existing.row + existing.h;
                            r++
                        ) {
                            for (
                                let c = existing.col;
                                c < existing.col + existing.w;
                                c++
                            ) {
                                occupied.add(`${c},${r}`);
                            }
                        }
                    }
                    let fits = true;
                    overlapCheck: for (let r = row; r < row + h; r++) {
                        for (let c = col; c < col + w; c++) {
                            if (occupied.has(`${c},${r}`)) {
                                fits = false;
                                break overlapCheck;
                            }
                        }
                    }
                    if (fits) {
                        packed.push({ ...orig, col, row, w });
                        placed = true;
                        break;
                    }
                }
            }
        }
        return packed;
    }

    function syncLayoutToCurrentGridColumns() {
        if (!layout || !contentGrid) return;
        computeGridDimensions();
        initializePlacements();
        const adjustedPlacements = computeViewPlacements();
        const adjustedById = new Map(
            adjustedPlacements.map((placement) => [placement.id, placement]),
        );
        layout.placements = layout.placements.map((placement) => {
            const adjusted = adjustedById.get(placement.id);
            return adjusted
                ? {
                      ...placement,
                      col: adjusted.col,
                      row: adjusted.row,
                      w: adjusted.w,
                      h: adjusted.h,
                  }
                : placement;
        });
    }

    function syncSubLayoutToCurrentGridColumns(state) {
        if (!state.layout || !state.container) return;
        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        const adjustedPlacements = computeSubViewPlacements(state);
        const adjustedById = new Map(
            adjustedPlacements.map((placement) => [placement.id, placement]),
        );
        state.layout.placements = state.layout.placements.map((placement) => {
            const adjusted = adjustedById.get(placement.id);
            return adjusted
                ? {
                      ...placement,
                      col: adjusted.col,
                      row: adjusted.row,
                      w: adjusted.w,
                      h: adjusted.h,
                  }
                : placement;
        });
    }

    function computeViewPlacements() {
        const visible = layout.placements
            .filter((p) => !layout.hidden.includes(p.id))
            .sort((a, b) => a.row - b.row || a.col - b.col);

        const hasOverflow = visible.some((p) => p.col + p.w > gridCols);
        if (!hasOverflow) return visible;

        return repackPlacementsIntoColumns(visible, gridCols);
    }

    function computeSubViewPlacements(state) {
        const visible = state.layout.placements
            .filter((pl) => !state.layout.hidden.includes(pl.id))
            .sort((a, b) => a.row - b.row || a.col - b.col);

        const hasOverflow = visible.some(
            (pl) => pl.col + pl.w > state.gridCols,
        );
        if (!hasOverflow) return visible;

        return repackPlacementsIntoColumns(visible, state.gridCols);
    }

    function renderGridComposer() {
        document.getElementById("composer-elements-panel")?.remove();

        if (!layout || (layout.order && !layout.placements)) {
            layout = { placements: [], hidden: [] };
        }

        computeGridDimensions();
        initializePlacements();
        computeGridDimensions();

        contentGrid.classList.remove("composer-grid-active");
        contentGrid.innerHTML = "";

        const panel = document.createElement("article");
        panel.className = "content-panel";
        const section = document.createElement("div");
        section.className = "content-section";
        panel.appendChild(section);
        contentGrid.appendChild(panel);
        gridSection = section;

        if (editing) {
            section.classList.add("composer-grid-active");
            section.style.minHeight = `${gridRows * UNIT}px`;
            section.style.width = `${gridCols * UNIT}px`;
            section.appendChild(createGridOverlay());
        } else {
            section.style.setProperty("--grid-cols", String(gridCols));
            section.classList.add("composer-view-grid");
        }

        const visiblePlacements = editing
            ? layout.placements
                  .filter((p) => !layout.hidden.includes(p.id))
                  .sort((a, b) => a.row - b.row || a.col - b.col)
            : computeViewPlacements();

        for (const placement of visiblePlacements) {
            const el = elements.find((e) => e.id === placement.id);
            if (!el) continue;
            if (editing) {
                section.appendChild(createCell(el, placement));
            } else {
                const card = document.createElement("section");
                card.className = "widget-card";
                card.dataset.composerElement = el.id;
                card.style.gridColumn = `${placement.col + 1} / span ${placement.w}`;
                card.style.gridRow = `${placement.row + 1} / span ${placement.h}`;
                card.innerHTML = el.render();
                section.appendChild(card);
            }
        }

        syncEditToggle();

        if (editing) {
            createElementsPanel();
        }

        const renderedElementIds = visiblePlacements.map((p) => p.id);
        for (const id of renderedElementIds) {
            const el = elements.find((entry) => entry.id === id);
            el?.onRender?.();
        }

        onRender?.();
    }

    function getEffectiveLayout() {
        const allIds = elements.map((e) => e.id);
        const pinnedIds = elements.filter((e) => e.pinned).map((e) => e.id);
        const storedOrder = (layout?.order ?? []).filter((id) =>
            allIds.includes(id),
        );
        const storedHidden = layout?.hidden ?? null;
        const defaultHiddenIds = elements
            .filter(
                (e) =>
                    e.defaultHidden &&
                    !e.pinned &&
                    !storedOrder.includes(e.id) &&
                    !(storedHidden ?? []).includes(e.id),
            )
            .map((e) => e.id);
        const missing = allIds.filter(
            (id) => !storedOrder.includes(id) && !defaultHiddenIds.includes(id),
        );
        const order = [...storedOrder, ...missing];
        const baseHidden = storedHidden !== null ? storedHidden : [];
        const hidden = [
            ...new Set([...baseHidden, ...defaultHiddenIds]),
        ].filter((id) => allIds.includes(id) && !pinnedIds.includes(id));
        return { order, hidden };
    }

    function renderCards(effectiveLayout) {
        const { order, hidden } = effectiveLayout;
        return order
            .filter((id) => !hidden.includes(id))
            .map((id) => {
                const el = elements.find((e) => e.id === id);
                if (!el) return "";
                const dragAttrs = editing ? ` draggable="true"` : "";
                const dragHandle = editing
                    ? `<div class="composer-drag-handle" aria-hidden="true">
               <span class="composer-drag-icon">⠿</span>
               <span class="composer-drag-label">${el.label}</span>
               ${!el.pinned ? `<button class="composer-remove-btn" data-composer-remove="${el.id}" type="button">${i18n.t("ui.reuse.generic.remove")}</button>` : ""}
             </div>`
                    : "";
                const editingClass = editing ? " composer-editing" : "";
                const isActive = subPageNavigation && el.id === activeSubPageId;
                const activeClass = isActive ? " active" : "";
                const hiddenAttr =
                    subPageNavigation && !isActive ? " hidden" : "";
                if (el.subComposerOptions) {
                    const headingHtml = el.subComposerOptions.heading
                        ? `<h2 class="sub-composer-heading">${escapeHtml(el.subComposerOptions.heading)}</h2>`
                        : "";
                    return `<div class="content-section${activeClass}"${hiddenAttr} id="${el.id}">${headingHtml}<div class="sub-composer-inner"></div></div>`;
                }
                return `<div class="content-section${activeClass}"${hiddenAttr} id="${el.id}"><section class="widget-card${editingClass}" data-composer-element="${el.id}"${dragAttrs}>${dragHandle}${el.render()}</section></div>`;
            })
            .join("");
    }

    function renderLibraryPanel(effectiveLayout) {
        const hiddenElements = elements.filter((e) =>
            effectiveLayout.hidden.includes(e.id),
        );
        const listItems = hiddenElements
            .map(
                (el) => `<li class="composer-library-item">
           <span>${el.label}</span>
           <button class="composer-add-btn" data-composer-add="${el.id}" type="button">${i18n.t("ui.reuse.generic.add")}</button>
         </li>`,
            )
            .join("");
        const emptyMsg = !hiddenElements.length
            ? `<li class="composer-library-empty">${i18n.t("ui.reuse.page_composer.all_visible")}</li>`
            : "";
        return `
      <aside class="composer-library">
        <div class="composer-library-header">
          <h3>${i18n.t("ui.reuse.page_composer.elements")}</h3>
        </div>
        <ul class="composer-library-list">${listItems}${emptyMsg}</ul>
      </aside>
    `;
    }

    function renderSubPageComposer() {
        const effectiveLayout = getEffectiveLayout();
        let html = "";

        const cardsHtml = renderCards(effectiveLayout);
        html += `<article class="content-panel">${cardsHtml}</article>`;

        if (editing) {
            html += renderLibraryPanel(effectiveLayout);
        }

        contentGrid.innerHTML = html;
        bindSubPageComposerEvents();
        syncEditToggle();
        for (const id of effectiveLayout.order) {
            if (effectiveLayout.hidden.includes(id)) continue;
            const el = elements.find((entry) => entry.id === id);
            el?.onRender?.();
        }
        onRender?.();
        const activeEl = elements.find((e) => e.id === activeSubPageId);
        if (activeEl?.subComposerOptions) {
            const outerDiv = contentGrid.querySelector(`#${activeSubPageId}`);
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                contentGrid;
            mountSubComposer(activeEl, sectionDiv).catch(() => {});
        }
    }

    function bindSubPageComposerEvents() {
        contentGrid
            .querySelectorAll("[data-composer-remove]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.composerRemove;
                    const effective = getEffectiveLayout();
                    layout = {
                        order: effective.order,
                        hidden: [...effective.hidden, id],
                    };
                    renderSubPageComposer();
                });
            });

        contentGrid.querySelectorAll("[data-composer-add]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.composerAdd;
                const effective = getEffectiveLayout();
                layout = {
                    order: effective.order,
                    hidden: effective.hidden.filter((h) => h !== id),
                };
                renderSubPageComposer();
            });
        });

        contentGrid
            .querySelectorAll("[data-composer-element][draggable]")
            .forEach((card) => {
                card.addEventListener("dragstart", (event) => {
                    dragSourceId = card.dataset.composerElement;
                    card.classList.add("composer-dragging");
                    event.dataTransfer.effectAllowed = "move";
                });

                card.addEventListener("dragend", () => {
                    card.classList.remove("composer-dragging");
                    contentGrid
                        .querySelectorAll(".composer-drag-over")
                        .forEach((el) => {
                            el.classList.remove("composer-drag-over");
                        });
                    dragSourceId = null;
                });

                card.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (card.dataset.composerElement !== dragSourceId) {
                        contentGrid
                            .querySelectorAll(".composer-drag-over")
                            .forEach((el) => {
                                el.classList.remove("composer-drag-over");
                            });
                        card.classList.add("composer-drag-over");
                    }
                });

                card.addEventListener("drop", async (event) => {
                    event.preventDefault();
                    card.classList.remove("composer-drag-over");
                    const targetId = card.dataset.composerElement;
                    if (!dragSourceId || dragSourceId === targetId) return;

                    const effective = getEffectiveLayout();
                    const visibleOrder = effective.order.filter(
                        (id) => !effective.hidden.includes(id),
                    );
                    const sourceIdx = visibleOrder.indexOf(dragSourceId);
                    const targetIdx = visibleOrder.indexOf(targetId);
                    if (sourceIdx === -1 || targetIdx === -1) return;

                    visibleOrder.splice(sourceIdx, 1);
                    // Removing source shifts all subsequent indices by -1; adjust targetIdx when source precedes target.
                    const insertIdx =
                        sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
                    visibleOrder.splice(insertIdx, 0, dragSourceId);

                    const newOrder = [
                        ...visibleOrder,
                        ...effective.order.filter((id) =>
                            effective.hidden.includes(id),
                        ),
                    ];
                    layout = { order: newOrder, hidden: effective.hidden };
                    renderSubPageComposer();
                });
            });
    }

    function render() {
        if (!contentGrid) return;
        if (subPageNavigation) {
            renderSubPageComposer();
        } else {
            renderGridComposer();
        }
    }

    function applyPageOverrides(id) {
        const overrides = pageOverrides[id] ?? {};
        const effectiveShowThemeToggle =
            "showThemeToggle" in overrides
                ? overrides.showThemeToggle
                : showThemeToggle;
        const toggleEl = root.querySelector("#theme-toggle");
        if (toggleEl) toggleEl.hidden = !effectiveShowThemeToggle;
    }

    async function switchSubPage(id) {
        if (onBeforeSubPageSwitch) {
            const allowed = await onBeforeSubPageSwitch(activeSubPageId, id);
            if (!allowed) return;
        }
        const prevId = activeSubPageId;
        activeSubPageId = id;
        const panel =
            contentGrid.querySelector(".content-panel") ?? contentGrid;
        panel.querySelectorAll(".content-section").forEach((section) => {
            const isActive = section.id === activeSubPageId;
            section.hidden = !isActive;
            section.classList.toggle("active", isActive);
        });
        root.querySelectorAll("[data-composer-scroll]").forEach((btn) => {
            btn.classList.toggle(
                "active",
                btn.dataset.composerScroll === activeSubPageId,
            );
        });
        const prevEl = prevId ? elements.find((e) => e.id === prevId) : null;
        if (prevEl?.subComposerOptions) unmountSubComposer(prevEl);
        const newEl = elements.find((e) => e.id === id);
        if (newEl?.subComposerOptions) {
            const outerDiv = contentGrid.querySelector(`#${id}`);
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                contentGrid;
            mountSubComposer(newEl, sectionDiv).catch(() => {});
        }
        history.replaceState(null, "", `#${activeSubPageId}`);
        applyPageOverrides(id);
        onRender?.();
    }

    async function init() {
        configureToastDismissLabel(i18n.t("ui.reuse.generic.dismiss"));

        const pageContextHtml = pageContext
            ? `<h1>${pageContext.title}</h1><p>${pageContext.subtitle}</p>`
            : "";

        const toolbarHtml =
            Array.isArray(toolbar) && toolbar.length > 0
                ? toolbar.map((t) => t.render()).join("")
                : undefined;

        const floatingHtml =
            Array.isArray(floatingMenu) && floatingMenu.length > 0
                ? "\u200b"
                : undefined;

        await renderDashboardLayout(root, {
            i18n,
            pageContext: pageContextHtml,
            toolbar: toolbarHtml,
            floatingToolbar: floatingHtml,
            content: "",
            showTopbar,
            showNavbar,
            showThemeToggle,
            showFooter,
        });

        if (Array.isArray(floatingMenu) && floatingMenu.length > 0) {
            const ft = root.querySelector(".floating-toolbar");
            if (ft) {
                ft.innerHTML = "";
                for (const item of floatingMenu) {
                    const slot = document.createElement("div");
                    slot.dataset.floatingSlot = item.id;
                    slot.hidden = true;
                    slot.innerHTML = item.render();
                    ft.appendChild(slot);
                }
                const updateToolbarVisibility = () => {
                    const anyVisible = [
                        ...ft.querySelectorAll("[data-floating-slot]"),
                    ].some((s) => !s.hidden);
                    ft.hidden = !anyVisible;
                };
                const slotObserver = new MutationObserver(
                    updateToolbarVisibility,
                );
                ft.querySelectorAll("[data-floating-slot]").forEach((slot) => {
                    slotObserver.observe(slot, {
                        attributes: true,
                        attributeFilter: ["hidden"],
                    });
                });
                updateToolbarVisibility();
            }
        }

        contentGrid = root.querySelector(".content-grid");
        if (columns === 2)
            contentGrid?.classList.add("content-grid--two-column");

        if (frameless) {
            root.querySelector(".workspace")?.classList.add(
                "app-page--frameless",
            );
        }

        if (Array.isArray(toolbar) && toolbar.length > 0) {
            const toolbarEl = root.querySelector(".toolbar");
            if (toolbarEl) {
                const hasCollapsibleContent = [...toolbarEl.children].some(
                    (child) => child instanceof HTMLElement,
                );
                if (hasCollapsibleContent) {
                    const storageKey = `cognis_toolbar_collapsed_${persistLayoutPreferences || "default"}`;
                    const storedValue = localStorage.getItem(storageKey);
                    const collapsed =
                        storedValue === null || storedValue === "true";
                    const collapseBtn = document.createElement("button");
                    collapseBtn.type = "button";
                    collapseBtn.className = "toolbar-collapse-btn";

                    function setToolbarCollapsedState(nextCollapsed) {
                        toolbarEl.classList.toggle(
                            "toolbar--collapsed",
                            nextCollapsed,
                        );
                        collapseBtn.textContent = nextCollapsed
                            ? TOOLBAR_COLLAPSE_EXPAND_ICON
                            : TOOLBAR_COLLAPSE_COLLAPSE_ICON;
                        collapseBtn.setAttribute(
                            "aria-label",
                            nextCollapsed
                                ? i18n.t("ui.layout.toolbar.expand")
                                : i18n.t("ui.layout.toolbar.collapse"),
                        );
                        localStorage.setItem(storageKey, String(nextCollapsed));
                    }

                    toolbarEl.insertBefore(collapseBtn, toolbarEl.firstChild);
                    setToolbarCollapsedState(collapsed);

                    collapseBtn.addEventListener("click", () => {
                        const nowCollapsed =
                            toolbarEl.classList.contains("toolbar--collapsed");
                        setToolbarCollapsedState(!nowCollapsed);
                    });

                    root.querySelectorAll("[data-composer-scroll]").forEach(
                        (btn) => {
                            btn.addEventListener("click", () => {
                                setToolbarCollapsedState(true);
                            });
                        },
                    );
                }
            }
        }

        if (subPageNavigation) {
            const hashId = window.location.hash.slice(1);
            const validIds = elements.map((e) => e.id);
            activeSubPageId =
                hashId && validIds.includes(hashId)
                    ? hashId
                    : (validIds[0] ?? null);
            if (activeSubPageId) applyPageOverrides(activeSubPageId);
        }

        root.querySelectorAll("[data-composer-scroll]").forEach((btn) => {
            if (subPageNavigation) {
                btn.classList.toggle(
                    "active",
                    btn.dataset.composerScroll === activeSubPageId,
                );
                btn.addEventListener("click", () =>
                    switchSubPage(btn.dataset.composerScroll),
                );
            } else {
                btn.addEventListener("click", () => {
                    root.querySelector(
                        `#${btn.dataset.composerScroll}`,
                    )?.scrollIntoView({
                        behavior: prefersReducedMotion() ? "auto" : "smooth",
                    });
                    root.querySelectorAll("[data-composer-scroll]").forEach(
                        (b) => b.classList.remove("active"),
                    );
                    btn.classList.add("active");
                });
            }
        });

        layout = persistLayoutPreferences ? await loadLayout() : null;

        if (!subPageNavigation && contentGrid) {
            resizeObserver = new ResizeObserver(() => {
                if (!contentGrid) return;
                contentGrid.style.width = "";
                const width = contentGrid.getBoundingClientRect().width;
                const newCols = Math.max(1, Math.floor(width / UNIT));
                if (newCols !== lastObservedCols) {
                    lastObservedCols = newCols;
                    computeGridDimensions();
                    renderGridComposer();
                }
            });
            resizeObserver.observe(contentGrid.parentElement ?? contentGrid);
        }

        render();
    }

    function getFloatingSlot(id) {
        return root.querySelector(`[data-floating-slot="${CSS.escape(id)}"]`);
    }

    function refresh(newElements) {
        if (editing) endEditMode();
        editing = false;
        if (Array.isArray(newElements)) {
            elements = newElements;
        }
        render();
    }

    return { init, refresh, getFloatingSlot, showToast };
}
