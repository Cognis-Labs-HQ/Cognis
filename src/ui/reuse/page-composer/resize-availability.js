/** Resolves legal resize directions and their cursors from bounds and occupied tiles. */
import { gridStep } from "./grid-math.js";
import { resolveGridWidthBounds } from "./grid-sizing.js";

/** @param {object} options Placement, sizing declaration, grid dimensions and collision checker. @returns {{east: string|null, south: string|null, southeast: string|null}} Cursor for each usable handle. */
export function resolveResizeAvailability({
    placement,
    gridSize,
    columns,
    rows,
    canPlace,
}) {
    const bounds = resolveGridWidthBounds(gridSize, columns - placement.col);
    const columnStep = gridStep(columns);
    const rowStep = gridStep(rows);
    const fits = (width, height) =>
        width >= bounds.min &&
        width <= bounds.max &&
        height >= gridSize.min[1] &&
        height <= (gridSize.max?.[1] ?? Infinity) &&
        (!gridSize.fullWidth || width === placement.w) &&
        canPlace(placement.col, placement.row, width, height, placement.id);
    const shrinkWidth =
        !gridSize.fullWidth && fits(placement.w - columnStep, placement.h);
    const growWidth =
        !gridSize.fullWidth && fits(placement.w + columnStep, placement.h);
    const shrinkHeight = fits(placement.w, placement.h - rowStep);
    const growHeight = fits(placement.w, placement.h + rowStep);
    const diagonal = (horizontal, vertical) =>
        !gridSize.fullWidth &&
        fits(
            placement.w + horizontal * columnStep,
            placement.h + vertical * rowStep,
        );
    const northwest = diagonal(-1, -1);
    const southeast = diagonal(1, 1);
    const northeast = diagonal(1, -1);
    const southwest = diagonal(-1, 1);
    return {
        east:
            shrinkWidth && growWidth
                ? "ew-resize"
                : growWidth
                  ? "e-resize"
                  : shrinkWidth
                    ? "w-resize"
                    : null,
        south:
            shrinkHeight && growHeight
                ? "ns-resize"
                : growHeight
                  ? "s-resize"
                  : shrinkHeight
                    ? "n-resize"
                    : null,
        southeast:
            northwest && southeast
                ? "nwse-resize"
                : southeast
                  ? "se-resize"
                  : northwest
                    ? "nw-resize"
                    : northeast && southwest
                      ? "nesw-resize"
                      : northeast
                        ? "ne-resize"
                        : southwest
                          ? "sw-resize"
                          : null,
    };
}
