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
const DIRECTION_ALTERNATIVES = {
    up: [
        "up-left",
        "up-right",
        "left",
        "right",
        "down-left",
        "down-right",
        "down",
    ],
    down: [
        "down-left",
        "down-right",
        "left",
        "right",
        "up-left",
        "up-right",
        "up",
    ],
    left: [
        "up-left",
        "down-left",
        "up",
        "down",
        "up-right",
        "down-right",
        "right",
    ],
    right: [
        "up-right",
        "down-right",
        "up",
        "down",
        "up-left",
        "down-left",
        "left",
    ],
    "up-left": [
        "up",
        "left",
        "up-right",
        "down-left",
        "right",
        "down",
        "down-right",
    ],
    "up-right": [
        "up",
        "right",
        "up-left",
        "down-right",
        "left",
        "down",
        "down-left",
    ],
    "down-right": [
        "down",
        "right",
        "down-left",
        "up-right",
        "left",
        "up",
        "up-left",
    ],
    "down-left": [
        "down",
        "left",
        "down-right",
        "up-left",
        "right",
        "up",
        "up-right",
    ],
};

export function variantDirectionCandidates(preferred) {
    return [
        preferred,
        ...(DIRECTION_ALTERNATIVES[preferred] ?? VARIANT_DIRECTIONS),
    ].filter(
        (direction, index, directions) =>
            direction && directions.indexOf(direction) === index,
    );
}

function cardBounds(slot) {
    const card = slot.querySelector(
        ":scope > .library-entry-card-shell > .library-entry-card",
    );
    return (card ?? slot).getBoundingClientRect();
}

function parentCardBounds(slot) {
    const card = slot.parentElement?.querySelector(
        ":scope > .library-entry-card",
    );
    return card ? collisionBounds(card.getBoundingClientRect()) : null;
}

function overflowScore(rect, boundary) {
    return (
        Math.max(0, boundary.left - rect.left) +
        Math.max(0, rect.right - boundary.right) +
        Math.max(0, boundary.top - rect.top) +
        Math.max(0, rect.bottom - boundary.bottom)
    );
}

function collisionBounds(rect) {
    const clearance = 2;
    return {
        top: rect.top - clearance,
        right: rect.right + clearance,
        bottom: rect.bottom + clearance,
        left: rect.left - clearance,
    };
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

export function isParentSafe(rect, parentRect) {
    return !parentRect || overlapArea(collisionBounds(rect), parentRect) === 0;
}

function collisionScore(rect, occupiedRects) {
    const candidateBounds = collisionBounds(rect);
    return occupiedRects.reduce(
        (score, occupiedRect) =>
            score + overlapArea(candidateBounds, occupiedRect),
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

function visibleVariantSlots(rootShell) {
    return Array.from(
        rootShell.querySelectorAll("[data-library-preferred-direction]"),
    )
        .filter((slot) => slot.getClientRects().length > 0)
        .sort((left, right) => {
            const leftDepth = Number(
                left.querySelector(":scope > .library-entry-card-shell")
                    ?.dataset.libraryVariantDepth ?? 0,
            );
            const rightDepth = Number(
                right.querySelector(":scope > .library-entry-card-shell")
                    ?.dataset.libraryVariantDepth ?? 0,
            );
            return leftDepth - rightDepth;
        });
}

export function restorePreferredVariantDirections(rootShell) {
    rootShell
        .querySelectorAll("[data-library-preferred-direction]")
        .forEach((slot) => {
            setVariantDirection(slot, slot.dataset.libraryPreferredDirection);
            delete slot.dataset.libraryFittedDirection;
            if (slot.dataset.libraryParentCollisionHidden) {
                slot.hidden = false;
                delete slot.dataset.libraryParentCollisionHidden;
            }
        });
}

export function fitVariantBranchWithinGrid(rootShell) {
    window.requestAnimationFrame(() => {
        const grid = rootShell.closest(".library-entry-grid");
        if (!grid) return;
        rootShell
            .querySelectorAll("[data-library-parent-collision-hidden]")
            .forEach((slot) => {
                slot.hidden = false;
                delete slot.dataset.libraryParentCollisionHidden;
            });
        const gridRect = grid.getBoundingClientRect();
        const boundary = {
            top: gridRect.top + 2,
            right: gridRect.right - 2,
            bottom: gridRect.bottom - 2,
            left: gridRect.left + 2,
        };
        const slots = visibleVariantSlots(rootShell);
        const occupiedRects = Array.from(
            grid.querySelectorAll(
                ":scope > .library-entry-card-shell > .library-entry-card",
            ),
            (card) => collisionBounds(card.getBoundingClientRect()),
        );
        for (const slot of slots) {
            if (slot.dataset.libraryFittedDirection) {
                occupiedRects.push(collisionBounds(cardBounds(slot)));
            }
        }
        for (const slot of slots) {
            if (slot.dataset.libraryFittedDirection) continue;
            const preferred = slot.dataset.libraryPreferredDirection;
            const candidates = variantDirectionCandidates(preferred);
            const parentRect = parentCardBounds(slot);
            let best = null;
            for (const direction of candidates) {
                setVariantDirection(slot, direction);
                const rect = cardBounds(slot);
                if (!isParentSafe(rect, parentRect)) continue;
                const overflow = overflowScore(rect, boundary);
                const collision = collisionScore(rect, occupiedRects);
                if (
                    direction === preferred &&
                    overflow === 0 &&
                    collision === 0
                ) {
                    best = { direction, overflow, collision };
                    break;
                }
                if (
                    !best ||
                    overflow < best.overflow ||
                    (overflow === best.overflow && collision < best.collision)
                ) {
                    best = { direction, overflow, collision };
                }
                if (overflow === 0 && collision === 0) break;
            }
            if (!best) {
                slot.hidden = true;
                slot.dataset.libraryParentCollisionHidden = "true";
                continue;
            }
            setVariantDirection(slot, best.direction);
            slot.dataset.libraryFittedDirection = best.direction;
            occupiedRects.push(collisionBounds(cardBounds(slot)));
        }
    });
}
