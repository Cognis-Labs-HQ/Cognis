export const PAGE_COMPOSER_GRID_UNIT = 90;

/**
 * Returns the draggable snap increment for an element dimension.
 *
 * @param {number} dim
 * @returns {number}
 */
export function gridStep(dim) {
    return dim % 2 === 1 ? 0.5 : 1;
}

/**
 * Returns half a grid dimension while preserving half-step placement for odd
 * widths and heights.
 *
 * @param {number} dim
 * @returns {number}
 */
export function halfGrid(dim) {
    return dim % 2 === 1 ? dim / 2 : Math.floor(dim / 2);
}

/**
 * Snaps a pixel offset down to the nearest valid grid row/column position.
 *
 * @param {number} px
 * @param {number} dim
 * @param {number} unit
 * @returns {number}
 */
export function snapGridFloor(px, dim, unit = PAGE_COMPOSER_GRID_UNIT) {
    const step = gridStep(dim);
    return Math.floor(px / (unit * step)) * step;
}

/**
 * Rounds a raw grid coordinate to the nearest valid placement increment.
 *
 * @param {number} raw
 * @param {number} dim
 * @returns {number}
 */
export function snapGridRound(raw, dim) {
    const step = gridStep(dim);
    return Math.round(raw / step) * step;
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
        for (
            let r = placement.row * 2;
            r < (placement.row + placement.h) * 2;
            r++
        ) {
            for (
                let c = placement.col * 2;
                c < (placement.col + placement.w) * 2;
                c++
            ) {
                cells.add(`${c},${r}`);
            }
        }
    }
    return cells;
}

/**
 * Checks whether a proposed placement overlaps an occupied cell.
 *
 * @param {Set<string>} cells
 * @param {number} col
 * @param {number} row
 * @param {number} w
 * @param {number} h
 * @returns {boolean}
 */
export function checkPlacement(cells, col, row, w, h) {
    for (let r = row * 2; r < (row + h) * 2; r++) {
        for (let c = col * 2; c < (col + w) * 2; c++) {
            if (cells.has(`${c},${r}`)) return false;
        }
    }
    return true;
}
