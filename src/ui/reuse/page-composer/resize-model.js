/**
 * Calculates snapped resize geometry without mutating the original placement.
 *
 * Public exports:
 *   RESIZE_EDGES — eight named edges/corners with CSS classes and axis signs.
 *   resizePlacement(options) — bounds a pointer delta while retaining opposite edges.
 *
 * Usage:
 *   const next = resizePlacement({
 *     placement: { id: "card", col: 2, row: 2, w: 4, h: 4 },
 *     edge: RESIZE_EDGES.find((edge) => edge.name === "west"),
 *     delta: { col: -1, row: 0 }, columns: 12, rows: 10,
 *     gridSize: { min: [2, 2], max: [8, 8], fullWidth: false },
 *   });
 *   // next has col: 1 and w: 5; its right edge remains at column 6.
 */
import { snapGridRound } from "./grid-math.js";
import { resolveGridWidthBounds } from "./grid-sizing.js";

export const RESIZE_EDGES = [
    {
        name: "east",
        direction: "e",
        className: "composer-resize-e",
        horizontal: 1,
        vertical: 0,
    },
    {
        name: "south",
        direction: "s",
        className: "composer-resize-s",
        horizontal: 0,
        vertical: 1,
    },
    {
        name: "southeast",
        direction: "se",
        className: "composer-resize-se",
        horizontal: 1,
        vertical: 1,
    },
    {
        name: "west",
        direction: "w",
        className: "composer-resize-w",
        horizontal: -1,
        vertical: 0,
    },
    {
        name: "north",
        direction: "n",
        className: "composer-resize-n",
        horizontal: 0,
        vertical: -1,
    },
    {
        name: "northwest",
        direction: "nw",
        className: "composer-resize-nw",
        horizontal: -1,
        vertical: -1,
    },
    {
        name: "northeast",
        direction: "ne",
        className: "composer-resize-ne",
        horizontal: 1,
        vertical: -1,
    },
    {
        name: "southwest",
        direction: "sw",
        className: "composer-resize-sw",
        horizontal: -1,
        vertical: 1,
    },
];

/**
 * Applies size/origin bounds only; callers must separately reject occupied tiles.
 * Full-width declarations lock horizontal sizing. Southward growth is not row-capped.
 *
 * @param {object} options Resize inputs in logical grid units, not pixels.
 * @param {{id: string, col: number, row: number, w: number, h: number}} options.placement Original placement.
 * @param {{horizontal: number, vertical: number}} options.edge Descriptor from RESIZE_EDGES; signs are -1, 0 or 1.
 * @param {{col: number, row: number}} options.delta Pointer displacement from the initial press.
 * @param {{min: number[], max?: number[]|null, fullWidth?: boolean}} options.gridSize Normalized sizing from resolveElementGridSize.
 * @param {number} options.columns Initial positive grid column count; controls horizontal snapping and bounds.
 * @param {number} options.rows Initial positive grid row count; controls vertical snapping, not maximum height.
 * @returns {{id: string, col: number, row: number, w: number, h: number}} A new candidate preserving the placement's other fields.
 */
export function resizePlacement({
    placement,
    edge,
    delta,
    gridSize,
    columns,
    rows,
}) {
    const next = { ...placement };
    const clamp = (value, minimum, maximum) =>
        Math.max(minimum, Math.min(maximum, value));
    if (edge.horizontal && !gridSize.fullWidth) {
        const right = placement.col + placement.w;
        const available = edge.horizontal < 0 ? right : columns - placement.col;
        const bounds = resolveGridWidthBounds(gridSize, available);
        next.w = clamp(
            placement.w + edge.horizontal * snapGridRound(delta.col, columns),
            bounds.min,
            bounds.max,
        );
        if (edge.horizontal < 0) next.col = right - next.w;
    }
    if (edge.vertical) {
        const bottom = placement.row + placement.h;
        const maximum = Math.min(
            gridSize.max?.[1] ?? Infinity,
            edge.vertical < 0 ? bottom : Infinity,
        );
        next.h = clamp(
            placement.h + edge.vertical * snapGridRound(delta.row, rows),
            gridSize.min[1],
            maximum,
        );
        if (edge.vertical < 0) next.row = bottom - next.h;
    }
    return next;
}
