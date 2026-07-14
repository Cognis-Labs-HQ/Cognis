/**
 * Main grid overlay helpers for page composer edit mode.
 * Export: createGridOverlayHandlers(deps). @param {object} deps @returns {object}
 */
import {
    buildOccupiedSet,
    checkPlacement,
    gridStep,
    halfGrid,
    snapGridFloor,
    snapGridRound,
} from "./grid-math.js";

export function createGridOverlayHandlers({
    state,
    UNIT,
    i18n,
    getGridSize,
    renderGridComposer,
    saveLayout,
    endEditMode,
}) {
    function computeGridDimensions() {
        if (!state.contentGrid) return;
        state.contentGrid.style.width = "";
        const width = state.contentGrid.getBoundingClientRect().width;
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
        state.contentGrid.style.minHeight =
            state.frameless && !state.editing
                ? ""
                : `${state.gridRows * UNIT}px`;
        state.contentGrid.style.width = state.editing
            ? `${state.gridCols * UNIT}px`
            : "";
        if (state.editing && state.gridSection) {
            state.gridSection.style.minHeight = `${state.gridRows * UNIT}px`;
            state.gridSection.style.width = `${state.gridCols * UNIT}px`;
        }
    }

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

    function findSwapCandidate(col, row, w, h, excludeId) {
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
            const baseH = gridSize.fullHeight
                ? state.gridRows
                : gridSize.halfHeight
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
        cell.style.left = `${placement.col * UNIT}px`;
        cell.style.top = `${placement.row * UNIT}px`;
        cell.style.width = `${placement.w * UNIT}px`;
        cell.style.height = `${placement.h * UNIT}px`;

        const closeBtn = document.createElement("button");
        closeBtn.className = "composer-close-btn";
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

    function createCell(el, placement) {
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

                    const gridRect = state.gridSection.getBoundingClientRect();
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
                    const rawRow = Math.max(
                        0,
                        snapGridRound(
                            y / UNIT - placement.h / 2,
                            state.gridRows,
                        ),
                    );

                    if (rawRow + placement.h > state.gridRows) {
                        state.gridRows = rawRow + placement.h + 1;
                        state.gridSection.style.minHeight = `${state.gridRows * UNIT}px`;
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
                            state.gridSection.appendChild(dropZoneLine);
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
                    renderGridComposer();
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

            const gridSize = getGridSize(el);

            const shade = document.createElement("div");
            shade.className = "composer-shade";
            shade.style.left = `${placement.col * UNIT}px`;
            shade.style.top = `${placement.row * UNIT}px`;
            shade.style.width = `${placement.w * UNIT}px`;
            shade.style.height = `${placement.h * UNIT}px`;
            state.gridSection.appendChild(shade);

            const cell = handle.closest(".composer-cell");
            cell.classList.add("composer-cell--resizing");

            let currentW = placement.w;
            let currentH = placement.h;

            function clampValue(val, min, max) {
                if (max != null) return Math.max(min, Math.min(max, val));
                return Math.max(min, val);
            }

            function onMove(e) {
                const gridRect = state.gridSection.getBoundingClientRect();
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
                    const targetPlacement = state.layout.placements.find(
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
            if (e.button !== 0) return;
            e.preventDefault();
            item.setPointerCapture(e.pointerId);

            const gridSize = getGridSize(el);
            const w =
                gridSize.fullWidth || gridSize.fillWidth
                    ? state.gridCols
                    : gridSize.halfWidth
                      ? Math.max(gridSize.min[0], halfGrid(state.gridCols))
                      : Math.min(gridSize.default[0], state.gridCols);
            const h = gridSize.fullHeight || gridSize.fillHeight
                ? state.gridRows
                : gridSize.halfHeight
                  ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                  : gridSize.default[1];

            let shade = null;
            let currentCol = -1;
            let currentRow = -1;
            let overGrid = false;

            function onMove(e) {
                const gridRect = state.gridSection.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                const inGrid = x >= 0 && x <= gridRect.width && y >= 0;

                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${w * UNIT}px`;
                        shade.style.height = `${h * UNIT}px`;
                        state.gridSection.appendChild(shade);
                    }
                    const col = Math.max(
                        0,
                        Math.min(
                            state.gridCols - w,
                            snapGridFloor(x, state.gridCols),
                        ),
                    );
                    const rawRow = Math.max(
                        0,
                        snapGridFloor(y, state.gridRows),
                    );
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
                const bounds = getComposerPanelHorizontalBounds(
                    panel.offsetWidth,
                );
                const maxLeft = bounds.maxLeft;
                const minLeft = bounds.minLeft;
                const minTop = getComposerPanelSafeTop();
                const maxTop = Math.max(
                    minTop,
                    window.innerHeight - panel.offsetHeight - 4,
                );
                const newLeft = Math.max(
                    minLeft,
                    Math.min(maxLeft, e.clientX - startX),
                );
                const newTop = Math.max(
                    minTop,
                    Math.min(maxTop, e.clientY - startY),
                );
                panel.style.left = `${newLeft}px`;
                panel.style.top = `${newTop}px`;
                state.panelPosition = { top: newTop, left: newLeft };
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

    function getComposerPanelSafeTop() {
        const navRowBottom =
            state.root.querySelector(".global-navrow")?.getBoundingClientRect()
                ?.bottom ?? 0;
        const topbarBottom =
            state.root.querySelector(".global-topbar")?.getBoundingClientRect()
                ?.bottom ?? 0;
        return Math.max(
            12,
            Math.ceil(Math.max(navRowBottom, topbarBottom) + 12),
        );
    }

    /**
     * Calculates the horizontal drag/placement bounds for the floating composer
     * panel, preferring workspace bounds when available and falling back to the
     * viewport when workspace metrics are unavailable.
     *
     * @param {number} panelWidth
     * @returns {{ minLeft: number, maxLeft: number }}
     */
    function getComposerPanelHorizontalBounds(panelWidth) {
        const workspaceRect = state.root
            .querySelector(".workspace")
            ?.getBoundingClientRect();
        const inset = 12;
        if (workspaceRect) {
            const minLeft = Math.ceil(workspaceRect.left + inset);
            const maxLeft = Math.floor(
                workspaceRect.right - panelWidth - inset,
            );
            if (maxLeft >= minLeft) {
                return { minLeft, maxLeft };
            }
        }
        return {
            minLeft: 4,
            maxLeft: Math.max(4, window.innerWidth - panelWidth - 4),
        };
    }

    function clampComposerPanelLeft(nextLeft, panelWidth) {
        const bounds = getComposerPanelHorizontalBounds(panelWidth);
        return Math.max(bounds.minLeft, Math.min(bounds.maxLeft, nextLeft));
    }

    function createElementsPanel() {
        const hiddenElements = state.elements.filter((e) =>
            state.layout.hidden.includes(e.id),
        );

        const panel = document.createElement("div");
        panel.id = "composer-elements-panel";
        panel.className = "composer-panel";

        let listHtml;
        if (hiddenElements.length === 0) {
            listHtml = `<li class="composer-library-empty">${i18n.t("ui.reuse.all_elements_visible")}</li>`;
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
        <span class="composer-panel-title">${i18n.t("ui.reuse.elements")}</span>
        <button class="composer-panel-minimize-btn" type="button">−</button>
      </div>
      <div class="composer-panel-body">
        <ul class="composer-library-list">${listHtml}</ul>
      </div>
      <div class="composer-panel-actions">
        <button class="composer-discard-btn" type="button">${i18n.t("ui.reuse.discard")}</button>
        <button class="composer-done-btn" type="button">${i18n.t("ui.reuse.done")}</button>
        <button class="composer-reset-btn" type="button">↺ ${i18n.t("ui.reuse.reset_layout")}</button>
      </div>
    `;

        const safeTop = getComposerPanelSafeTop();
        if (state.panelPosition !== null) {
            panel.style.top = `${Math.max(safeTop, state.panelPosition.top)}px`;
            panel.style.left = `${clampComposerPanelLeft(state.panelPosition.left, 240)}px`;
            panel.style.right = "auto";
        } else {
            const gridRect = state.contentGrid.getBoundingClientRect();
            const panelLeft = clampComposerPanelLeft(gridRect.right + 12, 240);
            const panelTop = gridRect.top;
            panel.style.top = `${Math.max(safeTop, panelTop)}px`;
            panel.style.left = `${panelLeft}px`;
            panel.style.right = "auto";
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
                state.editing = false;
                endEditMode();
                await saveLayout();
                renderGridComposer();
            });

        panel
            .querySelector(".composer-discard-btn")
            .addEventListener("click", () => {
                state.layout = state.layoutSnapshot;
                state.editing = false;
                endEditMode();
                renderGridComposer();
            });

        panel
            .querySelector(".composer-reset-btn")
            .addEventListener("click", async () => {
                state.layout = { placements: [], hidden: [] };
                initializePlacements();
                state.layoutSnapshot = JSON.parse(JSON.stringify(state.layout));
                await saveLayout();
                renderGridComposer();
            });

        panel.querySelectorAll("[data-composer-panel-item]").forEach((item) => {
            const elId = item.dataset.composerPanelItem;
            const element = state.elements.find((e) => e.id === elId);
            if (element) bindPanelItemDrag(item, element);
        });
    }

    return {
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
