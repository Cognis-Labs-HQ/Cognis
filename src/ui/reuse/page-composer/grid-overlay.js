/**
 * Builds main-grid cells, drag/resize previews and the element editing panel.
 *
 * Public exports:
 *   createGridOverlayHandlers(deps) — creates grid geometry, placement and editing operations.
 *
 * Usage:
 *   const grid = createGridOverlayHandlers(dependencies);
 *   grid.computeGridDimensions();
 *   gridSection.appendChild(grid.createGridOverlay());
 *   // Remove the floating panel owned by the handlers when the page ends.
 *   grid.destroy();
 *
 * @param {object} deps Live composer state and injected sizing, rendering, save and edit-mode callbacks.
 * @returns {object} Grid measurement, placement, cell/panel creation and destroy operations.
 */
import { findGridSwap, applyGridSwap } from "./swap-model.js";
import { appendResizeControls } from "./resize-controls.js";
import { bindComposerPointerDrag } from "./pointer-drag.js";

import {
    composerPresentation,
    applyComposerPresentation,
} from "./presentation.js";
import {
    PAGE_COMPOSER_GRID_GAP,
    buildOccupiedSet,
    checkPlacement,
    gridStep,
    halfGrid,
    snapGridRound,
} from "./grid-math.js";
import { createEditorPanelHandlers } from "./editor-panel.js";
import { createGridGeometry } from "./grid-geometry.js";
import { resolveInitialGridWidth } from "./grid-sizing.js";
import { bindLayoutKeyboard } from "./keyboard-layout.js";
export function createGridOverlayHandlers({
    state,
    UNIT,
    i18n,
    escapeHtml,
    getGridSize,
    renderGridComposer,
    saveLayout,
    endEditMode,
}) {
    const {
        computeGridDimensions,
        gridPointerPosition,
        gridColumnOffset,
        gridRowOffset,
        gridColumnSpanSize,
        gridRowSpanSize,
        pixelToGridColumn,
        pixelToGridRow,
        snapPixelColumnFloor,
        snapPixelRowFloor,
    } = createGridGeometry(state, UNIT);
    function canPlace(col, row, w, h, excludeId) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const cells = buildOccupiedSet(
            state.layout?.placements ?? [],
            state.layout?.hidden ?? [],
            excludeId,
        );
        return checkPlacement(cells, col, row, w, h);
    }
    function applyGravity(col, row, w, h, excludeId) {
        const step = gridStep(state.gridRows);
        for (let r = 0; r <= row; r += step) {
            if (canPlace(col, r, w, h, excludeId)) return r;
        }
        return row;
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
                    ? gridColumnOffset(candidate.col) +
                      gridColumnSpanSize(candidate.w)
                    : gridColumnOffset(candidate.col);
            line.style.left = `${lineX}px`;
            line.style.top = `${gridRowOffset(candidate.row)}px`;
            line.style.height = `${gridRowSpanSize(candidate.h)}px`;
        } else {
            line.classList.add("composer-dropzone-line--h");
            const lineY =
                tgtRow >= srcRow
                    ? gridRowOffset(candidate.row) +
                      gridRowSpanSize(candidate.h)
                    : gridRowOffset(candidate.row);
            line.style.top = `${lineY}px`;
            line.style.left = `${gridColumnOffset(candidate.col)}px`;
            line.style.width = `${gridColumnSpanSize(candidate.w)}px`;
        }
        return line;
    }
    function initializePlacements({ reveal = [] } = {}) {
        if (!state.layout.placements) state.layout.placements = [];
        if (!state.layout.hidden) state.layout.hidden = [];
        state.layout.placements = state.layout.placements.filter(
            (p) =>
                p &&
                typeof p.id === "string" &&
                Number.isFinite(p.col) &&
                Number.isFinite(p.row) &&
                Number.isFinite(p.w) &&
                Number.isFinite(p.h) &&
                p.w > 0 &&
                p.h > 0,
        );
        state.layout.hidden = state.layout.hidden.filter(
            (id) => id && typeof id === "string",
        );
        for (const element of state.elements) {
            if (state.layout.hidden.includes(element.id)) continue;
            if (state.layout.placements.some((p) => p.id === element.id))
                continue;
            if (
                element.defaultHidden &&
                !element.pinned &&
                !reveal.includes(element.id)
            ) {
                state.layout.hidden.push(element.id);
                continue;
            }
            const gridSize = getGridSize(element);
            const cStep = gridStep(state.gridCols);
            const rStep = gridStep(state.gridRows);
            const baseW = resolveInitialGridWidth(gridSize, state.gridCols);
            const baseH = gridSize.halfHeight
                ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                : gridSize.default[1];
            let placed = false;
            for (let row = 0; !placed; row += rStep) {
                const colLimit = gridSize.fillWidth
                    ? state.gridCols
                    : Math.max(0, state.gridCols - baseW);
                for (let col = 0; col <= colLimit; col += cStep) {
                    const w = gridSize.fillWidth
                        ? Math.min(
                              state.gridCols,
                              Math.max(gridSize.min[0], state.gridCols - col),
                          )
                        : gridSize.halfWidth &&
                            col + baseW + cStep === state.gridCols
                          ? baseW + cStep
                          : baseW;
                    const h = gridSize.fillHeight
                        ? Math.max(gridSize.min[1], state.gridRows - row)
                        : baseH;
                    if (canPlace(col, row, w, h, null)) {
                        state.layout.placements.push({
                            id: element.id,
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
    function renderMissingElementContent(elementId) {
        return `
      <div class="composer-missing-element" role="status">
        <div class="composer-missing-element-icon" aria-hidden="true">❗</div>
        <p class="composer-missing-element-label">${escapeHtml(i18n.t("ui.reuse.unknown"))}</p>
        <p class="composer-missing-element-id">${escapeHtml(elementId)}</p>
      </div>
    `;
    }
    function createMissingCell(placement) {
        const cell = document.createElement("div");
        cell.className =
            "composer-cell composer-cell--missing composer-cell--editable";
        cell.dataset.composerElement = placement.id;
        cell.style.left = `${gridColumnOffset(placement.col)}px`;
        cell.style.top = `${gridRowOffset(placement.row)}px`;
        cell.style.width = `${gridColumnSpanSize(placement.w)}px`;
        cell.style.height = `${gridRowSpanSize(placement.h)}px`;
        const closeBtn = document.createElement("button");
        closeBtn.className = "composer-close-btn btn-cancel";
        closeBtn.type = "button";
        closeBtn.textContent = "×";
        closeBtn.setAttribute("aria-label", i18n.t("ui.reuse.remove"));
        closeBtn.addEventListener("click", () => {
            state.layout.hidden.push(placement.id);
            state.layout.placements = state.layout.placements.filter(
                (entry) => entry.id !== placement.id,
            );
            renderGridComposer();
        });
        cell.appendChild(closeBtn);
        const content = document.createElement("div");
        content.className =
            "widget-card composer-cell-content composer-cell-content--missing";
        content.innerHTML = renderMissingElementContent(placement.id);
        cell.appendChild(content);
        return cell;
    }
    function createGridOverlay() {
        const overlay = document.createElement("div");
        overlay.className = "composer-grid-overlay";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.width = `${state.gridPixelWidth}px`;
        overlay.style.height = `${state.gridPixelHeight}px`;
        const cStep = gridStep(state.gridCols);
        const rStep = gridStep(state.gridRows);
        for (let r = 0; r < state.gridRows; r += rStep) {
            for (let c = 0; c < state.gridCols; c += cStep) {
                const cell = document.createElement("div");
                cell.className =
                    cStep < 1 || rStep < 1
                        ? "composer-grid-cell composer-grid-cell--half"
                        : "composer-grid-cell";
                cell.style.left = `${gridColumnOffset(c)}px`;
                cell.style.top = `${gridRowOffset(r)}px`;
                cell.style.width = `${Math.min(gridColumnSpanSize(cStep), state.gridPixelWidth - gridColumnOffset(c))}px`;
                cell.style.height = `${Math.min(gridRowSpanSize(rStep), state.gridPixelHeight - gridRowOffset(r))}px`;
                overlay.appendChild(cell);
            }
        }
        return overlay;
    }
    function refreshGridBounds(minimumRows = 0) {
        if (!state.gridSection?.isConnected) return;
        computeGridDimensions({ minimumRows });
        state.gridSection
            .querySelector(".composer-grid-overlay")
            ?.replaceWith(createGridOverlay());
    }
    function createCell(el, placement, { includeContent = true } = {}) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = el.id;
        cell.style.left = `${gridColumnOffset(placement.col)}px`;
        cell.style.top = `${gridRowOffset(placement.row)}px`;
        cell.style.width = `${gridColumnSpanSize(placement.w)}px`;
        cell.style.height = `${gridRowSpanSize(placement.h)}px`;
        if (state.editing) {
            cell.classList.add("composer-cell--editable");
            bindLayoutKeyboard({
                cell,
                placement,
                state,
                gridSize: getGridSize(el),
                canPlace,
                findSwapCandidate: (...args) => findGridSwap(state, ...args),
                commitSwap: (sourceId, targetId) =>
                    applyGridSwap(state, sourceId, targetId),
                render: renderGridComposer,
                i18n,
            });
            cell.addEventListener("pointerdown", (e) => {
                if (e.button !== 0 || e.isPrimary === false) return;
                if (e.target.closest("button")) return;
                e.preventDefault();
                const cellBounds = cell.getBoundingClientRect();
                const grabX = e.clientX - cellBounds.left;
                const grabY = e.clientY - cellBounds.top;
                const shade = document.createElement("div");
                shade.className = "composer-shade";
                shade.style.left = `${gridColumnOffset(placement.col)}px`;
                shade.style.top = `${gridRowOffset(placement.row)}px`;
                shade.style.width = `${gridColumnSpanSize(placement.w)}px`;
                shade.style.height = `${gridRowSpanSize(placement.h)}px`;
                state.gridSection.appendChild(shade);
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
                    const { x, y } = gridPointerPosition(e);
                    const col = Math.max(
                        0,
                        Math.min(
                            state.gridCols - placement.w,
                            snapGridRound(
                                pixelToGridColumn(x - grabX),
                                state.gridCols,
                            ),
                        ),
                    );
                    const rawRow = Math.max(
                        0,
                        snapGridRound(
                            pixelToGridRow(y - grabY),
                            state.gridRows,
                        ),
                    );
                    if (rawRow + placement.h > state.gridRows) {
                        refreshGridBounds(rawRow + placement.h + 1);
                    }
                    currentCol = col;
                    currentRow = rawRow;
                    shade.style.left = `${gridColumnOffset(col)}px`;
                    shade.style.top = `${gridRowOffset(rawRow)}px`;
                    shade.style.width = `${gridColumnSpanSize(placement.w)}px`;
                    shade.style.height = `${gridRowSpanSize(placement.h)}px`;
                    if (
                        !canPlace(col, rawRow, placement.w, placement.h, el.id)
                    ) {
                        const candidate = findGridSwap(
                            state,
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
                            state.gridSection.appendChild(dropZoneLine);
                        } else {
                            shade.classList.add("composer-shade--invalid");
                        }
                    }
                }
                async function onUp(e) {
                    document
                        .getElementById("composer-elements-panel")
                        ?.classList.remove("composer-panel--drop-target");
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    shade.remove();
                    cell.classList.remove("composer-cell--dragging");
                    refreshGridBounds();
                    if (e.type === "pointercancel") return;
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
                        state.layout.hidden.push(el.id);
                        state.layout.placements =
                            state.layout.placements.filter(
                                (p) => p.id !== el.id,
                            );
                        renderGridComposer();
                        return;
                    }
                    const currentSwapTarget = swapTarget;
                    swapTarget = null;
                    if (currentSwapTarget) {
                        if (applyGridSwap(state, el.id, currentSwapTarget.id)) {
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
                            const targetPlacement =
                                state.layout.placements.find(
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
                bindComposerPointerDrag(cell, e, onMove, onUp);
            });
            if (!el.pinned) {
                const closeBtn = document.createElement("button");
                closeBtn.className = "composer-close-btn btn-cancel";
                closeBtn.type = "button";
                closeBtn.textContent = "×";
                closeBtn.setAttribute("aria-label", i18n.t("ui.reuse.remove"));
                closeBtn.addEventListener("pointerdown", (e) =>
                    e.stopPropagation(),
                );
                closeBtn.addEventListener("click", () => {
                    state.layout.hidden.push(el.id);
                    state.layout.placements = state.layout.placements.filter(
                        (p) => p.id !== el.id,
                    );
                    renderGridComposer();
                });
                cell.appendChild(closeBtn);
            }
        }
        if (includeContent) {
            const content = document.createElement("div");
            content.className = "widget-card composer-cell-content";
            const presentation = composerPresentation(state.contentGrid);
            applyComposerPresentation(state.root, content, presentation);
            content.innerHTML = el.render(presentation);
            cell.appendChild(content);
        }
        if (state.editing) {
            const gridSize = getGridSize(el);
            appendResizeControls({
                cell,
                placement,
                state,
                gridSize,
                container: state.gridSection,
                canPlace,
                refreshBounds: refreshGridBounds,
                render: renderGridComposer,
                geometry: {
                    point(event) {
                        const point = gridPointerPosition(event);
                        return {
                            col: pixelToGridColumn(point.x),
                            row: pixelToGridRow(point.y),
                        };
                    },
                    columnOffset: gridColumnOffset,
                    rowOffset: gridRowOffset,
                    columnSpan: gridColumnSpanSize,
                    rowSpan: gridRowSpanSize,
                },
            });
        }
        return cell;
    }
    function canPlaceInSet(set, col, row, w, h) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const cells = buildOccupiedSet(set, [], null);
        return checkPlacement(cells, col, row, w, h);
    }
    function compactPlacements() {
        const visible = state.layout.placements.filter(
            (p) => !state.layout.hidden.includes(p.id),
        );
        visible.sort((a, b) => a.row - b.row || a.col - b.col);
        const rStep = gridStep(state.gridRows);
        const settled = [];
        for (const placement of visible) {
            let bestRow = placement.row;
            for (let r = 0; r < placement.row; r += rStep) {
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
            const orig = state.layout.placements.find(
                (lp) => lp.id === placement.id,
            );
            if (orig) orig.row = placement.row;
        }
    }
    function bindPanelItemDrag(item, el) {
        item.addEventListener("pointerdown", (e) => {
            if (e.button !== 0 || e.target.closest("button")) return;
            e.preventDefault();
            const gridSize = getGridSize(el);
            const w = resolveInitialGridWidth(gridSize, state.gridCols);
            const h = gridSize.fillHeight
                ? state.gridRows
                : gridSize.halfHeight
                  ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                  : gridSize.default[1];
            let shade = null;
            let currentCol = -1;
            let currentRow = -1;
            let overGrid = false;
            function onMove(e) {
                const { x, y } = gridPointerPosition(e);
                const inGrid = x >= 0 && x <= state.gridPixelWidth && y >= 0;
                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${gridColumnSpanSize(w)}px`;
                        shade.style.height = `${gridRowSpanSize(h)}px`;
                        state.gridSection.appendChild(shade);
                    }
                    const col = Math.max(
                        0,
                        Math.min(
                            state.gridCols - w,
                            snapPixelColumnFloor(x, state.gridCols),
                        ),
                    );
                    const rawRow = Math.max(
                        0,
                        snapPixelRowFloor(y, state.gridRows),
                    );
                    const row = applyGravity(col, rawRow, w, h, null);
                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${gridColumnOffset(col)}px`;
                    shade.style.top = `${gridRowOffset(row)}px`;
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
            function onUp(event) {
                if (shade) shade.remove();
                if (event.type === "pointercancel") return;
                if (overGrid && canPlace(currentCol, currentRow, w, h, null)) {
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
                    renderGridComposer();
                }
            }
            bindComposerPointerDrag(item, e, onMove, onUp, state.gridSection);
        });
    }
    const {
        destroy,
        createElementsPanel,
        getComposerPanelSafeTop,
        getComposerPanelHorizontalBounds,
        clampComposerPanelLeft,
    } = createEditorPanelHandlers({
        state,
        i18n,
        bindPanelItemDrag,
        compactPlacements,
        endEditMode,
        saveLayout,
        renderGridComposer,
        initializePlacements,
    });

    return {
        destroy,
        computeGridDimensions,
        canPlace,
        applyGravity,
        buildDropZoneLine,
        initializePlacements,
        renderMissingElementContent,
        createMissingCell,
        createGridOverlay,
        createCell,
        compactPlacements,
        getComposerPanelSafeTop,
        getComposerPanelHorizontalBounds,
        clampComposerPanelLeft,
        createElementsPanel,
    };
}
