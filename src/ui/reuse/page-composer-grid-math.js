export const PAGE_COMPOSER_GRID_UNIT = 90;

export function gridStep(dim) {
    return dim % 2 === 1 ? 0.5 : 1;
}

export function halfGrid(dim) {
    return dim % 2 === 1 ? dim / 2 : Math.floor(dim / 2);
}

export function snapGridFloor(px, dim, unit = PAGE_COMPOSER_GRID_UNIT) {
    const step = gridStep(dim);
    return Math.floor(px / (unit * step)) * step;
}

export function snapGridRound(raw, dim) {
    const step = gridStep(dim);
    return Math.round(raw / step) * step;
}

export function buildOccupiedSet(placements, hidden, excludeId) {
    const cells = new Set();
    for (const placement of placements) {
        if (placement.id === excludeId) continue;
        if (hidden.includes(placement.id)) continue;
        for (
            let r = placement.row * 2;
            r < (placement.row + placement.h) * 2;
            r++
        ) {
            for (
                let c = placement.col * 2;
                c < (placement.col + placement.w) * 2;
                c++
            ) {
                cells.add(`${c},${r}`);
            }
        }
    }
    return cells;
}

export function checkPlacement(cells, col, row, w, h) {
    for (let r = row * 2; r < (row + h) * 2; r++) {
        for (let c = col * 2; c < (col + w) * 2; c++) {
            if (cells.has(`${c},${r}`)) return false;
        }
    }
    return true;
}
