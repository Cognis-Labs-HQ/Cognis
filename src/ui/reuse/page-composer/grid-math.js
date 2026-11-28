export const PAGE_COMPOSER_GRID_UNIT = 90;
export const PAGE_COMPOSER_GRID_GAP = 8;

/**
 * Returns the draggable snap increment for an element dimension.
 *
 * @param {number} dimension
 * @returns {number}
 */
export function gridStep(dimension) {
    return dimension % 2 === 1 ? 0.5 : 1;
}

/**
 * Returns half a grid dimension while preserving half-step placement for odd
 * widths and heights.
 *
 * @param {number} dimension
 * @returns {number}
 */
export function halfGrid(dimension) {
    return dimension % 2 === 1 ? dimension / 2 : Math.floor(dimension / 2);
}

/**
 * Snaps a pixel offset down to the nearest valid grid row/column position.
 *
 * @param {number} pixels
 * @param {number} dimension
 * @param {number} unit
 * @returns {number}
 */
export function snapGridFloor(
    pixels,
    dimension,
    unit = PAGE_COMPOSER_GRID_UNIT,
) {
    const step = gridStep(dimension);
    return Math.floor(pixels / (unit * step)) * step;
}

/**
 * Rounds a raw grid coordinate to the nearest valid placement increment.
 *
 * @param {number} raw
 * @param {number} dimension
 * @returns {number}
 */
export function snapGridRound(raw, dimension) {
    const step = gridStep(dimension);
    return Math.round(raw / step) * step;
}

/**
 * Registers a placement's occupied cells into an existing occupied-grid set.
 *
 * @param {Set<string>} cells
 * @param {{ row: number, col: number, w: number, h: number }} placement
 * @returns {Set<string>}
 */
export function registerOccupiedPlacement(cells, placement) {
    for (
        let rowIndex = placement.row * 2;
        rowIndex < (placement.row + placement.h) * 2;
        rowIndex++
    ) {
        for (
            let columnIndex = placement.col * 2;
            columnIndex < (placement.col + placement.w) * 2;
            columnIndex++
        ) {
            cells.add(`${columnIndex},${rowIndex}`);
        }
    }
    return cells;
}

/**
 * Builds the occupied cell set for current placements, excluding hidden items
 * and an optional active item being moved.
 *
 * @param {Array<{ id: string, row: number, col: number, w: number, h: number }>} placements
 * @param {string[]} hidden
 * @param {string} excludeId
 * @returns {Set<string>}
 */
export function buildOccupiedSet(placements, hidden, excludeId) {
    const cells = new Set();
    for (const placement of placements) {
        if (placement.id === excludeId) continue;
        if (hidden.includes(placement.id)) continue;
        registerOccupiedPlacement(cells, placement);
    }
    return cells;
}

/**
 * Checks whether a proposed placement overlaps an occupied cell.
 *
 * @param {Set<string>} cells
 * @param {number} column
 * @param {number} row
 * @param {number} width
 * @param {number} height
 * @returns {boolean}
 */
export function checkPlacement(cells, column, row, width, height) {
    for (let rowIndex = row * 2; rowIndex < (row + height) * 2; rowIndex++) {
        for (
            let columnIndex = column * 2;
            columnIndex < (column + width) * 2;
            columnIndex++
        ) {
            if (cells.has(`${columnIndex},${rowIndex}`)) return false;
        }
    }
    return true;
}
