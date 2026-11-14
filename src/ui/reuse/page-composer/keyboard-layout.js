/**
 * Provides keyboard movement and resizing for composer editing cells.
 * Exports bindLayoutKeyboard to attach one cell's interaction lifecycle.
 * @example bindLayoutKeyboard({ cell, placement, state, gridSize, canPlace, render, i18n });
 */
import { gridStep } from "./grid-math.js";
import { resolveGridWidthBounds } from "./grid-sizing.js";

/** @param {object} options Cell, placement, grid state and layout callbacks. @returns {void} */
export function bindLayoutKeyboard({
    cell,
    placement,
    state,
    gridSize,
    canPlace,
    findSwapCandidate,
    render,
    i18n,
}) {
    cell.tabIndex = 0;
    cell.setAttribute("role", "group");
    cell.setAttribute("aria-description", i18n.t("ui.reuse.layout_keyboard"));
    cell.addEventListener("keydown", (event) => {
        if (
            event.target !== cell ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
        )
            return;
        const direction = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
        }[event.key];
        if (!direction) return;
        event.preventDefault();
        const next = { ...placement };
        const horizontal = direction[0] * gridStep(state.gridCols);
        const vertical = direction[1] * gridStep(state.gridRows);
        if (event.shiftKey) {
            const bounds = resolveGridWidthBounds(
                gridSize,
                state.gridCols - next.col,
            );
            if (
                horizontal &&
                !gridSize.fullWidth &&
                !gridSize.fillWidth &&
                !gridSize.halfWidth
            ) {
                next.w = Math.max(
                    bounds.min,
                    Math.min(bounds.max, next.w + horizontal),
                );
            }
            const maximumHeight = gridSize.max?.[1] ?? Number.POSITIVE_INFINITY;
            next.h = Math.max(
                gridSize.min[1],
                Math.min(maximumHeight, next.h + vertical),
            );
        } else {
            next.col = Math.max(
                0,
                Math.min(state.gridCols - next.w, next.col + horizontal),
            );
            next.row = Math.max(0, next.row + vertical);
        }
        if (
            next.col === placement.col &&
            next.row === placement.row &&
            next.w === placement.w &&
            next.h === placement.h
        )
            return;
        if (!canPlace(next.col, next.row, next.w, next.h, next.id)) {
            if (event.shiftKey) return;
            const candidate = findSwapCandidate(
                next.col,
                next.row,
                next.w,
                next.h,
                next.id,
            );
            if (!candidate) return;
            next.col = candidate.col;
            next.row = candidate.row;
            candidate.col = placement.col;
            candidate.row = placement.row;
        }
        Object.assign(placement, next);
        render();
        const container = state.gridSection ?? state.container;
        container
            .querySelector(
                `.composer-cell[data-composer-element="${CSS.escape(placement.id)}"]`,
            )
            ?.focus({ preventScroll: true });
    });
}
