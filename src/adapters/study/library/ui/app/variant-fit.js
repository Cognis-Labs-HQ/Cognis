const VARIANT_DIRECTIONS = [
    "up",
    "down",
    "left",
    "right",
    "up-left",
    "up-right",
    "down-right",
    "down-left",
];

function cardBounds(slot) {
    const card = slot.querySelector(
        ":scope > .library-entry-card-shell > .library-entry-card",
    );
    return (card ?? slot).getBoundingClientRect();
}

function overflowScore(rect, boundary) {
    return (
        Math.max(0, boundary.left - rect.left) +
        Math.max(0, rect.right - boundary.right) +
        Math.max(0, boundary.top - rect.top) +
        Math.max(0, rect.bottom - boundary.bottom)
    );
}

function setVariantDirection(slot, direction) {
    for (const candidate of VARIANT_DIRECTIONS) {
        slot.classList.toggle(
            `library-entry-variant-${candidate}`,
            candidate === direction,
        );
    }
}

export function restorePreferredVariantDirections(rootShell) {
    rootShell
        .querySelectorAll("[data-library-preferred-direction]")
        .forEach((slot) =>
            setVariantDirection(slot, slot.dataset.libraryPreferredDirection),
        );
}

export function fitVariantBranchWithinGrid(rootShell) {
    window.requestAnimationFrame(() => {
        const grid = rootShell.closest(".library-entry-grid");
        if (!grid) return;
        const gridRect = grid.getBoundingClientRect();
        const boundary = {
            top: gridRect.top + 2,
            right: gridRect.right - 2,
            bottom: gridRect.bottom - 2,
            left: gridRect.left + 2,
        };
        const slots = Array.from(
            rootShell.querySelectorAll("[data-library-preferred-direction]"),
        ).filter((slot) => getComputedStyle(slot).display !== "none");
        for (const slot of slots) {
            const preferred = slot.dataset.libraryPreferredDirection;
            const candidates = [
                preferred,
                ...VARIANT_DIRECTIONS.filter(
                    (direction) => direction !== preferred,
                ),
            ];
            let best = {
                direction: preferred,
                score: Number.POSITIVE_INFINITY,
            };
            for (const direction of candidates) {
                setVariantDirection(slot, direction);
                const score = overflowScore(cardBounds(slot), boundary);
                if (score < best.score) best = { direction, score };
                if (score === 0) break;
            }
            setVariantDirection(slot, best.direction);
        }
    });
}
