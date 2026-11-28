/**
 * Resolves resize handles and cursors from size limits and occupied grid cells.
 *
 * Public exports:
 *   resolveResizeAvailability(options) — returns a legal-direction cursor or null for each edge/corner.
 *
 * Usage:
 *   const handles = resolveResizeAvailability({ placement, gridSize,
 *     columns: state.gridColumns, rows: state.gridRows, canPlace });
 *   if (handles.west) westHandle.style.cursor = handles.west;
 */
import { gridStep } from "./grid-math.js";
import { RESIZE_EDGES, resizePlacement } from "./resize-model.js";

const cursor = (horizontal, vertical) =>
    `${vertical < 0 ? "n" : vertical > 0 ? "s" : ""}${horizontal < 0 ? "w" : horizontal > 0 ? "e" : ""}-resize`;

/**
 * Probes one snapped inward/outward step, including mixed corner directions.
 * A blocked expansion retains a shrink handle; no legal change yields null.
 *
 * @param {object} options Grid inputs shared with resizePlacement, plus collision checking.
 * @param {{id: string, col: number, row: number, w: number, h: number}} options.placement Current placement.
 * @param {object} options.gridSize Normalized sizing from resolveElementGridSize.
 * @param {number} options.columns Positive grid column count.
 * @param {number} options.rows Positive grid row count used for snapping.
 * @param {function(number, number, number, number, string): boolean} options.canPlace Tests col, row, w, h, ignoring the supplied element ID.
 * @returns {Object<string, string|null>} Keys east/south/southeast/west/north/northwest/northeast/southwest; CSS cursor or null.
 */
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
