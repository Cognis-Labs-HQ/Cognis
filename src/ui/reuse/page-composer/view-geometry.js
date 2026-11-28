/**
 * Renders saved logical grid sizes without distributing spare space among cards.
 * Public exports: applyGridMetrics sets fractional tracks; applyGridPlacement positions a card on those tracks.
 * @example const scale = applyGridMetrics(section, placements, columns, unit); applyGridPlacement(card, placement, scale);
 */
import { PAGE_COMPOSER_GRID_GAP } from "./grid-math.js";

/**
 * @param {HTMLElement} section Grid receiving the cards.
 * @param {object[]} placements Logical card rectangles.
 * @param {number} columns Available logical columns.
 * @param {number} unit Logical row height in pixels.
 * @param {number} [gap] Pixel spacing between tracks; nested editors use zero.
 * @returns {number} Track scale supporting half-grid placements.
 */
export function applyGridMetrics(
    section,
    placements,
    columns,
    unit,
    gap = PAGE_COMPOSER_GRID_GAP,
) {
    const scale = placements.some((placement) =>
        [placement.col, placement.row, placement.w, placement.h].some(
            (value) => value % 1 !== 0,
        ),
    )
        ? 2
        : 1;
    section.classList.add("composer-view-grid");
    section.style.setProperty("--grid-cols", String(columns * scale));
    section.style.setProperty("--composer-grid-gap", `${gap}px`);
    section.style.setProperty(
        "--composer-grid-row-size",
        `${(unit + gap) / scale - gap}px`,
    );
    return scale;
}

/**
 * @param {HTMLElement} card Rendered card.
 * @param {{col:number,row:number,w:number,h:number}} placement Logical saved geometry.
 * @param {number} scale Scale returned by applyGridMetrics.
 * @returns {void} Sets explicit grid tracks, retaining unused space.
 */
export function applyGridPlacement(card, placement, scale) {
    card.style.gridColumn = `${Math.round(placement.col * scale) + 1} / span ${Math.round(placement.w * scale)}`;
    card.style.gridRow = `${Math.round(placement.row * scale) + 1} / span ${Math.round(placement.h * scale)}`;
}
