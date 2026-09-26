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

export function overlapArea(rect, occupiedRect) {
    const width = Math.max(
        0,
        Math.min(rect.right, occupiedRect.right) -
            Math.max(rect.left, occupiedRect.left),
    );
    const height = Math.max(
        0,
        Math.min(rect.bottom, occupiedRect.bottom) -
            Math.max(rect.top, occupiedRect.top),
    );
    return width * height;
}

function collisionScore(rect, occupiedRects) {
    return occupiedRects.reduce(
        (score, occupiedRect) => score + overlapArea(rect, occupiedRect),
        0,
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
        const rootCard = rootShell.querySelector(
            ":scope > .library-entry-card",
        );
        const occupiedRects = rootCard
            ? [rootCard.getBoundingClientRect()]
            : [];
        for (const slot of slots) {
            const preferred = slot.dataset.libraryPreferredDirection;
            const horizontalSide = preferred.includes("right")
                ? "right"
                : preferred.includes("left")
                  ? "left"
                  : null;
            const candidates = [
                preferred,
                ...VARIANT_DIRECTIONS.filter(
                    (direction) =>
                        direction !== preferred &&
                        (!horizontalSide || direction.includes(horizontalSide)),
                ),
            ];
            let best = {
                direction: preferred,
                overflow: Number.POSITIVE_INFINITY,
                collision: Number.POSITIVE_INFINITY,
            };
            for (const direction of candidates) {
                setVariantDirection(slot, direction);
                const rect = cardBounds(slot);
                const overflow = overflowScore(rect, boundary);
                const collision = collisionScore(rect, occupiedRects);
                if (direction === preferred && overflow === 0) {
                    best = { direction, overflow, collision };
                    break;
                }
                if (
                    overflow < best.overflow ||
                    (overflow === best.overflow && collision < best.collision)
                ) {
                    best = { direction, overflow, collision };
                }
                if (overflow === 0 && collision === 0) break;
            }
            setVariantDirection(slot, best.direction);
            occupiedRects.push(cardBounds(slot));
        }
    });
}
