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
import { snapDragPlacement } from "./drag-placement.js";
import { findGridSwap, previewGridSwap, applyGridSwap } from "./swap-model.js";
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
    function canPlace(column, row, width, height, excludeId) {
        if (column < 0 || row < 0 || column + width > state.gridColumns)
            return false;
        const cells = buildOccupiedSet(
            state.layout?.placements ?? [],
            state.layout?.hidden ?? [],
            excludeId,
        );
        return checkPlacement(cells, column, row, width, height);
    }
    function buildDropZoneLine(
        sourceColumn,
        sourceRow,
        candidate,
        targetColumn,
        targetRow,
    ) {
        const line = document.createElement("div");
        line.className = "composer-dropzone-line";
        const columnDelta = Math.abs(targetColumn - sourceColumn);
        const rowDelta = Math.abs(targetRow - sourceRow);
        if (columnDelta >= rowDelta) {
            line.classList.add("composer-dropzone-line--v");
            const lineX =
                targetColumn >= sourceColumn
                    ? gridColumnOffset(candidate.col) +
                      gridColumnSpanSize(candidate.w)
                    : gridColumnOffset(candidate.col);
            line.style.left = `${lineX}px`;
            line.style.top = `${gridRowOffset(candidate.row)}px`;
            line.style.height = `${gridRowSpanSize(candidate.h)}px`;
        } else {
            line.classList.add("composer-dropzone-line--h");
            const lineY =
                targetRow >= sourceRow
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
            (candidatePlacement) =>
                candidatePlacement &&
                typeof candidatePlacement.id === "string" &&
                Number.isFinite(candidatePlacement.col) &&
                Number.isFinite(candidatePlacement.row) &&
                Number.isFinite(candidatePlacement.w) &&
                Number.isFinite(candidatePlacement.h) &&
                candidatePlacement.w > 0 &&
                candidatePlacement.h > 0,
        );
        state.layout.hidden = state.layout.hidden.filter(
            (id) => id && typeof id === "string",
        );
        for (const element of state.elements) {
            if (state.layout.hidden.includes(element.id)) continue;
            if (
                state.layout.placements.some(
                    (candidatePlacement) =>
                        candidatePlacement.id === element.id,
                )
            )
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
            const columnStep = gridStep(state.gridColumns);
            const rowStep = gridStep(state.gridRows);
            const baseWidth = resolveInitialGridWidth(
                gridSize,
                state.gridColumns,
            );
            const baseHeight = gridSize.halfHeight
                ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                : gridSize.default[1];
            let placed = false;
            for (let row = 0; !placed; row += rowStep) {
                const columnLimit = gridSize.fillWidth
                    ? state.gridColumns
                    : Math.max(0, state.gridColumns - baseWidth);
                for (
                    let column = 0;
                    column <= columnLimit;
                    column += columnStep
                ) {
                    const width = gridSize.fillWidth
                        ? Math.min(
                              state.gridColumns,
                              Math.max(
                                  gridSize.min[0],
                                  state.gridColumns - column,
                              ),
                          )
                        : gridSize.halfWidth &&
                            column + baseWidth + columnStep ===
                                state.gridColumns
                          ? baseWidth + columnStep
                          : baseWidth;
                    const height = gridSize.fillHeight
                        ? Math.max(gridSize.min[1], state.gridRows - row)
                        : baseHeight;
                    if (canPlace(column, row, width, height, null)) {
                        state.layout.placements.push({
                            id: element.id,
                            col: column,
                            row,
                            w: width,
                            h: height,
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
        const closeButton = document.createElement("button");
        closeButton.className = "composer-close-btn btn-cancel";
        closeButton.type = "button";
        closeButton.textContent = "×";
        closeButton.setAttribute("aria-label", i18n.t("ui.reuse.remove"));
        closeButton.addEventListener("click", () => {
            state.layout.hidden.push(placement.id);
            state.layout.placements = state.layout.placements.filter(
                (entry) => entry.id !== placement.id,
            );
            renderGridComposer();
        });
        cell.appendChild(closeButton);
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
        const columnStep = gridStep(state.gridColumns);
        const rowStep = gridStep(state.gridRows);
        for (let rowIndex = 0; rowIndex < state.gridRows; rowIndex += rowStep) {
            for (
                let columnIndex = 0;
                columnIndex < state.gridColumns;
                columnIndex += columnStep
            ) {
                const cell = document.createElement("div");
                cell.className =
                    columnStep < 1 || rowStep < 1
                        ? "composer-grid-cell composer-grid-cell--half"
                        : "composer-grid-cell";
                cell.style.left = `${gridColumnOffset(columnIndex)}px`;
                cell.style.top = `${gridRowOffset(rowIndex)}px`;
                cell.style.width = `${Math.min(gridColumnSpanSize(columnStep), state.gridPixelWidth - gridColumnOffset(columnIndex))}px`;
                cell.style.height = `${Math.min(gridRowSpanSize(rowStep), state.gridPixelHeight - gridRowOffset(rowIndex))}px`;
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
    function createCell(
        elementDefinition,
        placement,
        { includeContent = true } = {},
    ) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = elementDefinition.id;
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
                gridSize: getGridSize(elementDefinition),
                canPlace,
                findSwapCandidate: (...argumentsList) =>
                    findGridSwap(state, ...argumentsList),
                commitSwap: (sourceId, targetId) =>
                    applyGridSwap(state, sourceId, targetId),
                render: renderGridComposer,
                i18n,
            });
            cell.addEventListener("pointerdown", (event) => {
                if (event.button !== 0 || event.isPrimary === false) return;
                if (event.target.closest("button")) return;
                event.preventDefault();
                const cellBounds = cell.getBoundingClientRect();
                const grabX = event.clientX - cellBounds.left;
                const grabY = event.clientY - cellBounds.top;
                const shade = document.createElement("div");
                shade.className = "composer-shade";
                shade.style.left = `${gridColumnOffset(placement.col)}px`;
                shade.style.top = `${gridRowOffset(placement.row)}px`;
                shade.style.width = `${gridColumnSpanSize(placement.w)}px`;
                shade.style.height = `${gridRowSpanSize(placement.h)}px`;
                state.gridSection.appendChild(shade);
                cell.classList.add("composer-cell--dragging");
                let currentColumn = placement.col;
                let currentRow = placement.row;
                let swapTarget = null;
                let dropZoneLine = null;
                function onMove(moveEvent) {
                    const panel = document.getElementById(
                        "composer-elements-panel",
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRectangle =
                                panel.getBoundingClientRect();
                            return (
                                moveEvent.clientX >= panelRectangle.left &&
                                moveEvent.clientX <= panelRectangle.right &&
                                moveEvent.clientY >= panelRectangle.top &&
                                moveEvent.clientY <= panelRectangle.bottom
                            );
                        })();
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    swapTarget = null;
                    if (overPanel && !elementDefinition.pinned) {
                        shade.classList.add("composer-shade--invalid");
                        panel?.classList.add("composer-panel--drop-target");
                        return;
                    }
                    shade.classList.remove("composer-shade--invalid");
                    panel?.classList.remove("composer-panel--drop-target");
                    const { x: horizontalCoordinate, y: verticalCoordinate } =
                        gridPointerPosition(moveEvent);
                    const column = Math.max(
                        0,
                        Math.min(
                            state.gridColumns - placement.w,
                            snapGridRound(
                                pixelToGridColumn(horizontalCoordinate - grabX),
                                state.gridColumns,
                            ),
                        ),
                    );
                    const rawRow = Math.max(
                        0,
                        snapGridRound(
                            pixelToGridRow(verticalCoordinate - grabY),
                            state.gridRows,
                        ),
                    );
                    if (rawRow + placement.h > state.gridRows) {
                        refreshGridBounds(rawRow + placement.h + 1);
                    }
                    const target = snapDragPlacement(
                        { ...placement, col: column, row: rawRow },
                        state.gridRows,
                        canPlace,
                    );
                    currentColumn = target.col;
                    currentRow = target.row;
                    shade.classList.toggle(
                        "composer-shade--snapped",
                        target.row !== rawRow,
                    );
                    shade.style.left = `${gridColumnOffset(column)}px`;
                    shade.style.top = `${gridRowOffset(currentRow)}px`;
                    shade.style.width = `${gridColumnSpanSize(placement.w)}px`;
                    shade.style.height = `${gridRowSpanSize(placement.h)}px`;
                    if (
                        !canPlace(
                            column,
                            currentRow,
                            placement.w,
                            placement.h,
                            elementDefinition.id,
                        )
                    ) {
                        const preview = previewGridSwap(
                            state,
                            column,
                            currentRow,
                            placement.w,
                            placement.h,
                            elementDefinition.id,
                        );
                        if (preview) {
                            const { target: candidate, valid } = preview;
                            swapTarget = valid ? candidate : null;
                            shade.classList.toggle(
                                "composer-shade--invalid",
                                !valid,
                            );
                            dropZoneLine = buildDropZoneLine(
                                placement.col,
                                placement.row,
                                candidate,
                                column,
                                currentRow,
                            );
                            dropZoneLine.classList.toggle(
                                "composer-dropzone-line--invalid",
                                !valid,
                            );
                            state.gridSection.appendChild(dropZoneLine);
                        } else {
                            shade.classList.add("composer-shade--invalid");
                        }
                    }
                }
                async function onUp(releaseEvent) {
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
                    if (releaseEvent.type === "pointercancel") return;
                    const panel = document.getElementById(
                        "composer-elements-panel",
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRectangle =
                                panel.getBoundingClientRect();
                            return (
                                releaseEvent.clientX >= panelRectangle.left &&
                                releaseEvent.clientX <= panelRectangle.right &&
                                releaseEvent.clientY >= panelRectangle.top &&
                                releaseEvent.clientY <= panelRectangle.bottom
                            );
                        })();
                    if (overPanel && !elementDefinition.pinned) {
                        state.layout.hidden.push(elementDefinition.id);
                        state.layout.placements =
                            state.layout.placements.filter(
                                (candidatePlacement) =>
                                    candidatePlacement.id !==
                                    elementDefinition.id,
                            );
                        renderGridComposer();
                        return;
                    }
                    const currentSwapTarget = swapTarget;
                    swapTarget = null;
                    if (currentSwapTarget) {
                        if (
                            applyGridSwap(
                                state,
                                elementDefinition.id,
                                currentSwapTarget.id,
                            )
                        ) {
                            renderGridComposer();
                        }
                    } else {
                        const moved =
                            currentColumn !== placement.col ||
                            currentRow !== placement.row;
                        if (
                            moved &&
                            canPlace(
                                currentColumn,
                                currentRow,
                                placement.w,
                                placement.h,
                                elementDefinition.id,
                            )
                        ) {
                            const targetPlacement =
                                state.layout.placements.find(
                                    (candidatePlacement) =>
                                        candidatePlacement.id ===
                                        elementDefinition.id,
                                );
                            if (targetPlacement) {
                                targetPlacement.col = currentColumn;
                                targetPlacement.row = currentRow;
                            }
                            renderGridComposer();
                        }
                    }
                }
                bindComposerPointerDrag(cell, event, onMove, onUp);
            });
            if (!elementDefinition.pinned) {
                const closeButton = document.createElement("button");
                closeButton.className = "composer-close-btn btn-cancel";
                closeButton.type = "button";
                closeButton.textContent = "×";
                closeButton.setAttribute(
                    "aria-label",
                    i18n.t("ui.reuse.remove"),
                );
                closeButton.addEventListener("pointerdown", (event) =>
                    event.stopPropagation(),
                );
                closeButton.addEventListener("click", () => {
                    state.layout.hidden.push(elementDefinition.id);
                    state.layout.placements = state.layout.placements.filter(
                        (candidatePlacement) =>
                            candidatePlacement.id !== elementDefinition.id,
                    );
                    renderGridComposer();
                });
                cell.appendChild(closeButton);
            }
        }
        if (includeContent) {
            const content = document.createElement("div");
            content.className = "widget-card composer-cell-content";
            const presentation = composerPresentation(state.contentGrid);
            applyComposerPresentation(state.root, content, presentation);
            content.innerHTML = elementDefinition.render(presentation);
            cell.appendChild(content);
        }
        if (state.editing) {
            const gridSize = getGridSize(elementDefinition);
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
    function bindPanelItemDrag(item, elementDefinition) {
        item.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 || event.target.closest("button")) return;
            event.preventDefault();
            const gridSize = getGridSize(elementDefinition);
            const width = resolveInitialGridWidth(gridSize, state.gridColumns);
            const height = gridSize.fillHeight
                ? state.gridRows
                : gridSize.halfHeight
                  ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                  : gridSize.default[1];
            let shade = null;
            let currentColumn = -1;
            let currentRow = -1;
            let overGrid = false;
            function onMove(moveEvent) {
                const { x: horizontalCoordinate, y: verticalCoordinate } =
                    gridPointerPosition(moveEvent);
                const inGrid =
                    horizontalCoordinate >= 0 &&
                    horizontalCoordinate <= state.gridPixelWidth &&
                    verticalCoordinate >= 0;
                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${gridColumnSpanSize(width)}px`;
                        shade.style.height = `${gridRowSpanSize(height)}px`;
                        state.gridSection.appendChild(shade);
                    }
                    const column = Math.max(
                        0,
                        Math.min(
                            state.gridColumns - width,
                            snapPixelColumnFloor(
                                horizontalCoordinate,
                                state.gridColumns,
                            ),
                        ),
                    );
                    const rawRow = Math.max(
                        0,
                        snapPixelRowFloor(verticalCoordinate, state.gridRows),
                    );
                    const target = snapDragPlacement(
                        {
                            id: null,
                            col: column,
                            row: rawRow,
                            w: width,
                            h: height,
                        },
                        state.gridRows,
                        canPlace,
                    );
                    const row = target.row;
                    shade.classList.toggle(
                        "composer-shade--snapped",
                        row !== rawRow,
                    );
                    currentColumn = column;
                    currentRow = row;
                    shade.style.left = `${gridColumnOffset(column)}px`;
                    shade.style.top = `${gridRowOffset(row)}px`;
                    shade.classList.toggle(
                        "composer-shade--invalid",
                        !canPlace(column, row, width, height, null),
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
                if (
                    overGrid &&
                    canPlace(currentColumn, currentRow, width, height, null)
                ) {
                    state.layout.hidden = state.layout.hidden.filter(
                        (id) => id !== elementDefinition.id,
                    );
                    state.layout.placements.push({
                        id: elementDefinition.id,
                        col: currentColumn,
                        row: currentRow,
                        w: width,
                        h: height,
                    });
                    renderGridComposer();
                }
            }
            bindComposerPointerDrag(
                item,
                event,
                onMove,
                onUp,
                state.gridSection,
            );
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
        endEditMode,
        saveLayout,
        renderGridComposer,
        initializePlacements,
    });

    return {
        destroy,
        computeGridDimensions,
        canPlace,
        buildDropZoneLine,
        initializePlacements,
        renderMissingElementContent,
        createMissingCell,
        createGridOverlay,
        createCell,
        getComposerPanelSafeTop,
        getComposerPanelHorizontalBounds,
        clampComposerPanelLeft,
        createElementsPanel,
    };
}
