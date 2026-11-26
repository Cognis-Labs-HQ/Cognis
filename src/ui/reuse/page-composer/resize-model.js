/** Shared eight-edge resize geometry; opposite edges remain fixed. */
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

/** @param {object} options Original placement, edge, pointer delta, grid dimensions and sizing. @returns {object} Candidate placement within size and origin limits. */
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
