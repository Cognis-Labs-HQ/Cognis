/**
 * Resolves visible composer placement geometry without mutating saved profiles.
 * Exports createPlacementResolver for main and nested composer layouts.
 * @example const placements = createPlacementResolver(dependencies).computeViewPlacements();
 * @param {object} dependencies Layout state, sizing and initialization callbacks.
 * @returns {object} View resolution and edit-layout synchronization functions.
 */
import {
    isCompactComposer,
    stackComposerPlacements,
} from "./responsive-layout.js";
import {
    buildOccupiedSet,
    checkPlacement,
    gridStep,
    halfGrid,
    registerOccupiedPlacement,
} from "./grid-math.js";

export function createPlacementResolver({
    state,
    getGridSize,
    MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT,
    COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS,
    computeGridDimensions,
    initializePlacements,
    computeSubGridDimensions,
    initializeSubPlacements,
}) {
    function repackPlacementsIntoColumns(
        sortedVisible,
        maxCols,
        elems = state.elements,
    ) {
        const packed = [];
        const cStep = gridStep(maxCols);
        for (const orig of sortedVisible) {
            const bounds = resolvePlacementWidthBounds(orig, maxCols, elems);
            const w = Math.min(bounds.max, Math.max(bounds.min, orig.w));
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
        const result = changed ? normalized : sortedVisible;
        return hasWidthViolation(result, maxCols, elems) ? null : result;
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
    function hasWidthViolation(placements, columns, elements) {
        return placements.some((placement) => {
            const bounds = resolvePlacementWidthBounds(
                placement,
                columns,
                elements,
            );
            return (
                placement.col < 0 ||
                placement.col + placement.w > columns ||
                placement.w < bounds.min ||
                placement.w > bounds.max
            );
        });
    }

    function computeViewPlacements() {
        const visible = state.layout.placements
            .filter(
                (candidatePlacement) =>
                    !state.layout.hidden.includes(candidatePlacement.id),
            )
            .sort(
                (leftEntry, rightEntry) =>
                    leftEntry.row - rightEntry.row ||
                    leftEntry.col - rightEntry.col,
            );
        if (
            !state.frameless &&
            isCompactComposer(state.contentGrid, state.stackAt)
        ) {
            const order = state.readingOrder ?? [];
            const rank = (id) => {
                const index = order.indexOf(id);
                return index < 0 ? order.length : index;
            };
            return stackComposerPlacements(
                [...visible].sort(
                    (leftEntry, rightEntry) =>
                        rank(leftEntry.id) - rank(rightEntry.id),
                ),
                state.gridCols,
            );
        }
        const normalizedRows = normalizePlacementRowsForGridWidth(
            visible,
            state.gridCols,
        );
        if (normalizedRows) {
            return normalizedRows;
        }
        if (!hasWidthViolation(visible, state.gridCols, state.elements))
            return visible;
        return repackPlacementsIntoColumns(visible, state.gridCols);
    }
    function computeSubViewPlacements(subState) {
        const visible = subState.layout.placements
            .filter(
                (candidatePlacement) =>
                    !subState.layout.hidden.includes(candidatePlacement.id),
            )
            .sort(
                (leftEntry, rightEntry) =>
                    leftEntry.row - rightEntry.row ||
                    leftEntry.col - rightEntry.col,
            );
        if (isCompactComposer(subState.container)) {
            return stackComposerPlacements(visible, subState.gridCols);
        }
        const normalizedRows = normalizePlacementRowsForGridWidth(
            visible,
            subState.gridCols,
            subState.elements,
        );
        if (normalizedRows) {
            return normalizedRows;
        }
        if (!hasWidthViolation(visible, subState.gridCols, subState.elements))
            return visible;
        return repackPlacementsIntoColumns(
            visible,
            subState.gridCols,
            subState.elements,
        );
    }
    return {
        computeViewPlacements,
        computeSubViewPlacements,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns,
    };
}
