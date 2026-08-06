/**
 * Rendering helpers for page composer grid and sub-page views.
 * Public exports: createComposerRenderer(deps) returns layout and render helpers; example: createComposerRenderer(deps).render().
 *
 * @param {object} deps
 * @returns {object}
 */
import {
    buildOccupiedSet,
    checkPlacement,
    gridStep,
    halfGrid,
    registerOccupiedPlacement,
} from "./grid-math.js";
export function createComposerRenderer({
    state,
    UNIT,
    MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT,
    COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS,
    i18n,
    escapeHtml,
    getGridSize,
    renderMissingElementContent,
    createGridOverlay,
    createCell,
    createMissingCell,
    createElementsPanel,
    computeGridDimensions,
    initializePlacements,
    applyLayoutForCurrentGridColumns,
    computeSubGridDimensions,
    initializeSubPlacements,
    syncEditToggle,
    mountSubComposer,
    unmountSubComposer,
    captureFormState,
    restoreFormState,
    mergeFormStateSnapshots,
    loadPersistedFormState,
    bindFormDraftPersistence,
}) {
    const MEDIA_PRESERVE_SELECTOR =
        'iframe,img,video,audio,canvas,object,embed,[data-composer-preserve="true"]';
    function getPreservedElementNodes() {
        if (!state.preservedElementNodes) {
            state.preservedElementNodes = new Map();
        }
        return state.preservedElementNodes;
    }
    function getPreservedElementParking() {
        if (state.preservedElementParking?.isConnected) {
            return state.preservedElementParking;
        }
        const parking = document.createElement("div");
        parking.className = "composer-preserved-element-parking";
        parking.setAttribute("aria-hidden", "true");
        state.root.appendChild(parking);
        state.preservedElementParking = parking;
        return parking;
    }
    function shouldPreserveRenderedHost(host) {
        return (
            state.enableDomParking &&
            Boolean(host?.querySelector?.(MEDIA_PRESERVE_SELECTOR))
        );
    }
    function shouldPreserveRenderedHtml(element, html) {
        if (!state.enableDomParking) return false;
        if (element.preserveDom || element.preserveOnRefresh) return true;
        const template = document.createElement("template");
        template.innerHTML = html;
        return Boolean(template.content.querySelector(MEDIA_PRESERVE_SELECTOR));
    }
    function moveHostChildrenToPreservedNode(host) {
        const preserved = document.createElement("div");
        preserved.className = "composer-preserved-element-content";
        while (host.firstChild) {
            preserved.appendChild(host.firstChild);
        }
        return preserved;
    }
    function parkPreservedElementNodes() {
        if (!state.enableDomParking) return;
        const preservedNodes = getPreservedElementNodes();
        const parking = getPreservedElementParking();
        state.contentGrid
            ?.querySelectorAll("[data-composer-element]")
            .forEach((host) => {
                const elementId = host.dataset.composerElement;
                if (!elementId) return;
                let preserved = preservedNodes.get(elementId);
                if (!preserved && shouldPreserveRenderedHost(host)) {
                    preserved = moveHostChildrenToPreservedNode(host);
                    preservedNodes.set(elementId, preserved);
                }
                if (preserved?.isConnected) {
                    parking.appendChild(preserved);
                }
            });
    }
    function renderElementContent(host, element) {
        const preservedNodes = getPreservedElementNodes();
        let preserved = preservedNodes.get(element.id);
        if (preserved) {
            host.replaceChildren(preserved);
            return;
        }
        const html = element.render();
        if (shouldPreserveRenderedHtml(element, html)) {
            preserved = document.createElement("div");
            preserved.className = "composer-preserved-element-content";
            preserved.innerHTML = html;
            preservedNodes.set(element.id, preserved);
            host.replaceChildren(preserved);
            return;
        }
        host.innerHTML = html;
    }
    function refreshElements(elementIds) {
        for (const elementId of elementIds) {
            const element = state.elements.find(
                (candidateElement) => candidateElement.id === elementId,
            );
            const host = state.contentGrid?.querySelector(
                `[data-composer-element="${CSS.escape(elementId)}"]`,
            );
            if (element && host instanceof HTMLElement) {
                renderElementContent(host, element);
            }
        }
    }
    function repackPlacementsIntoColumns(
        sortedVisible,
        maxCols,
        elems = state.elements,
    ) {
        const packed = [];
        const cStep = gridStep(maxCols);
        for (const orig of sortedVisible) {
            const element = elems.find((e) => e.id === orig.id);
            const gridSize = element ? getGridSize(element) : null;
            let w;
            if (gridSize?.fullWidth) {
                w = maxCols;
            } else if (gridSize?.halfWidth) {
                w = Math.min(
                    maxCols,
                    Math.max(gridSize.min[0], halfGrid(maxCols)),
                );
            } else {
                w = Math.min(orig.w, maxCols);
            }
            const h = orig.h;
            let placed = false;
            for (let row = 0; !placed; row += cStep) {
                for (
                    let col = 0;
                    col <= Math.max(0, maxCols - w);
                    col += cStep
                ) {
                    const cells = buildOccupiedSet(packed, [], null);
                    const fits = checkPlacement(cells, col, row, w, h);
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
    /**
     * Resolves min/max width constraints for a placement at the current grid
     * column count by combining the placement size with the element's grid-size
     * contract.
     *
     * @param {{ id: string, w: number }} placement
     * @param {number} maxCols
     * @param {Array<{ id: string, gridSize?: object }>} [elems]
     * @returns {{ min: number, max: number }}
     */
    function resolvePlacementWidthBounds(
        placement,
        maxCols,
        elems = state.elements,
    ) {
        const element = elems.find((entry) => entry.id === placement.id);
        const currentWidth = Math.min(maxCols, Math.max(1, placement.w));
        if (!element) {
            return {
                min: currentWidth,
                max: maxCols,
            };
        }
        const gridSize = getGridSize(element);
        const minWidth = Math.min(maxCols, Math.max(1, gridSize.min[0]));
        if (gridSize.fullWidth || gridSize.fillWidth) {
            return { min: maxCols, max: maxCols };
        }
        if (gridSize.halfWidth) {
            const halfWidth = Math.min(
                maxCols,
                Math.max(minWidth, halfGrid(maxCols)),
            );
            return { min: halfWidth, max: halfWidth };
        }
        const declaredMaxWidth =
            Array.isArray(gridSize.max) &&
            Number.isFinite(gridSize.max[0]) &&
            gridSize.max[0] !== null
                ? gridSize.max[0]
                : null;
        const maxWidth = declaredMaxWidth
            ? Math.min(maxCols, Math.max(minWidth, declaredMaxWidth))
            : maxCols;
        return { min: minWidth, max: maxWidth };
    }
    /**
     * Normalizes each visible row so multi-pane rows expand or contract to the
     * active grid column count while respecting per-element width bounds.
     *
     * @param {Array<{ id: string, col: number, row: number, w: number, h: number }>} sortedVisible
     * @param {number} maxCols
     * @param {Array<{ id: string, gridSize?: object }>} [elems] Defaults to the composer's current state.elements array.
     * @returns {Array<{ id: string, col: number, row: number, w: number, h: number }>|null}
     */
    function normalizePlacementRowsForGridWidth(
        sortedVisible,
        maxCols,
        elems = state.elements,
    ) {
        const allowSingleRowFullWidthReclaim =
            shouldUseMobileWidthReclaim() &&
            maxCols <= COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS;
        const step = gridStep(maxCols);
        const epsilon = 0.001;
        const rowGroups = [];
        for (const placement of sortedVisible) {
            const previousRow = rowGroups.at(-1);
            if (!previousRow || previousRow.row !== placement.row) {
                rowGroups.push({
                    row: placement.row,
                    placements: [placement],
                });
                continue;
            }
            previousRow.placements.push(placement);
        }
        const normalized = [];
        let changed = false;
        for (const rowGroup of rowGroups) {
            if (!rowGroup.placements.length) {
                continue;
            }
            const rowPlacementIds = new Set(
                rowGroup.placements.map((placement) => placement.id),
            );
            const occupiedOutsideRow = buildOccupiedSet(
                sortedVisible.filter(
                    (placement) => !rowPlacementIds.has(placement.id),
                ),
                [],
                null,
            );
            if (rowGroup.placements.length === 1) {
                const placement = rowGroup.placements[0];
                const bounds = resolvePlacementWidthBounds(
                    placement,
                    maxCols,
                    elems,
                );
                const boundedWidth = Math.min(
                    bounds.max,
                    Math.max(bounds.min, placement.w),
                );
                const shouldExpandToFullWidth =
                    allowSingleRowFullWidthReclaim &&
                    boundedWidth < bounds.max &&
                    canExpandPlacementWithoutConflicts(
                        placement,
                        occupiedOutsideRow,
                        bounds.max,
                    );
                const normalizedPlacement = shouldExpandToFullWidth
                    ? {
                          ...placement,
                          col: 0,
                          w: bounds.max,
                      }
                    : {
                          ...placement,
                          w: boundedWidth,
                      };
                if (
                    normalizedPlacement.col !== placement.col ||
                    normalizedPlacement.w !== placement.w
                ) {
                    changed = true;
                }
                if (
                    !checkPlacement(
                        occupiedOutsideRow,
                        normalizedPlacement.col,
                        normalizedPlacement.row,
                        normalizedPlacement.w,
                        normalizedPlacement.h,
                    )
                ) {
                    return null;
                }
                normalized.push(normalizedPlacement);
                continue;
            }
            const descriptors = rowGroup.placements.map((placement) => {
                const bounds = resolvePlacementWidthBounds(
                    placement,
                    maxCols,
                    elems,
                );
                const boundedWidth = Math.min(
                    bounds.max,
                    Math.max(bounds.min, placement.w),
                );
                return {
                    placement,
                    min: bounds.min,
                    max: bounds.max,
                    proportionalBaseWidth: boundedWidth,
                    assignedWidth: boundedWidth,
                };
            });
            if (
                descriptors.some(
                    (descriptor) =>
                        descriptor.min === maxCols &&
                        rowGroup.placements.length > 1,
                )
            ) {
                return null;
            }
            const minimumWidthTotal = descriptors.reduce(
                (sum, descriptor) => sum + descriptor.min,
                0,
            );
            if (minimumWidthTotal > maxCols + epsilon) {
                return null;
            }
            const ratioTotal = descriptors.reduce(
                (sum, descriptor) => sum + descriptor.proportionalBaseWidth,
                0,
            );
            if (ratioTotal <= 0) {
                return null;
            }
            for (const descriptor of descriptors) {
                const rawTarget =
                    (descriptor.proportionalBaseWidth / ratioTotal) * maxCols;
                descriptor.assignedWidth = Math.min(
                    descriptor.max,
                    Math.max(
                        descriptor.min,
                        Math.round(rawTarget / step) * step,
                    ),
                );
            }
            let currentTotal = descriptors.reduce(
                (sum, descriptor) => sum + descriptor.assignedWidth,
                0,
            );
            let remaining = Math.round((maxCols - currentTotal) / step) * step;
            let guard = 0;
            // Guard width redistribution loops using the maximum number of grid
            // step changes each pane can take across the grid in both growth and
            // shrink directions to prevent infinite redistribution attempts.
            const maxIterations = Math.max(
                1,
                Math.ceil(maxCols / step) * descriptors.length * 2,
            );
            const getProportionalDelta = (descriptor) =>
                descriptor.assignedWidth - descriptor.proportionalBaseWidth;
            while (remaining > epsilon && guard < maxIterations) {
                guard++;
                const candidate = descriptors
                    .filter(
                        (descriptor) =>
                            descriptor.assignedWidth + step <=
                            descriptor.max + epsilon,
                    )
                    .sort((left, right) => {
                        const rightDistance = getProportionalDelta(right);
                        const leftDistance = getProportionalDelta(left);
                        if (rightDistance !== leftDistance) {
                            return rightDistance - leftDistance;
                        }
                        return (
                            right.proportionalBaseWidth -
                            left.proportionalBaseWidth
                        );
                    })[0];
                if (!candidate) {
                    break;
                }
                candidate.assignedWidth += step;
                remaining = Math.round((remaining - step) / step) * step;
            }
            while (remaining < -epsilon && guard < maxIterations) {
                guard++;
                const candidate = descriptors
                    .filter(
                        (descriptor) =>
                            descriptor.assignedWidth - step >=
                            descriptor.min - epsilon,
                    )
                    .sort((left, right) => {
                        const rightDistance = getProportionalDelta(right);
                        const leftDistance = getProportionalDelta(left);
                        if (rightDistance !== leftDistance) {
                            return rightDistance - leftDistance;
                        }
                        return right.assignedWidth - left.assignedWidth;
                    })[0];
                if (!candidate) {
                    break;
                }
                candidate.assignedWidth -= step;
                remaining = Math.round((remaining + step) / step) * step;
            }
            if (Math.abs(remaining) > epsilon) {
                return null;
            }
            let column = 0;
            const occupiedCells = new Set(occupiedOutsideRow);
            for (const descriptor of descriptors) {
                if (column + descriptor.assignedWidth > maxCols + epsilon) {
                    return null;
                }
                const nextPlacement = {
                    ...descriptor.placement,
                    col: column,
                    w: descriptor.assignedWidth,
                };
                if (
                    !checkPlacement(
                        occupiedCells,
                        nextPlacement.col,
                        nextPlacement.row,
                        nextPlacement.w,
                        nextPlacement.h,
                    )
                ) {
                    return null;
                }
                if (
                    nextPlacement.col !== descriptor.placement.col ||
                    nextPlacement.w !== descriptor.placement.w
                ) {
                    changed = true;
                }
                normalized.push(nextPlacement);
                registerOccupiedPlacement(occupiedCells, nextPlacement);
                column += descriptor.assignedWidth;
            }
        }
        return changed ? normalized : sortedVisible;
    }
    /**
     * Determines whether compact single-row width reclaim should run for the
     * current viewport.
     *
     * @returns {boolean}
     */
    function shouldUseMobileWidthReclaim() {
        if (typeof window === "undefined") {
            return false;
        }
        if (typeof window.matchMedia === "function") {
            return window.matchMedia(
                `(max-width: ${MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT}px)`,
            ).matches;
        }
        return (
            Number.isFinite(window.innerWidth) &&
            window.innerWidth <= MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT
        );
    }
    /**
     * Checks whether expanding a placement to a target width would collide with
     * any other visible placement.
     *
     * @param {{ id: string, row: number, h: number }} placement
     * @param {Set<string>} occupiedCells
     * @param {number} targetWidth
     * @returns {boolean}
     */
    function canExpandPlacementWithoutConflicts(
        placement,
        occupiedCells,
        targetWidth,
    ) {
        return checkPlacement(
            occupiedCells,
            0,
            placement.row,
            targetWidth,
            placement.h,
        );
    }
    function syncLayoutToCurrentGridColumns() {
        if (!state.layout || !state.contentGrid) return;
        computeGridDimensions();
        initializePlacements();
        const adjustedPlacements = computeViewPlacements();
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
    function syncSubLayoutToCurrentGridColumns(subState) {
        if (!subState.layout || !subState.container) return;
        computeSubGridDimensions(subState);
        initializeSubPlacements(subState);
        const adjustedPlacements = computeSubViewPlacements(subState);
        const adjustedById = new Map(
            adjustedPlacements.map((placement) => [placement.id, placement]),
        );
        subState.layout.placements = subState.layout.placements.map(
            (placement) => {
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
            },
        );
    }
    function computeViewPlacements() {
        const visible = state.layout.placements
            .filter((p) => !state.layout.hidden.includes(p.id))
            .sort((a, b) => a.row - b.row || a.col - b.col);
        const normalizedRows = normalizePlacementRowsForGridWidth(
            visible,
            state.gridCols,
        );
        if (normalizedRows) {
            return normalizedRows;
        }
        const needsRepack = visible.some((p) => {
            if (p.col + p.w > state.gridCols) return true;
            const element = state.elements.find((e) => e.id === p.id);
            if (!element) return false;
            const gridSize = getGridSize(element);
            if (gridSize.fullWidth && p.w !== state.gridCols) return true;
            if (gridSize.halfWidth) {
                const target = Math.min(
                    state.gridCols,
                    Math.max(gridSize.min[0], halfGrid(state.gridCols)),
                );
                if (p.w !== target) return true;
            }
            return false;
        });
        if (!needsRepack) return visible;
        return repackPlacementsIntoColumns(visible, state.gridCols);
    }
    function computeSubViewPlacements(subState) {
        const visible = subState.layout.placements
            .filter((pl) => !subState.layout.hidden.includes(pl.id))
            .sort((a, b) => a.row - b.row || a.col - b.col);
        const normalizedRows = normalizePlacementRowsForGridWidth(
            visible,
            subState.gridCols,
            subState.elements,
        );
        if (normalizedRows) {
            return normalizedRows;
        }
        const needsRepack = visible.some((pl) => {
            if (pl.col + pl.w > subState.gridCols) return true;
            const element = subState.elements.find((e) => e.id === pl.id);
            if (!element) return false;
            const gridSize = getGridSize(element);
            if (gridSize.fullWidth && pl.w !== subState.gridCols) return true;
            if (gridSize.halfWidth) {
                const target = Math.min(
                    subState.gridCols,
                    Math.max(gridSize.min[0], halfGrid(subState.gridCols)),
                );
                if (pl.w !== target) return true;
            }
            return false;
        });
        if (!needsRepack) return visible;
        return repackPlacementsIntoColumns(
            visible,
            subState.gridCols,
            subState.elements,
        );
    }
    function getVisibleComposerPlacements() {
        return state.editing
            ? state.layout.placements
                  .filter((p) => !state.layout.hidden.includes(p.id))
                  .sort((a, b) => a.row - b.row || a.col - b.col)
            : computeViewPlacements();
    }
    function getPlacementScale(placements) {
        const hasFractional =
            !state.frameless &&
            placements.some(
                (p) =>
                    p.col % 1 !== 0 ||
                    p.row % 1 !== 0 ||
                    p.w % 1 !== 0 ||
                    p.h % 1 !== 0,
            );
        return hasFractional ? 2 : 1;
    }
    function applySectionGridMetrics(section, placements) {
        if (state.frameless) return 1;
        const scale = getPlacementScale(placements);
        section.classList.add("composer-view-grid");
        section.style.setProperty(
            "--grid-cols",
            String(state.gridCols * scale),
        );
        section.style.setProperty(
            "--composer-grid-row-size",
            `${UNIT / scale}px`,
        );
        return scale;
    }
    function applyCardPlacement(card, placement, scale) {
        if (state.frameless) return;
        const scaledCol = placement.col * scale;
        const scaledRow = placement.row * scale;
        const scaledWidth = placement.w * scale;
        const scaledHeight = placement.h * scale;
        card.style.gridColumn = `${Math.round(scaledCol) + 1} / span ${Math.round(scaledWidth)}`;
        card.style.gridRow = `${Math.round(scaledRow) + 1} / span ${Math.round(scaledHeight)}`;
    }
    function renderPlacementCards(section, placements, scale) {
        const renderedIds = new Set(
            placements.map((placement) => placement.id),
        );
        section
            .querySelectorAll(
                ":scope > .widget-card[data-composer-element], :scope > .widget-card--missing[data-composer-element]",
            )
            .forEach((card) => {
                if (!renderedIds.has(card.dataset.composerElement)) {
                    card.remove();
                }
            });
        for (const placement of placements) {
            const element = state.elements.find((e) => e.id === placement.id);
            const isMissing = !element;
            let card = Array.from(section.children).find(
                (child) =>
                    child.dataset?.composerElement === placement.id &&
                    !child.classList.contains("composer-cell"),
            );
            if (!card) {
                card = document.createElement("section");
                card.dataset.composerElement = placement.id;
                section.appendChild(card);
                if (isMissing) {
                    card.innerHTML = renderMissingElementContent(placement.id);
                } else {
                    renderElementContent(card, element);
                }
            }
            card.className = isMissing
                ? "widget-card widget-card--missing"
                : "widget-card";
            applyCardPlacement(card, placement, scale);
        }
    }
    function clearEditChrome(section) {
        section
            .querySelectorAll(
                ":scope > .composer-grid-overlay, :scope > .composer-cell, :scope > .composer-shade, :scope > .composer-dropzone-line",
            )
            .forEach((node) => node.remove());
    }
    function renderEditChrome(section, placements) {
        section.appendChild(createGridOverlay());
        for (const placement of placements) {
            const element = state.elements.find((e) => e.id === placement.id);
            if (!element) {
                section.appendChild(createMissingCell(placement));
                continue;
            }
            const cell = createCell(element, placement, {
                includeContent: false,
            });
            cell.setAttribute("aria-label", element.label ?? placement.id);
            section.appendChild(cell);
        }
    }
    function renderGridComposer() {
        if (!document.contains(state.contentGrid)) return;
        document.getElementById("composer-elements-panel")?.remove();
        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }
        computeGridDimensions();
        if (!state.editing && state.persistLayoutPreferences) {
            applyLayoutForCurrentGridColumns();
        }
        initializePlacements();
        computeGridDimensions();
        state.contentGrid.classList.toggle(
            "composer-grid-active",
            state.editing,
        );
        const gridFormSnapshot = mergeFormStateSnapshots(
            loadPersistedFormState(state.preferenceKey),
            captureFormState(state.contentGrid),
        );
        let panel = state.contentGrid.querySelector(":scope > .content-panel");
        let section = panel?.querySelector(":scope > .content-section");
        if (!panel || !section) {
            parkPreservedElementNodes();
            state.contentGrid.innerHTML = "";
            panel = document.createElement("article");
            panel.className = "content-panel";
            section = document.createElement("div");
            section.className = "content-section";
            panel.appendChild(section);
            state.contentGrid.appendChild(panel);
        }
        state.gridSection = section;
        clearEditChrome(section);
        section.classList.toggle("composer-grid-active", state.editing);
        section.classList.toggle("composer-view-grid", !state.frameless);
        const visiblePlacements = getVisibleComposerPlacements();
        const scale = applySectionGridMetrics(section, visiblePlacements);
        renderPlacementCards(section, visiblePlacements, scale);
        if (state.editing) {
            computeGridDimensions();
            section.style.minHeight = `${state.gridPixelHeight ?? state.gridRows * UNIT}px`;
            renderEditChrome(section, visiblePlacements);
            createElementsPanel();
        } else {
            section.style.minHeight = "";
        }
        syncEditToggle();
        restoreFormState(state.contentGrid, gridFormSnapshot);
        bindFormDraftPersistence(state.contentGrid, state.preferenceKey);
        const renderedElementIds = visiblePlacements.map((p) => p.id);
        for (const id of renderedElementIds) {
            const element = state.elements.find((entry) => entry.id === id);
            element?.onRender?.();
        }
        state.onRender?.();
    }
    function getEffectiveLayout() {
        const allIds = state.elements.map((e) => e.id);
        const pinnedIds = state.elements
            .filter((e) => e.pinned)
            .map((e) => e.id);
        const storedOrder = (state.layout?.order ?? []).filter((id) =>
            allIds.includes(id),
        );
        const storedHidden = state.layout?.hidden ?? null;
        const defaultHiddenIds = state.elements
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
                const element = state.elements.find((e) => e.id === id);
                if (!element) return "";
                const dragAttrs = state.editing ? ` draggable="true"` : "";
                const dragHandle = state.editing
                    ? `<div class="composer-drag-handle" aria-hidden="true">
               <span class="composer-drag-icon">⠿</span>
               <span class="composer-drag-label">${element.label}</span>
               ${!element.pinned ? `<button class="composer-remove-btn" data-composer-remove="${element.id}" type="button">${i18n.t("ui.reuse.remove")}</button>` : ""}
             </div>`
                    : "";
                const editingClass = state.editing ? " composer-editing" : "";
                const isActive =
                    state.subPageNavigation &&
                    element.id === state.activeSubPageId;
                const activeClass = isActive ? " active" : "";
                const hiddenAttr =
                    state.subPageNavigation && !isActive ? " hidden" : "";
                if (element.subComposerOptions) {
                    const headingHtml = element.subComposerOptions.heading
                        ? `<h2 class="sub-composer-heading">${escapeHtml(element.subComposerOptions.heading)}</h2>`
                        : "";
                    return `<div class="content-section${activeClass}"${hiddenAttr} id="${element.id}">${headingHtml}<div class="sub-composer-inner"></div></div>`;
                }
                return `<div class="content-section${activeClass}"${hiddenAttr} id="${element.id}"><section class="widget-card${editingClass}" data-composer-element="${element.id}"${dragAttrs}>${dragHandle}${element.render()}</section></div>`;
            })
            .join("");
    }
    function renderLibraryPanel(effectiveLayout) {
        const hiddenElements = state.elements.filter((e) =>
            effectiveLayout.hidden.includes(e.id),
        );
        const listItems = hiddenElements
            .map(
                (el) => `<li class="composer-library-item">
           <span>${el.label}</span>
           <button class="composer-add-btn" data-composer-add="${el.id}" type="button">${i18n.t("ui.reuse.add")}</button>
         </li>`,
            )
            .join("");
        const emptyMsg = !hiddenElements.length
            ? `<li class="composer-library-empty">${i18n.t("ui.reuse.all_elements_visible")}</li>`
            : "";
        return `
      <aside class="composer-library">
        <div class="composer-library-header">
          <h3>${i18n.t("ui.reuse.elements")}</h3>
        </div>
        <ul class="composer-library-list">${listItems}${emptyMsg}</ul>
      </aside>
    `;
    }
    function renderSubPageComposer() {
        const effectiveLayout = getEffectiveLayout();
        let html = "";
        const cardsHtml = renderCards(effectiveLayout);
        const editingClass = state.editing
            ? " composer-content-panel--editing"
            : "";
        html += `<article class="content-panel${editingClass}">${cardsHtml}</article>`;
        if (state.editing) {
            html += renderLibraryPanel(effectiveLayout);
        }
        state.contentGrid.innerHTML = html;
        bindSubPageComposerEvents();
        syncEditToggle();
        for (const id of effectiveLayout.order) {
            if (effectiveLayout.hidden.includes(id)) continue;
            const element = state.elements.find((entry) => entry.id === id);
            element?.onRender?.();
        }
        state.onRender?.();
        const activeEl = state.elements.find(
            (e) => e.id === state.activeSubPageId,
        );
        if (activeEl?.subComposerOptions) {
            const outerDiv = state.contentGrid.querySelector(
                `#${state.activeSubPageId}`,
            );
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                state.contentGrid;
            mountSubComposer(activeEl, sectionDiv).catch(() => {});
        }
    }
    function bindSubPageComposerEvents() {
        state.contentGrid
            .querySelectorAll("[data-composer-remove]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.composerRemove;
                    const effective = getEffectiveLayout();
                    state.layout = {
                        order: effective.order,
                        hidden: [...effective.hidden, id],
                    };
                    renderSubPageComposer();
                });
            });
        state.contentGrid
            .querySelectorAll("[data-composer-add]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.composerAdd;
                    const effective = getEffectiveLayout();
                    state.layout = {
                        order: effective.order,
                        hidden: effective.hidden.filter((h) => h !== id),
                    };
                    renderSubPageComposer();
                });
            });
        state.contentGrid
            .querySelectorAll("[data-composer-element][draggable]")
            .forEach((card) => {
                card.addEventListener("dragstart", (event) => {
                    state.dragSourceId = card.dataset.composerElement;
                    card.classList.add("composer-dragging");
                    event.dataTransfer.effectAllowed = "move";
                });
                card.addEventListener("dragend", () => {
                    card.classList.remove("composer-dragging");
                    state.contentGrid
                        .querySelectorAll(".composer-drag-over")
                        .forEach((el) => {
                            el.classList.remove("composer-drag-over");
                        });
                    state.dragSourceId = null;
                });
                card.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (card.dataset.composerElement !== state.dragSourceId) {
                        state.contentGrid
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
                    if (!state.dragSourceId || state.dragSourceId === targetId)
                        return;
                    const effective = getEffectiveLayout();
                    const visibleOrder = effective.order.filter(
                        (id) => !effective.hidden.includes(id),
                    );
                    const sourceIdx = visibleOrder.indexOf(state.dragSourceId);
                    const targetIdx = visibleOrder.indexOf(targetId);
                    if (sourceIdx === -1 || targetIdx === -1) return;
                    visibleOrder.splice(sourceIdx, 1);
                    // Removing source shifts all subsequent indices by -1; adjust targetIdx when source precedes target.
                    const insertIdx =
                        sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
                    visibleOrder.splice(insertIdx, 0, state.dragSourceId);

                    const newOrder = [
                        ...visibleOrder,
                        ...effective.order.filter((id) =>
                            effective.hidden.includes(id),
                        ),
                    ];
                    state.layout = {
                        order: newOrder,
                        hidden: effective.hidden,
                    };
                    renderSubPageComposer();
                });
            });
    }

    function render() {
        if (!state.contentGrid) return;
        if (state.subPageNavigation) {
            renderSubPageComposer();
        } else {
            renderGridComposer();
        }
    }

    return {
        refreshElements,
        render,
        renderGridComposer,
        computeSubViewPlacements,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns,
    };
}
