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
    resolveComposerResize,
} from "./responsive-layout.js";
import { createSubComposerPanelHandlers } from "./sub-composer-panel.js";
import { resolveInitialGridWidth } from "./grid-sizing.js";
import { bindLayoutKeyboard } from "./keyboard-layout.js";
export function createSubComposerHandlers({
    signal,
    i18n,
    UNIT,
    beginEditMode,
    endEditMode,
    getGridSize,
    getSubPanelId,
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
    computeSubViewPlacements,
    syncSubEditToggle,
    applySubLayoutForCurrentGridColumns,
}) {
    const subStates = new Map();
    function computeSubGridDimensions(state, { minimumRows = 0 } = {}) {
        if (!state.container) return;
        state.container.style.width = "";
        const width = state.container.getBoundingClientRect().width;
        state.gridCols = Math.max(1, Math.floor(width / UNIT));
        state.gridTrackSize = width / state.gridCols;
        const visiblePlacements = (state.layout?.placements ?? []).filter(
            (p) => !(state.layout?.hidden ?? []).includes(p.id),
        );
        const maxBottom = visiblePlacements.reduce(
            (m, p) => Math.max(m, p.row + p.h),
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

    function canSubPlace(state, col, row, w, h, excludeId) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const cells = buildOccupiedSet(
            state.layout?.placements ?? [],
            state.layout?.hidden ?? [],
            excludeId,
        );
        return checkPlacement(cells, col, row, w, h);
    }

    function canSubPlaceInSet(state, set, col, row, w, h) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const cells = buildOccupiedSet(set, [], null);
        return checkPlacement(cells, col, row, w, h);
    }

    function initializeSubPlacements(state, { reveal = [] } = {}) {
        if (!state.layout.placements) state.layout.placements = [];
        if (!state.layout.hidden) state.layout.hidden = [];
        state.layout.placements = state.layout.placements.filter((p) =>
            state.elements.some((e) => e.id === p.id),
        );
        state.layout.hidden = state.layout.hidden.filter((id) =>
            state.elements.some((e) => e.id === id),
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
                    if (canSubPlace(state, col, row, w, h, null)) {
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

    function compactSubPlacements(state) {
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
        overlay.style.width = `${state.gridCols * state.gridTrackSize}px`;
        overlay.style.height = `${state.gridRows * UNIT}px`;
        const cStep = gridStep(state.gridCols);
        const rStep = gridStep(state.gridRows);
        const cellW = state.gridTrackSize * cStep;
        const cellH = UNIT * rStep;
        for (let r = 0; r < state.gridRows; r += rStep) {
            for (let c = 0; c < state.gridCols; c += cStep) {
                const cell = document.createElement("div");
                cell.className =
                    cStep < 1 || rStep < 1
                        ? "composer-grid-cell composer-grid-cell--half"
                        : "composer-grid-cell";
                cell.style.left = `${c * state.gridTrackSize}px`;
                cell.style.top = `${r * UNIT}px`;
                cell.style.width = `${cellW}px`;
                cell.style.height = `${cellH}px`;
                overlay.appendChild(cell);
            }
        }
        return overlay;
    }

    function refreshSubGridBounds(state, minimumRows = 0) {
        if (!state.container?.isConnected) return;
        computeSubGridDimensions(state, { minimumRows });
        state.container
            .querySelector(".composer-grid-overlay")
            ?.replaceWith(createSubGridOverlay(state));
    }

    function createSubCell(el, placement, state) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = el.id;
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
                gridSize: getGridSize(el),
                canPlace: (...args) => canSubPlace(state, ...args),
                findSwapCandidate: (...args) => findGridSwap(state, ...args),
                commitSwap: (sourceId, targetId) =>
                    applyGridSwap(state, sourceId, targetId),
                render: () => renderSubGrid(state),
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
                shade.style.left = `${placement.col * state.gridTrackSize}px`;
                shade.style.top = `${placement.row * UNIT}px`;
                shade.style.width = `${placement.w * state.gridTrackSize}px`;
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
                            snapGridRound(
                                (x - grabX) / state.gridTrackSize,
                                state.gridCols,
                            ),
                        ),
                    );
                    const row = Math.max(
                        0,
                        snapGridRound((y - grabY) / UNIT, state.gridRows),
                    );

                    if (row + placement.h > state.gridRows) {
                        refreshSubGridBounds(state, row + placement.h + 1);
                        // Growth can clamp an ancestor scroll offset; use its new geometry.
                        return onMove(e);
                    }

                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${col * state.gridTrackSize}px`;
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
                        const candidate = findGridSwap(
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
                    document
                        .getElementById(getSubPanelId(state.preferenceKey))
                        ?.classList.remove("composer-panel--drop-target");
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    shade.remove();
                    cell.classList.remove("composer-cell--dragging");
                    refreshSubGridBounds(state);
                    if (e.type === "pointercancel") return;

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
                        if (applyGridSwap(state, el.id, currentSwapTarget.id)) {
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
                    renderSubGrid(state);
                });
                cell.appendChild(closeBtn);
            }
        }

        const content = document.createElement("div");
        content.className = "widget-card composer-cell-content";
        content.inert = state.editing;
        cell.setAttribute("aria-label", el.label ?? el.id);
        const presentation = composerPresentation(state.container);
        applyComposerPresentation(state.container, content, presentation);
        content.innerHTML = el.render(presentation);
        cell.appendChild(content);

        if (state.editing) {
            const gridSize = getGridSize(el);
            appendResizeControls({
                cell,
                placement,
                state,
                gridSize,
                container: state.container,
                canPlace: (...args) => canSubPlace(state, ...args),
                refreshBounds: (minimum) =>
                    refreshSubGridBounds(state, minimum),
                render: () => renderSubGrid(state),
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

    async function saveSubLayout(state) {
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

    const { createSubElementsPanel } = createSubComposerPanelHandlers({
        i18n,
        UNIT,
        getGridSize,
        getSubPanelId,
        getComposerPanelSafeTop,
        clampComposerPanelLeft,
        getComposerPanelHorizontalBounds,
        canSubPlace,
        compactSubPlacements,
        endEditMode,
        saveLayout: saveSubLayout,
        initializeSubPlacements,
        renderSubGrid,
    });

    function renderSubGrid(state, { preserveContent = false } = {}) {
        document.getElementById(getSubPanelId(state.preferenceKey))?.remove();

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        state.container.classList.toggle("composer-grid-active", state.editing);
        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        computeSubGridDimensions(state);

        const subGridFormSnapshot = mergeFormStateSnapshots(
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
            !state.editing && isCompactComposer(state.container),
        );

        if (state.editing) {
            state.container.style.minHeight = `${state.gridRows * UNIT}px`;
            state.container.style.width = "";
            state.container.appendChild(createSubGridOverlay(state));

            const visiblePlacements = state.layout.placements.filter(
                (p) => !state.layout.hidden.includes(p.id),
            );
            for (const placement of visiblePlacements) {
                const element = state.elements.find(
                    (e) => e.id === placement.id,
                );
                if (!element) continue;
                state.container.appendChild(
                    createSubCell(element, placement, state),
                );
            }
        } else {
            state.container.style.minHeight = "";
            state.container.style.width = "";

            if (state.columns === 2) {
                state.container.classList.add("content-grid--two-column");
            }

            const sorted = computeSubViewPlacements(state);
            const visibleIds = new Set(sorted.map((placement) => placement.id));
            for (const [id, card] of retainedCards) {
                if (!visibleIds.has(id)) card.remove();
            }

            for (const placement of sorted) {
                const element = state.elements.find(
                    (e) => e.id === placement.id,
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
                const position = sorted.indexOf(placement);
                if (state.container.children[position] !== card) {
                    state.container.insertBefore(
                        card,
                        state.container.children[position] ?? null,
                    );
                }
            }
        }

        syncSubEditToggle(state);

        if (state.editing) {
            createSubElementsPanel(state);
        }

        restoreFormState(state.container, subGridFormSnapshot);
        bindFormDraftPersistence(state.container, state.preferenceKey);

        if (renderedNewContent) state.onRender?.();
    }

    async function mountSubComposer(el, sectionContainer) {
        let state = subStates.get(el.id);
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
                columns: el.subComposerOptions.columns ?? 1,
                elements: el.subComposerOptions.elements,
                allowCustomization:
                    el.subComposerOptions.allowCustomization ?? false,
                preferenceKey: el.subComposerOptions.preferenceKey,
                onRender: el.subComposerOptions.onRender,
                onUnmount: el.subComposerOptions.onUnmount,
            };
            const initialGridCols = Math.max(
                1,
                Math.floor(
                    sectionContainer.getBoundingClientRect().width / UNIT,
                ),
            );
            const loaded = await loadLayoutFor(
                state.preferenceKey,
                initialGridCols,
            );
            state.layout = cloneLayoutData(loaded.layout);
            state.layoutProfiles = loaded.profiles;
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
            const newCols = Math.max(1, Math.floor(width / UNIT));
            const compact = isCompactComposer(state.container);
            const resize = resolveComposerResize(
                {
                    columns: state.lastObservedCols,
                    compact: state.lastObservedCompact,
                    width: state.lastObservedWidth,
                },
                { columns: newCols, compact, width },
                state.editing,
            );
            if (resize.render) {
                state.lastObservedCols = newCols;
                state.lastObservedCompact = compact;
                state.lastObservedWidth = width;
                state.gridCols = newCols;
                if (resize.reflow) {
                    const visible = computeSubViewPlacements(state);
                    const adjusted = new Map(
                        visible.map((placement) => [placement.id, placement]),
                    );
                    state.layout.placements = state.layout.placements.map(
                        (placement) => adjusted.get(placement.id) ?? placement,
                    );
                } else if (!state.editing) {
                    applySubLayoutForCurrentGridColumns(state);
                }
                computeSubGridDimensions(state);
                renderSubGrid(state, { preserveContent: true });
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

    function destroy() {
        for (const id of subStates.keys()) unmountSubComposer({ id });
        subStates.clear();
    }

    return {
        destroy,
        mountSubComposer,
        saveSubLayout,
        unmountSubComposer,
        renderSubGrid,
        compactSubPlacements,
        computeSubGridDimensions,
        initializeSubPlacements,
    };
}
