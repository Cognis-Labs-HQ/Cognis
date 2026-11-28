/**
 * Adapts composer presentation and editor panels to available content space.
 *
 * Public exports:
 *   COMPOSER_COMPACT_BREAKPOINT — maximum compact content width in CSS pixels.
 *   COMPOSER_MEDIUM_BREAKPOINT — maximum medium content width in CSS pixels.
 *   COMPOSER_DRAWER_BREAKPOINT — content width boundary for the toolbar drawer.
 *   isCompactWidth(width) — tests a measured width against the compact boundary.
 *   isCompactComposer(container, stackAt) — measures the container at a stacking boundary.
 *   hasGridProfile(state) — tests for an explicit saved layout at the current column count.
 *   stackComposerPlacements(placements, columns) — returns independent full-width placements.
 *   fitComposerPanel(panel) — clamps a mounted editor panel within the viewport.
 *   resolveComposerResize(previous, next, editing) — distinguishes redraw from grid reflow.
 *
 * Usage:
 *   const visible = isCompactComposer(contentGrid)
 *     ? stackComposerPlacements(layout.placements, columns)
 *     : layout.placements;
 *   fitComposerPanel(elementsPanel);
 */

export const COMPOSER_COMPACT_BREAKPOINT = 640;
export const COMPOSER_MEDIUM_BREAKPOINT = 900;
export const COMPOSER_DRAWER_BREAKPOINT = COMPOSER_MEDIUM_BREAKPOINT;

/** @param {number} width Available inner width. @returns {boolean} */
export function isCompactWidth(width) {
    return (
        Number.isFinite(width) &&
        width > 0 &&
        width <= COMPOSER_COMPACT_BREAKPOINT
    );
}

/** @param {HTMLElement|null} container Available content. @param {"compact"|"medium"} stackAt Shared stacking boundary. @returns {boolean} */
export function isCompactComposer(container, stackAt = "compact") {
    const width = container?.getBoundingClientRect().width;
    return stackAt === "medium"
        ? Number.isFinite(width) &&
              width > 0 &&
              width <= COMPOSER_MEDIUM_BREAKPOINT
        : isCompactWidth(width);
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
    // Height constraints can add a scrollbar and change the intrinsic width.
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    if (Number.isFinite(viewportWidth)) {
        const desiredLeft = Number.parseFloat(panel.style.left) || 12;
        const width = panel.getBoundingClientRect().width;
        panel.style.left = `${Math.max(12, Math.min(desiredLeft, viewportWidth - width - 12))}px`;
    }
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

/**
 * @param {{gridColumns:number,layoutProfiles?:{layoutsByGrid?:object}}} state Main or nested Composer state.
 * @returns {boolean} Whether this exact grid has a user-authored profile.
 */
export function hasGridProfile(state) {
    return Object.hasOwn(
        state.layoutProfiles?.layoutsByGrid ?? {},
        `cols-${state.gridColumns}`,
    );
}
