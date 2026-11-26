/** Resolves legal resize directions and their cursors from bounds and occupied tiles. */
import { gridStep } from "./grid-math.js";
import { RESIZE_EDGES, resizePlacement } from "./resize-model.js";

const cursor = (horizontal, vertical) =>
    `${vertical < 0 ? "n" : vertical > 0 ? "s" : ""}${horizontal < 0 ? "w" : horizontal > 0 ? "e" : ""}-resize`;

/** @param {object} options Placement, sizing declaration, grid dimensions and collision checker. @returns {object} Cursor for each usable edge and corner. */
export function resolveResizeAvailability(options) {
    const { placement, columns, rows, canPlace } = options;
    return Object.fromEntries(
        RESIZE_EDGES.map((edge) => {
            const fits = (horizontal, vertical) => {
                const next = resizePlacement({
                    ...options,
                    edge,
                    delta: {
                        col: horizontal * gridStep(columns),
                        row: vertical * gridStep(rows),
                    },
                });
                return (
                    (!edge.horizontal || next.w !== placement.w) &&
                    (!edge.vertical || next.h !== placement.h) &&
                    canPlace(next.col, next.row, next.w, next.h, placement.id)
                );
            };
            const outward = fits(edge.horizontal, edge.vertical);
            const inward = fits(-edge.horizontal, -edge.vertical);
            let available = null;
            if (outward && inward)
                available =
                    edge.horizontal && edge.vertical
                        ? edge.horizontal === edge.vertical
                            ? "nwse-resize"
                            : "nesw-resize"
                        : edge.horizontal
                          ? "ew-resize"
                          : "ns-resize";
            else if (outward)
                available = cursor(edge.horizontal, edge.vertical);
            else if (inward)
                available = cursor(-edge.horizontal, -edge.vertical);
            else if (edge.horizontal && edge.vertical) {
                if (fits(edge.horizontal, -edge.vertical))
                    available = cursor(edge.horizontal, -edge.vertical);
                else if (fits(-edge.horizontal, edge.vertical))
                    available = cursor(-edge.horizontal, edge.vertical);
            }
            return [edge.name, available];
        }),
    );
}
