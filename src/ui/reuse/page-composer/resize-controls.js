/** Shared resize interaction for main and nested composers, using owner-supplied pixel geometry. */
import { resolveResizeAvailability } from "./resize-availability.js";
import { RESIZE_EDGES, resizePlacement } from "./resize-model.js";
import { bindComposerPointerDrag } from "./pointer-drag.js";

/** @param {object} options Cell, placement, grid state, geometry, collision and render operations. @returns {void} */
export function appendResizeControls({
    cell,
    placement,
    state,
    gridSize,
    container,
    geometry,
    canPlace,
    refreshBounds,
    render,
}) {
    const availability = resolveResizeAvailability({
        placement,
        gridSize,
        columns: state.gridCols,
        rows: state.gridRows,
        canPlace,
    });
    for (const edge of RESIZE_EDGES) {
        const resizeCursor = availability[edge.name];
        if (!resizeCursor) continue;
        const handle = container.ownerDocument.createElement("div");
        handle.className = `composer-resize-handle ${edge.className}`;
        handle.style.cursor = resizeCursor;
        cell.appendChild(handle);
        handle.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 || event.isPrimary === false) return;
            event.preventDefault();
            event.stopPropagation();
            const start = geometry.point(event);
            const dimensions = {
                columns: state.gridCols,
                rows: state.gridRows,
            };
            let candidate = { ...placement };
            const shade = container.ownerDocument.createElement("div");
            shade.className = "composer-shade";
            container.appendChild(shade);
            const paint = () => {
                shade.style.left = `${geometry.columnOffset(candidate.col)}px`;
                shade.style.top = `${geometry.rowOffset(candidate.row)}px`;
                shade.style.width = `${geometry.columnSpan(candidate.w)}px`;
                shade.style.height = `${geometry.rowSpan(candidate.h)}px`;
            };
            const valid = () =>
                canPlace(
                    candidate.col,
                    candidate.row,
                    candidate.w,
                    candidate.h,
                    placement.id,
                );
            paint();
            cell.classList.add("composer-cell--resizing");
            bindComposerPointerDrag(
                handle,
                event,
                (next) => {
                    const point = geometry.point(next);
                    candidate = resizePlacement({
                        placement,
                        edge,
                        gridSize,
                        ...dimensions,
                        delta: {
                            col: point.col - start.col,
                            row: point.row - start.row,
                        },
                    });
                    if (candidate.row + candidate.h > state.gridRows)
                        refreshBounds(candidate.row + candidate.h + 1);
                    paint();
                    const available = valid();
                    shade.classList.toggle(
                        "composer-shade--invalid",
                        !available,
                    );
                    handle.style.cursor = available
                        ? resizeCursor
                        : "not-allowed";
                },
                (completion) => {
                    shade.remove();
                    cell.classList.remove("composer-cell--resizing");
                    handle.style.cursor = resizeCursor;
                    refreshBounds();
                    if (
                        completion.type === "pointercancel" ||
                        !container.isConnected
                    )
                        return;
                    const changed = ["col", "row", "w", "h"].some(
                        (key) => candidate[key] !== placement[key],
                    );
                    if (!changed || !valid()) return;
                    const target = state.layout.placements.find(
                        (entry) => entry.id === placement.id,
                    );
                    if (target) {
                        for (const key of ["col", "row", "w", "h"])
                            target[key] = candidate[key];
                    }
                    render();
                },
            );
        });
    }
}
