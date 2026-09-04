/** Sub-composer helpers for nested page composer sections.
 * Export: createSubComposerHandlers(deps). @param {object} deps @returns {object}
 */
import {
    buildOccupiedSet,
    checkPlacement,
    gridStep,
    halfGrid,
    snapGridFloor,
    snapGridRound,
} from "./grid-math.js";
import { createSubComposerPanelHandlers } from "./sub-composer-panel.js";
export function createSubComposerHandlers({
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
        state.gridRows = Math.max(
            state.editing ? Math.max(3, maxBottom + 2) : 1,
            maxBottom + extra,
        );
        state.container.style.minHeight = `${state.gridRows * UNIT}px`;
        state.container.style.width = `${state.gridCols * UNIT}px`;
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
        const occupied = buildOccupiedSet(others, [], null);
        if (
            !checkPlacement(
                occupied,
                source.col,
                source.row,
                candidate.w,
                candidate.h,
            )
        )
            return null;
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
        for (const element of state.elements) {
            if (state.layout.hidden.includes(element.id)) continue;
            if (state.layout.placements.some((p) => p.id === element.id))
                continue;
            if (element.defaultHidden && !element.pinned) {
                state.layout.hidden.push(element.id);
                continue;
            }
            const gridSize = getGridSize(element);
            const cStep = gridStep(state.gridCols);
            const rStep = gridStep(state.gridRows);
            const baseW = gridSize.fullWidth
                ? state.gridCols
                : gridSize.halfWidth
                  ? Math.max(gridSize.min[0], halfGrid(state.gridCols))
                  : Math.min(gridSize.default[0], state.gridCols);
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
                        ? Math.max(gridSize.min[0], state.gridCols - col)
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
        overlay.style.width = `${state.gridCols * UNIT}px`;
        overlay.style.height = `${state.gridRows * UNIT}px`;
        const cStep = gridStep(state.gridCols);
        const rStep = gridStep(state.gridRows);
        const cellW = UNIT * cStep;
        const cellH = UNIT * rStep;
        for (let r = 0; r < state.gridRows; r += rStep) {
            for (let c = 0; c < state.gridCols; c += cStep) {
                const cell = document.createElement("div");
                cell.className =
                    cStep < 1 || rStep < 1
                        ? "composer-grid-cell composer-grid-cell--half"
                        : "composer-grid-cell";
                cell.style.left = `${c * UNIT}px`;
                cell.style.top = `${r * UNIT}px`;
                cell.style.width = `${cellW}px`;
                cell.style.height = `${cellH}px`;
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

            const gridSize = getGridSize(el);

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
                    const rawW = snapGridRound(
                        (x - placement.col * UNIT) / UNIT,
                        state.gridCols,
                    );
                    const maxW = gridSize.max
                        ? gridSize.max[0]
                        : state.gridCols - placement.col;
                    currentW = clampValue(
                        rawW,
                        gridSize.min[0],
                        Math.min(maxW, state.gridCols - placement.col),
                    );
                }
                if (direction === "s" || direction === "se") {
                    const rawH = snapGridRound(
                        (y - placement.row * UNIT) / UNIT,
                        state.gridRows,
                    );
                    currentH = clampValue(
                        rawH,
                        gridSize.min[1],
                        gridSize.max ? gridSize.max[1] : null,
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
                            snapGridRound(
                                x / UNIT - placement.w / 2,
                                state.gridCols,
                            ),
                        ),
                    );
                    const row = Math.max(
                        0,
                        snapGridRound(
                            y / UNIT - placement.h / 2,
                            state.gridRows,
                        ),
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
        content.innerHTML = el.render();
        cell.appendChild(content);

        if (state.editing) {
            const gridSize = getGridSize(el);
            const canResizeE =
                !gridSize.fullWidth &&
                (!gridSize.max || gridSize.max[0] > gridSize.min[0]);
            const canResizeS =
                !gridSize.max || gridSize.max[1] > gridSize.min[1];

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
        saveLayoutFor,
        initializeSubPlacements,
        renderSubGrid,
    });

    function renderSubGrid(state) {
        document.getElementById(getSubPanelId(state.preferenceKey))?.remove();

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        computeSubGridDimensions(state);

        const subGridFormSnapshot = mergeFormStateSnapshots(
            loadPersistedFormState(state.preferenceKey),
            captureFormState(state.container),
        );
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
                const element = state.elements.find(
                    (e) => e.id === placement.id,
                );
                if (!element) continue;
                state.container.appendChild(
                    createSubCell(element, placement, state),
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
                const element = state.elements.find(
                    (e) => e.id === placement.id,
                );
                if (!element) continue;
                const card = document.createElement("div");
                card.className = "widget-card";
                card.dataset.composerElement = element.id;
                card.innerHTML = element.render();
                state.container.appendChild(card);
            }
        }

        syncSubEditToggle(state);

        if (state.editing) {
            createSubElementsPanel(state);
        }

        restoreFormState(state.container, subGridFormSnapshot);
        bindFormDraftPersistence(state.container, state.preferenceKey);

        state.onRender?.();
    }

    async function mountSubComposer(el, sectionContainer) {
        let state = subStates.get(el.id);
        if (!state) {
            state = {
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
                state.gridCols = newCols;
                if (!state.editing) {
                    applySubLayoutForCurrentGridColumns(state);
                }
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

    return {
        mountSubComposer,
        unmountSubComposer,
        renderSubGrid,
        compactSubPlacements,
        computeSubGridDimensions,
        initializeSubPlacements,
    };
}
