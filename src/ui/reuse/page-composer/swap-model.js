/**
 * Resolves and commits collision-safe exchanges between composer placements.
 *
 * Public exports:
 *   findGridSwap(state, col, row, w, h, sourceId) — finds the sole hovered tile when both exchanged destinations fit.
 *   applyGridSwap(state, sourceId, targetId) — revalidates current geometry and commits both positions atomically.
 *
 * Usage:
 *   const target = findGridSwap(state, 4, 0, 4, 2, "source");
 *   if (target && applyGridSwap(state, "source", target.id)) renderGrid();
 */
import {
    buildOccupiedSet,
    checkPlacement,
    registerOccupiedPlacement,
} from "./grid-math.js";

function fitsGrid({ col, row, w, h }, columns) {
    return (
        [col, row, w, h].every(Number.isFinite) &&
        w > 0 &&
        h > 0 &&
        col >= 0 &&
        row >= 0 &&
        col + w <= columns
    );
}

function resolveSwap(state, sourceId, targetId) {
    if (sourceId === targetId) return null;
    const { placements, hidden } = state.layout;
    const source = placements.find((entry) => entry.id === sourceId);
    const target = placements.find((entry) => entry.id === targetId);
    if (
        !source ||
        !target ||
        hidden.includes(sourceId) ||
        hidden.includes(targetId)
    )
        return null;
    const nextSource = { ...source, col: target.col, row: target.row };
    const nextTarget = { ...target, col: source.col, row: source.row };
    const occupied = buildOccupiedSet(
        placements.filter(
            (entry) => entry.id !== sourceId && entry.id !== targetId,
        ),
        hidden,
        null,
    );
    for (const placement of [nextSource, nextTarget]) {
        if (
            !fitsGrid(placement, state.gridCols) ||
            !checkPlacement(
                occupied,
                placement.col,
                placement.row,
                placement.w,
                placement.h,
            )
        )
            return null;
        registerOccupiedPlacement(occupied, placement);
    }
    return { source, target, nextSource, nextTarget };
}

/**
 * Preview lookup does not mutate placements. The snapped target origin is checked
 * independently of the pointer's hovered rectangle, including all other visible tiles.
 * @param {{gridCols:number, layout:{placements:object[],hidden:string[]}}} state Current editor geometry.
 * @param {number} col Proposed pointer-aligned column.
 * @param {number} row Proposed pointer-aligned row.
 * @param {number} w Dragged width in grid units.
 * @param {number} h Dragged height in grid units.
 * @param {string} sourceId Dragged element identity.
 * @returns {object|null} Current target placement when both destinations fit, otherwise null.
 */
export function findGridSwap(state, col, row, w, h, sourceId) {
    if (!fitsGrid({ col, row, w, h }, state.gridCols)) return null;
    const displaced = state.layout.placements.filter(
        (entry) =>
            entry.id !== sourceId &&
            !state.layout.hidden.includes(entry.id) &&
            col < entry.col + entry.w &&
            col + w > entry.col &&
            row < entry.row + entry.h &&
            row + h > entry.row,
    );
    if (displaced.length !== 1) return null;
    return resolveSwap(state, sourceId, displaced[0].id)?.target ?? null;
}

/**
 * Recomputes both destinations against live bounds and occupancy before mutation;
 * a changed or missing target cannot commit a stale preview.
 * @param {{gridCols:number, layout:{placements:object[],hidden:string[]}}} state Mutable editor state.
 * @param {string} sourceId Dragged element identity.
 * @param {string} targetId Previewed target identity.
 * @returns {boolean} True only when both positions were committed; false leaves state unchanged.
 */
export function applyGridSwap(state, sourceId, targetId) {
    const swap = resolveSwap(state, sourceId, targetId);
    if (!swap) return false;
    swap.source.col = swap.nextSource.col;
    swap.source.row = swap.nextSource.row;
    swap.target.col = swap.nextTarget.col;
    swap.target.row = swap.nextTarget.row;
    return true;
}
