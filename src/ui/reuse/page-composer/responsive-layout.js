/**
 * Adapts composer presentation to its available content width.
 * Exports isCompactComposer for container sizing and stackComposerPlacements
 * for a full-width presentation without changing saved layouts.
 * fitComposerPanel keeps floating editor actions inside the viewport.
 * resolveComposerResize distinguishes pixel redraws from logical grid changes.
 * @example const visible = stackComposerPlacements(placements, columns);
 */

/** @param {HTMLElement|null} container @returns {boolean} */
export function isCompactComposer(container) {
    const width = container?.getBoundingClientRect().width;
    return Number.isFinite(width) && width > 0 && width <= 640;
}

/**
 * @param {Array<object>} placements Visible placements in reading order.
 * @param {number} columns Available grid columns.
 * @returns {Array<object>} Independent full-width placements.
 */
export function stackComposerPlacements(placements, columns) {
    let nextRow = 0;
    return placements.map((placement) => {
        const nextPlacement = {
            ...placement,
            col: 0,
            row: nextRow,
            w: columns,
        };
        nextRow += placement.h;
        return nextPlacement;
    });
}

/**
 * Keeps a floating editor panel and its actions inside the current viewport.
 * @param {HTMLElement} panel Mounted editor panel.
 * @returns {void}
 */
export function fitComposerPanel(panel) {
    const window = panel.ownerDocument.defaultView;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const desiredTop = Number.parseFloat(panel.style.top) || 12;
    const height = Math.min(
        panel.getBoundingClientRect().height,
        viewportHeight - 24,
    );
    const top = Math.max(
        12,
        Math.min(desiredTop, viewportHeight - height - 12),
    );
    panel.style.top = `${top}px`;
    panel.style.setProperty("--composer-panel-top", `${top}px`);
}

/**
 * @param {{columns: number, compact: boolean, width: number}} previous Last rendered size.
 * @param {{columns: number, compact: boolean, width: number}} next Current container size.
 * @param {boolean} editing Whether a layout has unsaved edits.
 * @returns {{render: boolean, reflow: boolean}} Required responsive work.
 */
export function resolveComposerResize(previous, next, editing) {
    const columnsChanged = previous.columns !== next.columns;
    return {
        render:
            columnsChanged ||
            previous.compact !== next.compact ||
            (editing && Math.abs(previous.width - next.width) > 0.5),
        reflow: editing && columnsChanged,
    };
}
