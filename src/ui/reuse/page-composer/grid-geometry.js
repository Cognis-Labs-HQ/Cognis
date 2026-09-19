/**
 * Creates pixel/grid conversion and sizing operations for a composer state.
 * Exports `createGridGeometry`, which returns geometry functions.
 * @example `const geometry = createGridGeometry(state, 72);`
 * @param {object} state Mutable page-composer state.
 * @param {number} unit Base row size in pixels.
 * @returns {object} Grid measurement and conversion functions.
 */
import { PAGE_COMPOSER_GRID_GAP, gridStep } from "./grid-math.js";

export function createGridGeometry(state, unit) {
    const getEditGridWidth = () => {
        const section = state.gridSection?.isConnected
            ? state.gridSection
            : null;
        if (!section) return state.gridCols * unit;
        const rect = section.getBoundingClientRect();
        const styles = window.getComputedStyle(section);
        const padding =
            Number.parseFloat(styles.paddingLeft || "0") +
            Number.parseFloat(styles.paddingRight || "0");
        return Math.max(1, rect.width - padding);
    };
    const columnSize = () => state.gridTrackSize ?? unit;
    const rowSize = () => unit;
    const gridColumnOffset = (coordinate) =>
        coordinate * (columnSize() + PAGE_COMPOSER_GRID_GAP);
    const gridRowOffset = (coordinate) =>
        coordinate * (rowSize() + PAGE_COMPOSER_GRID_GAP);
    const gridColumnSpanSize = (span) =>
        span * columnSize() + Math.max(0, span - 1) * PAGE_COMPOSER_GRID_GAP;
    const gridRowSpanSize = (span) =>
        span * rowSize() + Math.max(0, span - 1) * PAGE_COMPOSER_GRID_GAP;
    const pixelToGridColumn = (pixel) =>
        pixel / (columnSize() + PAGE_COMPOSER_GRID_GAP);
    const pixelToGridRow = (pixel) =>
        pixel / (rowSize() + PAGE_COMPOSER_GRID_GAP);
    const snapPixelColumnFloor = (pixel, dim) =>
        Math.floor(pixelToGridColumn(pixel) / gridStep(dim)) * gridStep(dim);
    const snapPixelRowFloor = (pixel, dim) =>
        Math.floor(pixelToGridRow(pixel) / gridStep(dim)) * gridStep(dim);
    function computeGridDimensions() {
        if (!state.contentGrid) return;
        state.contentGrid.style.width = "";
        const width = state.contentGrid.getBoundingClientRect().width;
        if (!state.editing)
            state.gridCols = Math.max(1, Math.floor(width / unit));
        if (state.editing) {
            const totalGap =
                Math.max(0, state.gridCols - 1) * PAGE_COMPOSER_GRID_GAP;
            state.gridTrackSize = Math.max(
                1,
                (getEditGridWidth() - totalGap) / state.gridCols,
            );
        } else state.gridTrackSize = unit;
        const visible = (state.layout?.placements ?? []).filter(
            (placement) => !(state.layout?.hidden ?? []).includes(placement.id),
        );
        const maxBottom = visible.reduce(
            (maximum, placement) =>
                Math.max(maximum, placement.row + placement.h),
            0,
        );
        const extra = state.editing ? 1 : 0;
        state.gridRows = Math.max(
            state.editing ? Math.max(3, maxBottom + 2) : 1,
            maxBottom + extra,
        );
        state.gridPixelHeight = gridRowSpanSize(state.gridRows);
        state.gridPixelWidth = gridColumnSpanSize(state.gridCols);
        state.contentGrid.style.minHeight =
            state.frameless && !state.editing
                ? ""
                : `${state.gridPixelHeight}px`;
        state.contentGrid.style.width = "";
        if (state.editing && state.gridSection) {
            state.gridSection.style.minHeight = `${state.gridPixelHeight}px`;
            state.gridSection.style.width = "";
        }
    }
    return {
        computeGridDimensions,
        gridColumnOffset,
        gridRowOffset,
        gridColumnSpanSize,
        gridRowSpanSize,
        pixelToGridColumn,
        pixelToGridRow,
        snapPixelColumnFloor,
        snapPixelRowFloor,
    };
}
