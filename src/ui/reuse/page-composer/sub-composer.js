/**
 * Owns nested composer grids, placement profiles and their editing lifetimes.
 *
 * Public exports:
 *   createSubComposerHandlers(deps) — creates nested mounting, rendering, sizing, saving and cleanup operations.
 *
 * Usage:
 *   const nested = createSubComposerHandlers(dependencies);
 *   await nested.mountSubComposer(element, section); // element declares subComposerOptions.
 *   nested.unmountSubComposer(element);
 *   nested.destroy(); // Also releases any remaining mounted grids.
 *
 * @param {object} deps Page lifetime, edit-mode callbacks, persistence, form-state and grid dependencies.
 * @returns {object} Nested mount/unmount, rendering, dimension, placement, save and destroy operations.
 */
import { applyGridMetrics, applyGridPlacement } from "./view-geometry.js";
import { snapDragPlacement } from "./drag-placement.js";
import { findGridSwap, applyGridSwap } from "./swap-model.js";
import { appendResizeControls } from "./resize-controls.js";
import { bindComposerPointerDrag } from "./pointer-drag.js";
import {
    composerPresentation,
    applyComposerPresentation,
} from "./presentation.js";

import {
    buildOccupiedSet,
    checkPlacement,
    gridStep,
    halfGrid,
    snapGridRound,
} from "./grid-math.js";
import {
    isCompactComposer,
    hasGridProfile,
    resolveComposerResize,
} from "./responsive-layout.js";
import { createSubComposerPanelHandlers as createNestedComposerPanelHandlers } from "./sub-composer-panel.js";
import { resolveInitialGridWidth } from "./grid-sizing.js";
import { bindLayoutKeyboard } from "./keyboard-layout.js";
function createNestedComposerHandlers({
    signal,
    i18n,
    UNIT,
    beginEditMode,
    endEditMode,
    getGridSize,
    getSubPanelId: getNestedPanelId,
    getComposerPanelSafeTop,
    clampComposerPanelLeft,
    getComposerPanelHorizontalBounds,
    buildDropZoneLine,
    loadLayoutFor,
    saveLayoutFor,
    cloneLayoutData,
    captureFormState,
    restoreFormState,
    mergeFormStateSnapshots,
    loadPersistedFormState,
    bindFormDraftPersistence,
    computeSubViewPlacements: computeNestedViewPlacements,
    syncSubEditToggle: syncNestedEditToggle,
    applySubLayoutForCurrentGridColumns: applyNestedLayoutForCurrentGridColumns,
}) {
    const nestedStates = new Map();
    function computeNestedGridDimensions(state, { minimumRows = 0 } = {}) {
        if (!state.container) return;
        state.container.style.width = "";
        const width = state.container.getBoundingClientRect().width;
        state.gridCols = Math.max(1, Math.floor(width / UNIT));
        state.gridTrackSize = width / state.gridCols;
        const visiblePlacements = (state.layout?.placements ?? []).filter(
            (candidatePlacement) =>
                !(state.layout?.hidden ?? []).includes(candidatePlacement.id),
        );
        const maxBottom = visiblePlacements.reduce(
            (maximumBottom, candidatePlacement) =>
                Math.max(
                    maximumBottom,
                    candidatePlacement.row + candidatePlacement.h,
                ),
            0,
        );
        const extra = state.editing ? 1 : 0;
        state.gridRows = Math.max(
            minimumRows,
            state.editing ? Math.max(3, maxBottom + 2) : 1,
            maxBottom + extra,
        );
        state.container.style.minHeight = `${state.gridRows * UNIT}px`;
        state.container.style.width = "";
    }

    function canNestedPlace(state, column, row, width, height, excludeId) {
        if (column < 0 || row < 0 || column + width > state.gridCols)
            return false;
        const cells = buildOccupiedSet(
            state.layout?.placements ?? [],
            state.layout?.hidden ?? [],
            excludeId,
        );
        return checkPlacement(cells, column, row, width, height);
    }

    function initializeNestedPlacements(state, { reveal = [] } = {}) {
        if (!state.layout.placements) state.layout.placements = [];
        if (!state.layout.hidden) state.layout.hidden = [];
        state.layout.placements = state.layout.placements.filter(
            (candidatePlacement) =>
                state.elements.some(
                    (candidateElement) =>
                        candidateElement.id === candidatePlacement.id,
                ),
        );
        state.layout.hidden = state.layout.hidden.filter((id) =>
            state.elements.some(
                (candidateElement) => candidateElement.id === id,
            ),
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
            const columnStep = gridStep(state.gridCols);
            const rowStep = gridStep(state.gridRows);
            const baseWidth = resolveInitialGridWidth(gridSize, state.gridCols);
            const baseHeight = gridSize.halfHeight
                ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                : gridSize.default[1];
            let placed = false;
            for (let row = 0; !placed; row += rowStep) {
                const columnLimit = gridSize.fillWidth
                    ? state.gridCols
                    : Math.max(0, state.gridCols - baseWidth);
                for (
                    let column = 0;
                    column <= columnLimit;
                    column += columnStep
                ) {
                    const width = gridSize.fillWidth
                        ? Math.min(
                              state.gridCols,
                              Math.max(
                                  gridSize.min[0],
                                  state.gridCols - column,
                              ),
                          )
                        : gridSize.halfWidth &&
                            column + baseWidth + columnStep === state.gridCols
                          ? baseWidth + columnStep
                          : baseWidth;
                    const height = gridSize.fillHeight
                        ? Math.max(gridSize.min[1], state.gridRows - row)
                        : baseHeight;
                    if (
                        canNestedPlace(state, column, row, width, height, null)
                    ) {
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

    function createNestedGridOverlay(state) {
        const overlay = document.createElement("div");
        overlay.className = "composer-grid-overlay";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.width = `${state.gridCols * state.gridTrackSize}px`;
        overlay.style.height = `${state.gridRows * UNIT}px`;
        const columnStep = gridStep(state.gridCols);
        const rowStep = gridStep(state.gridRows);
        const cellWidth = state.gridTrackSize * columnStep;
        const cellHeight = UNIT * rowStep;
        for (let rowIndex = 0; rowIndex < state.gridRows; rowIndex += rowStep) {
            for (
                let columnIndex = 0;
                columnIndex < state.gridCols;
                columnIndex += columnStep
            ) {
                const cell = document.createElement("div");
                cell.className =
                    columnStep < 1 || rowStep < 1
                        ? "composer-grid-cell composer-grid-cell--half"
                        : "composer-grid-cell";
                cell.style.left = `${columnIndex * state.gridTrackSize}px`;
                cell.style.top = `${rowIndex * UNIT}px`;
                cell.style.width = `${cellWidth}px`;
                cell.style.height = `${cellHeight}px`;
                overlay.appendChild(cell);
            }
        }
        return overlay;
    }

    function refreshNestedGridBounds(state, minimumRows = 0) {
        if (!state.container?.isConnected) return;
        computeNestedGridDimensions(state, { minimumRows });
        state.container
            .querySelector(".composer-grid-overlay")
            ?.replaceWith(createNestedGridOverlay(state));
    }

    function createNestedCell(elementDefinition, placement, state) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = elementDefinition.id;
        cell.style.left = `${placement.col * state.gridTrackSize}px`;
        cell.style.top = `${placement.row * UNIT}px`;
        cell.style.width = `${placement.w * state.gridTrackSize}px`;
        cell.style.height = `${placement.h * UNIT}px`;

        if (state.editing) {
            cell.classList.add("composer-cell--editable");
            bindLayoutKeyboard({
                cell,
                placement,
                state,
                gridSize: getGridSize(elementDefinition),
                canPlace: (...argumentsList) =>
                    canNestedPlace(state, ...argumentsList),
                findSwapCandidate: (...argumentsList) =>
                    findGridSwap(state, ...argumentsList),
                commitSwap: (sourceId, targetId) =>
                    applyGridSwap(state, sourceId, targetId),
                render: () => renderNestedGrid(state),
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
                shade.style.left = `${placement.col * state.gridTrackSize}px`;
                shade.style.top = `${placement.row * UNIT}px`;
                shade.style.width = `${placement.w * state.gridTrackSize}px`;
                shade.style.height = `${placement.h * UNIT}px`;
                state.container.appendChild(shade);

                cell.classList.add("composer-cell--dragging");

                let currentColumn = placement.col;
                let currentRow = placement.row;
                let swapTarget = null;
                let dropZoneLine = null;

                function onMove(moveEvent) {
                    const panel = document.getElementById(
                        getNestedPanelId(state.preferenceKey),
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

                    const gridRectangle =
                        state.container.getBoundingClientRect();
                    const horizontalCoordinate =
                        moveEvent.clientX - gridRectangle.left;
                    const verticalCoordinate =
                        moveEvent.clientY - gridRectangle.top;
                    const column = Math.max(
                        0,
                        Math.min(
                            state.gridCols - placement.w,
                            snapGridRound(
                                (horizontalCoordinate - grabX) /
                                    state.gridTrackSize,
                                state.gridCols,
                            ),
                        ),
                    );
                    const row = Math.max(
                        0,
                        snapGridRound(
                            (verticalCoordinate - grabY) / UNIT,
                            state.gridRows,
                        ),
                    );

                    if (row + placement.h > state.gridRows) {
                        refreshNestedGridBounds(state, row + placement.h + 1);
                        // Growth can clamp an ancestor scroll offset; use its new geometry.
                        return onMove(moveEvent);
                    }

                    const target = snapDragPlacement(
                        { ...placement, col: column, row },
                        state.gridRows,
                        (...argumentsList) =>
                            canNestedPlace(state, ...argumentsList),
                    );
                    currentColumn = target.col;
                    currentRow = target.row;
                    shade.classList.toggle(
                        "composer-shade--snapped",
                        target.row !== row,
                    );
                    shade.style.left = `${column * state.gridTrackSize}px`;
                    shade.style.top = `${currentRow * UNIT}px`;

                    if (
                        !canNestedPlace(
                            state,
                            column,
                            currentRow,
                            placement.w,
                            placement.h,
                            elementDefinition.id,
                        )
                    ) {
                        const candidate = findGridSwap(
                            state,
                            column,
                            currentRow,
                            placement.w,
                            placement.h,
                            elementDefinition.id,
                        );
                        if (candidate) {
                            swapTarget = candidate;
                            dropZoneLine = buildDropZoneLine(
                                placement.col,
                                placement.row,
                                candidate,
                                column,
                                currentRow,
                            );
                            state.container.appendChild(dropZoneLine);
                        } else {
                            shade.classList.add("composer-shade--invalid");
                        }
                    }
                }

                async function onUp(releaseEvent) {
                    document
                        .getElementById(getNestedPanelId(state.preferenceKey))
                        ?.classList.remove("composer-panel--drop-target");
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    shade.remove();
                    cell.classList.remove("composer-cell--dragging");
                    refreshNestedGridBounds(state);
                    if (releaseEvent.type === "pointercancel") return;

                    const panel = document.getElementById(
                        getNestedPanelId(state.preferenceKey),
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
                        renderNestedGrid(state);
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
                            renderNestedGrid(state);
                        }
                    } else {
                        const moved =
                            currentColumn !== placement.col ||
                            currentRow !== placement.row;
                        if (
                            moved &&
                            canNestedPlace(
                                state,
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
                            renderNestedGrid(state);
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
                    renderNestedGrid(state);
                });
                cell.appendChild(closeButton);
            }
        }

        const content = document.createElement("div");
        content.className = "widget-card composer-cell-content";
        content.inert = state.editing;
        cell.setAttribute(
            "aria-label",
            elementDefinition.label ?? elementDefinition.id,
        );
        const presentation = composerPresentation(state.container);
        applyComposerPresentation(state.container, content, presentation);
        content.innerHTML = elementDefinition.render(presentation);
        cell.appendChild(content);

        if (state.editing) {
            const gridSize = getGridSize(elementDefinition);
            appendResizeControls({
                cell,
                placement,
                state,
                gridSize,
                container: state.container,
                canPlace: (...argumentsList) =>
                    canNestedPlace(state, ...argumentsList),
                refreshBounds: (minimum) =>
                    refreshNestedGridBounds(state, minimum),
                render: () => renderNestedGrid(state),
                geometry: {
                    point(event) {
                        const bounds = state.container.getBoundingClientRect();
                        return {
                            col:
                                (event.clientX - bounds.left) /
                                state.gridTrackSize,
                            row: (event.clientY - bounds.top) / UNIT,
                        };
                    },
                    columnOffset: (value) => value * state.gridTrackSize,
                    rowOffset: (value) => value * UNIT,
                    columnSpan: (value) => value * state.gridTrackSize,
                    rowSpan: (value) => value * UNIT,
                },
            });
        }

        return cell;
    }

    async function saveNestedLayout(state) {
        const saved = await saveLayoutFor(
            state.preferenceKey,
            state.layoutProfiles,
            state.gridCols,
            state.layout,
        );
        if (!saved) return false;
        state.layoutProfiles = saved;
        return true;
    }

    const { createSubElementsPanel: createNestedElementsPanel } =
        createNestedComposerPanelHandlers({
            i18n,
            UNIT,
            getGridSize,
            getSubPanelId: getNestedPanelId,
            getComposerPanelSafeTop,
            clampComposerPanelLeft,
            getComposerPanelHorizontalBounds,
            canSubPlace: canNestedPlace,
            endEditMode,
            saveLayout: saveNestedLayout,
            initializeSubPlacements: initializeNestedPlacements,
            renderSubGrid: renderNestedGrid,
        });

    function renderNestedGrid(state, { preserveContent = false } = {}) {
        document
            .getElementById(getNestedPanelId(state.preferenceKey))
            ?.remove();

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        state.container.classList.toggle("composer-grid-active", state.editing);
        computeNestedGridDimensions(state);
        initializeNestedPlacements(state);
        computeNestedGridDimensions(state);

        const nestedGridFormSnapshot = mergeFormStateSnapshots(
            loadPersistedFormState(state.preferenceKey),
            captureFormState(state.container),
        );
        const retainedCards = new Map(
            preserveContent && !state.editing
                ? Array.from(state.container.children)
                      .filter((card) =>
                          card.matches(".widget-card[data-composer-element]"),
                      )
                      .map((card) => [card.dataset.composerElement, card])
                : [],
        );
        let renderedNewContent = !retainedCards.size;
        if (!retainedCards.size) state.container.innerHTML = "";
        state.container.classList.toggle(
            "sub-composer--compact",
            !state.editing &&
                !hasGridProfile(state) &&
                isCompactComposer(state.container),
        );

        state.container.classList.remove("composer-view-grid");
        state.container.style.removeProperty("--grid-cols");
        state.container.style.removeProperty("--composer-grid-gap");
        state.container.style.removeProperty("--composer-grid-row-size");
        if (state.editing) {
            state.container.style.minHeight = `${state.gridRows * UNIT}px`;
            state.container.style.width = "";
            state.container.appendChild(createNestedGridOverlay(state));

            const visiblePlacements = state.layout.placements.filter(
                (candidatePlacement) =>
                    !state.layout.hidden.includes(candidatePlacement.id),
            );
            for (const placement of visiblePlacements) {
                const element = state.elements.find(
                    (candidateElement) => candidateElement.id === placement.id,
                );
                if (!element) continue;
                state.container.appendChild(
                    createNestedCell(element, placement, state),
                );
            }
        } else {
            state.container.style.minHeight = "";
            state.container.style.width = "";

            const personalized = hasGridProfile(state);
            state.container.classList.toggle(
                "content-grid--two-column",
                state.columns === 2 && !personalized,
            );
            const sorted = computeNestedViewPlacements(state);
            const scale = personalized
                ? applyGridMetrics(
                      state.container,
                      sorted,
                      state.gridCols,
                      UNIT,
                      0,
                  )
                : 1;
            const visibleIds = new Set(sorted.map((placement) => placement.id));
            for (const [id, card] of retainedCards) {
                if (!visibleIds.has(id)) card.remove();
            }

            for (const placement of sorted) {
                const element = state.elements.find(
                    (candidateElement) => candidateElement.id === placement.id,
                );
                if (!element) continue;
                let card = retainedCards.get(element.id);
                if (!card) {
                    renderedNewContent = true;
                    card = document.createElement("div");
                    card.className = "widget-card";
                    card.dataset.composerElement = element.id;
                    card.innerHTML = element.render(
                        composerPresentation(state.container),
                    );
                }
                applyComposerPresentation(
                    state.container,
                    card,
                    composerPresentation(state.container),
                );
                if (personalized) applyGridPlacement(card, placement, scale);
                else {
                    card.style.gridColumn = "";
                    card.style.gridRow = "";
                }
                const position = sorted.indexOf(placement);
                if (state.container.children[position] !== card) {
                    state.container.insertBefore(
                        card,
                        state.container.children[position] ?? null,
                    );
                }
            }
        }

        syncNestedEditToggle(state);

        if (state.editing) {
            createNestedElementsPanel(state);
        }

        restoreFormState(state.container, nestedGridFormSnapshot);
        bindFormDraftPersistence(state.container, state.preferenceKey);

        if (renderedNewContent) state.onRender?.();
    }

    async function mountNestedComposer(elementDefinition, sectionContainer) {
        let state = nestedStates.get(elementDefinition.id);
        if (!state) {
            state = {
                signal,
                layout: null,
                layoutProfiles: { layoutsByGrid: {} },
                editing: false,
                layoutSnapshot: null,
                gridCols: 1,
                gridRows: 6,
                lastObservedCols: 0,
                panelPosition: null,
                resizeObserver: null,
                container: null,
                columns: elementDefinition.subComposerOptions.columns ?? 1,
                elements: elementDefinition.subComposerOptions.elements,
                allowCustomization:
                    elementDefinition.subComposerOptions.allowCustomization ??
                    false,
                preferenceKey:
                    elementDefinition.subComposerOptions.preferenceKey,
                onRender: elementDefinition.subComposerOptions.onRender,
                onUnmount: elementDefinition.subComposerOptions.onUnmount,
            };
            const initialGridColumns = Math.max(
                1,
                Math.floor(
                    sectionContainer.getBoundingClientRect().width / UNIT,
                ),
            );
            const loaded = await loadLayoutFor(
                state.preferenceKey,
                initialGridColumns,
            );
            state.layout = cloneLayoutData(loaded.layout);
            state.layoutProfiles = loaded.profiles;
            nestedStates.set(elementDefinition.id, state);
        }

        state.container = sectionContainer;

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        computeNestedGridDimensions(state);
        initializeNestedPlacements(state);
        computeNestedGridDimensions(state);
        renderNestedGrid(state);
        state.lastObservedCols = state.gridCols;
        state.lastObservedCompact = isCompactComposer(state.container);
        state.lastObservedWidth = state.container.getBoundingClientRect().width;

        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
        }
        state.resizeObserver = new ResizeObserver(() => {
            if (!state.container || !document.contains(state.container)) {
                state.resizeObserver?.disconnect();
                state.resizeObserver = null;
                state.container = null;
                return;
            }
            state.container.style.width = "";
            const width = state.container.getBoundingClientRect().width;
            const newColumns = Math.max(1, Math.floor(width / UNIT));
            const compact = isCompactComposer(state.container);
            const resize = resolveComposerResize(
                {
                    columns: state.lastObservedCols,
                    compact: state.lastObservedCompact,
                    width: state.lastObservedWidth,
                },
                { columns: newColumns, compact, width },
                state.editing,
            );
            if (resize.render) {
                state.lastObservedCols = newColumns;
                state.lastObservedCompact = compact;
                state.lastObservedWidth = width;
                state.gridCols = newColumns;
                if (resize.reflow) {
                    const visible = computeNestedViewPlacements(state);
                    const adjusted = new Map(
                        visible.map((placement) => [placement.id, placement]),
                    );
                    state.layout.placements = state.layout.placements.map(
                        (placement) => adjusted.get(placement.id) ?? placement,
                    );
                } else if (!state.editing) {
                    applyNestedLayoutForCurrentGridColumns(state);
                }
                computeNestedGridDimensions(state);
                renderNestedGrid(state, { preserveContent: true });
            }
        });
        state.resizeObserver.observe(sectionContainer);
    }

    function unmountNestedComposer(elementDefinition) {
        const state = nestedStates.get(elementDefinition.id);
        if (!state) return;
        state.onUnmount?.();
        document
            .getElementById(getNestedPanelId(state.preferenceKey))
            ?.remove();
        state.resizeObserver?.disconnect();
        state.resizeObserver = null;
        if (state.container) {
            state.container.classList.remove("composer-grid-active");
            state.container.classList.remove("content-grid--two-column");
            state.container.innerHTML = "";
        }
        state.container = null;
    }

    function destroy() {
        for (const id of nestedStates.keys()) unmountNestedComposer({ id });
        nestedStates.clear();
    }

    return {
        destroy,
        mountSubComposer: mountNestedComposer,
        saveSubLayout: saveNestedLayout,
        unmountSubComposer: unmountNestedComposer,
        renderSubGrid: renderNestedGrid,
        computeSubGridDimensions: computeNestedGridDimensions,
        initializeSubPlacements: initializeNestedPlacements,
    };
}
export { createNestedComposerHandlers as createSubComposerHandlers };
