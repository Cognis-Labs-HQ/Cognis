/**
 * Resolves visible composer placement geometry without mutating saved profiles.
 * Exports createPlacementResolver for main and nested composer layouts.
 * @example const placements = createPlacementResolver(dependencies).computeViewPlacements();
 * @param {object} dependencies Layout state, sizing and initialization callbacks.
 * @returns {object} View resolution and edit-layout synchronization functions.
 */
import {
    isCompactComposer,
    hasGridProfile,
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
    COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS:
        COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLUMNS,
    computeGridDimensions,
    initializePlacements,
    computeSubGridDimensions: computeNestedGridDimensions,
    initializeSubPlacements: initializeNestedPlacements,
}) {
    function repackPlacementsIntoColumns(
        sortedVisible,
        maxColumns,
        elements = state.elements,
    ) {
        const packed = [];
        const columnStep = gridStep(maxColumns);
        for (const originalPlacement of sortedVisible) {
            const bounds = resolvePlacementWidthBounds(
                originalPlacement,
                maxColumns,
                elements,
            );
            const width = Math.min(
                bounds.max,
                Math.max(bounds.min, originalPlacement.w),
            );
            const height = originalPlacement.h;
            let placed = false;
            for (let row = 0; !placed; row += columnStep) {
                for (
                    let column = 0;
                    column <= Math.max(0, maxColumns - width);
                    column += columnStep
                ) {
                    const cells = buildOccupiedSet(packed, [], null);
                    const fits = checkPlacement(
                        cells,
                        column,
                        row,
                        width,
                        height,
                    );
                    if (fits) {
                        packed.push({
                            ...originalPlacement,
                            col: column,
                            row,
                            w: width,
                        });
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
     * @param {number} maxColumns
     * @param {Array<{ id: string, gridSize?: object }>} [elements]
     * @returns {{ min: number, max: number }}
     */
    function resolvePlacementWidthBounds(
        placement,
        maxColumns,
        elements = state.elements,
    ) {
        const element = elements.find((entry) => entry.id === placement.id);
        const currentWidth = Math.min(maxColumns, Math.max(1, placement.w));
        if (!element) {
            return {
                min: currentWidth,
                max: maxColumns,
            };
        }
        const gridSize = getGridSize(element);
        const minWidth = Math.min(maxColumns, Math.max(1, gridSize.min[0]));
        if (gridSize.fullWidth || gridSize.fillWidth) {
            return { min: maxColumns, max: maxColumns };
        }
        if (gridSize.halfWidth) {
            const halfWidth = Math.min(
                maxColumns,
                Math.max(minWidth, halfGrid(maxColumns)),
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
            ? Math.min(maxColumns, Math.max(minWidth, declaredMaxWidth))
            : maxColumns;
        return { min: minWidth, max: maxWidth };
    }
    /**
     * Normalizes each visible row so multi-pane rows expand or contract to the
     * active grid column count while respecting per-element width bounds.
     *
     * @param {Array<{ id: string, col: number, row: number, w: number, h: number }>} sortedVisible
     * @param {number} maxColumns
     * @param {Array<{ id: string, gridSize?: object }>} [elements] Defaults to the composer's current state.elements array.
     * @returns {Array<{ id: string, col: number, row: number, w: number, h: number }>|null}
     */
    function normalizePlacementRowsForGridWidth(
        sortedVisible,
        maxColumns,
        elements = state.elements,
    ) {
        const allowSingleRowFullWidthReclaim =
            shouldUseMobileWidthReclaim() &&
            maxColumns <= COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLUMNS;
        const step = gridStep(maxColumns);
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
                    maxColumns,
                    elements,
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
                    maxColumns,
                    elements,
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
                        descriptor.min === maxColumns &&
                        rowGroup.placements.length > 1,
                )
            ) {
                return null;
            }
            const minimumWidthTotal = descriptors.reduce(
                (sum, descriptor) => sum + descriptor.min,
                0,
            );
            if (minimumWidthTotal > maxColumns + epsilon) {
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
                    (descriptor.proportionalBaseWidth / ratioTotal) *
                    maxColumns;
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
            let remaining =
                Math.round((maxColumns - currentTotal) / step) * step;
            let guard = 0;
            // Guard width redistribution loops using the maximum number of grid
            // step changes each pane can take across the grid in both growth and
            // shrink directions to prevent infinite redistribution attempts.
            const maxIterations = Math.max(
                1,
                Math.ceil(maxColumns / step) * descriptors.length * 2,
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
                if (column + descriptor.assignedWidth > maxColumns + epsilon) {
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
        return hasWidthViolation(result, maxColumns, elements) ? null : result;
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
    function syncNestedLayoutToCurrentGridColumns(nestedState) {
        if (!nestedState.layout || !nestedState.container) return;
        computeNestedGridDimensions(nestedState);
        initializeNestedPlacements(nestedState);
        const adjustedPlacements = computeNestedViewPlacements(nestedState);
        const adjustedById = new Map(
            adjustedPlacements.map((placement) => [placement.id, placement]),
        );
        nestedState.layout.placements = nestedState.layout.placements.map(
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

    function resolveSavedPlacements(layoutState, visible) {
        if (!layoutState.editing && !hasGridProfile(layoutState)) return null;
        return hasWidthViolation(
            visible,
            layoutState.gridCols,
            layoutState.elements,
        )
            ? repackPlacementsIntoColumns(
                  visible,
                  layoutState.gridCols,
                  layoutState.elements,
              )
            : visible;
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
        const saved = resolveSavedPlacements(state, visible);
        if (saved) return saved;
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
    function computeNestedViewPlacements(nestedState) {
        const visible = nestedState.layout.placements
            .filter(
                (candidatePlacement) =>
                    !nestedState.layout.hidden.includes(candidatePlacement.id),
            )
            .sort(
                (leftEntry, rightEntry) =>
                    leftEntry.row - rightEntry.row ||
                    leftEntry.col - rightEntry.col,
            );
        const saved = resolveSavedPlacements(nestedState, visible);
        if (saved) return saved;
        if (isCompactComposer(nestedState.container)) {
            return stackComposerPlacements(visible, nestedState.gridCols);
        }
        const normalizedRows = normalizePlacementRowsForGridWidth(
            visible,
            nestedState.gridCols,
            nestedState.elements,
        );
        if (normalizedRows) {
            return normalizedRows;
        }
        if (
            !hasWidthViolation(
                visible,
                nestedState.gridCols,
                nestedState.elements,
            )
        )
            return visible;
        return repackPlacementsIntoColumns(
            visible,
            nestedState.gridCols,
            nestedState.elements,
        );
    }
    return {
        computeViewPlacements,
        computeSubViewPlacements: computeNestedViewPlacements,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns: syncNestedLayoutToCurrentGridColumns,
    };
}
