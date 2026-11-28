/**
 * Resolves and commits collision-safe exchanges between composer placements.
 *
 * Public exports:
 *   previewGridSwap(state, col, row, w, h, sourceId) — describes a hovered exchange and its validity for feedback.
 *   findGridSwap(state, col, row, w, h, sourceId) — finds the sole hovered tile when both exchanged destinations fit.
 *   applyGridSwap(state, sourceId, targetId) — revalidates current geometry and commits both positions atomically.
 *
 * Usage:
 *   const target = findGridSwap(state, 4, 0, 4, 2, "source");
 *   if (target && applyGridSwap(state, "source", target.id)) renderGrid();
 */
function overlaps(left, right) {
    return (
        left.col < right.col + right.w &&
        left.col + left.w > right.col &&
        left.row < right.row + right.h &&
        left.row + left.h > right.row
    );
}

function fitsGrid({ col: column, row, w: width, h: height }, columns) {
    return (
        [column, row, width, height].every(Number.isFinite) &&
        width > 0 &&
        height > 0 &&
        column >= 0 &&
        row >= 0 &&
        column + width <= columns
    );
}

function resolveSwap(state, sourceId, targetId) {
    if (sourceId === targetId) return null;
    const { placements } = state.layout;
    const hidden = new Set(state.layout.hidden);
    const source = placements.find((entry) => entry.id === sourceId);
    const target = placements.find((entry) => entry.id === targetId);
    if (!source || !target || hidden.has(sourceId) || hidden.has(targetId))
        return null;
    const nextSource = { ...source, col: target.col, row: target.row };
    const nextTarget = { ...target, col: source.col, row: source.row };
    // Horizontal exchanges preserve the pair's outside edges and intervening gap.
    if (source.col + source.w <= target.col) {
        nextSource.col = target.col + target.w - source.w;
    } else if (target.col + target.w <= source.col) {
        nextTarget.col = source.col + source.w - target.w;
    }
    if (
        !fitsGrid(nextSource, state.gridColumns) ||
        !fitsGrid(nextTarget, state.gridColumns) ||
        overlaps(nextSource, nextTarget)
    )
        return null;
    // Scan rectangles, not every half-grid cell: cost depends on tile count, not area.
    for (const placement of placements) {
        if (
            placement.id === sourceId ||
            placement.id === targetId ||
            hidden.has(placement.id)
        )
            continue;
        if (overlaps(placement, nextSource) || overlaps(placement, nextTarget))
            return null;
    }
    return { source, target, nextSource, nextTarget };
}

/**
 * Preview lookup never mutates placements. Horizontal exchanges retain outer edges,
 * sizes and gaps; both resulting rectangles must clear every other visible tile.
 * Vertically stacked exchanges retain their destination origins.
 * @param {{gridColumns:number, layout:{placements:object[],hidden:string[]}}} state Current editor geometry.
 * @param {number} column Proposed pointer-aligned column.
 * @param {number} row Proposed pointer-aligned row.
 * @param {number} width Dragged width in grid units.
 * @param {number} height Dragged height in grid units.
 * @param {string} sourceId Dragged element identity.
 * @returns {{target:object,valid:boolean}|null} Hovered target and validity, or null outside any tile.
 */
export function previewGridSwap(state, column, row, width, height, sourceId) {
    if (!fitsGrid({ col: column, row, w: width, h: height }, state.gridColumns))
        return null;
    const hidden = new Set(state.layout.hidden);
    const proposed = { col: column, row, w: width, h: height };
    let target = null;
    let ambiguous = false;
    for (const placement of state.layout.placements) {
        if (
            placement.id === sourceId ||
            hidden.has(placement.id) ||
            !overlaps(proposed, placement)
        )
            continue;
        if (target) ambiguous = true;
        else target = placement;
    }
    return target
        ? {
              target,
              valid:
                  !ambiguous &&
                  Boolean(resolveSwap(state, sourceId, target.id)),
          }
        : null;
}

/**
 * Supplies keyboard movement with an admissible target, excluding blocked previews.
 * @param {object} state Current editor geometry.
 * @param {number} column Proposed column.
 * @param {number} row Proposed row.
 * @param {number} width Dragged width.
 * @param {number} height Dragged height.
 * @param {string} sourceId Dragged element identity.
 * @returns {object|null} Legal hovered target, or null.
 */
export function findGridSwap(state, column, row, width, height, sourceId) {
    const preview = previewGridSwap(
        state,
        column,
        row,
        width,
        height,
        sourceId,
    );
    return preview?.valid ? preview.target : null;
}

/**
 * Recomputes both destinations against live bounds and occupancy before mutation;
 * a changed or missing target cannot commit a stale preview.
 * @param {{gridColumns:number, layout:{placements:object[],hidden:string[]}}} state Mutable editor state.
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
