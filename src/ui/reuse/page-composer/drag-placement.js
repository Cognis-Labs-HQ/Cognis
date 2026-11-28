/**
 * Resolves the destination shown by a legal Composer drag before it is committed.
 * Public export: snapDragPlacement(candidate, rows, canPlace) settles above the drop until another card or the grid origin blocks movement.
 * @example const target = snapDragPlacement(candidate, gridRows, canPlace);
 */
import { gridStep } from "./grid-math.js";

/**
 * Keeps blocked candidates available for swap detection and never changes size or column.
 * @param {{id:string|null,col:number,row:number,w:number,h:number}} candidate Pointer-selected placement.
 * @param {number} rows Grid row count determining the snapping increment.
 * @param {function(number,number,number,number,string|null):boolean} canPlace Live collision and bounds check.
 * @returns {object} The settled placement, or the original candidate when blocked or already settled.
 */
export function snapDragPlacement(candidate, rows, canPlace) {
    const fits = (row) =>
        canPlace(candidate.col, row, candidate.w, candidate.h, candidate.id);
    if (!fits(candidate.row)) return candidate;
    let row = candidate.row;
    const step = gridStep(rows);
    while (row > 0) {
        const previous = Math.max(0, row - step);
        if (!fits(previous)) break;
        row = previous;
    }
    return row === candidate.row ? candidate : { ...candidate, row };
}
