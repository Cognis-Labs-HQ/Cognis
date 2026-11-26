/**
 * Appends legal resize controls using geometry supplied by the owning composer.
 *
 * Public exports:
 *   appendResizeControls(options) — binds previews, collision checks and placement commits for one cell.
 *
 * Usage:
 *   appendResizeControls({ cell, placement, state, gridSize, container: grid,
 *     geometry: {
 *       point: (event) => ({ col: (event.clientX - grid.getBoundingClientRect().left) / track,
 *         row: (event.clientY - grid.getBoundingClientRect().top) / unit }),
 *       columnOffset: (col) => col * track, rowOffset: (row) => row * unit,
 *       columnSpan: (width) => width * track, rowSpan: (height) => height * unit,
 *     }, canPlace, refreshBounds, render: renderGrid });
 */
import { resolveResizeAvailability } from "./resize-availability.js";
import { RESIZE_EDGES, resizePlacement } from "./resize-model.js";
import { bindComposerPointerDrag } from "./pointer-drag.js";

/**
 * Geometry must match the owner's padding, gaps and tracks. Recreate controls on
 * render; the cell owns their listeners. Gestures clean up on capture loss or
 * detachment. Valid releases update placement geometry, but do not persist it.
 *
 * @param {object} options Owner-supplied grid state and geometry operations.
 * @param {HTMLElement} options.cell Connected editable cell receiving the handles.
 * @param {{id: string, col: number, row: number, w: number, h: number}} options.placement Cell's current placement.
 * @param {{gridCols: number, gridRows: number, layout: {placements: object[]}}} options.state Live mutable grid state.
 * @param {object} options.gridSize Normalized sizing from resolveElementGridSize.
 * @param {HTMLElement} options.container Preview parent in the same coordinate system as geometry.
 * @param {{point: function(PointerEvent): {col: number, row: number}, columnOffset: function(number): number, rowOffset: function(number): number, columnSpan: function(number): number, rowSpan: function(number): number}} options.geometry Pointer-to-grid and grid-to-pixel operations; read live scroll position.
 * @param {function(number, number, number, number, string): boolean} options.canPlace Tests col, row, w, h, ignoring the supplied ID.
 * @param {function(number=): void} options.refreshBounds Recomputes bounds, optionally growing to a minimum row count; no argument restores normal bounds.
 * @param {function(): void} options.render Rebuilds the owner after a valid resize.
 * @returns {void} Adds controls; placement is mutated only after a valid pointerup.
 */
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
