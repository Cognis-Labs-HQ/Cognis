import { VARIANT_DIRECTIONS } from "./variant-directions.js";

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

function ancestorCardBounds(slot) {
    const bounds = [];
    let shell = slot.parentElement;
    while (shell?.classList.contains("library-entry-card-shell")) {
        const card = shell.querySelector(":scope > .library-entry-card");
        if (card) bounds.push(collisionBounds(card.getBoundingClientRect()));
        const parentSlot = shell.parentElement;
        shell = parentSlot?.classList.contains("library-entry-variant-shell")
            ? parentSlot.parentElement
            : null;
    }
    return bounds;
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

export function isAncestorSafe(rect, ancestorRects) {
    const bounds = collisionBounds(rect);
    return ancestorRects.every(
        (ancestorRect) => overlapArea(bounds, ancestorRect) === 0,
    );
}

function collisionScore(rect, occupiedRects) {
    const candidateBounds = collisionBounds(rect);
    return occupiedRects.reduce(
        (score, occupiedRect) =>
            score + overlapArea(candidateBounds, occupiedRect),
        0,
    );
}

export function isBetterVariantFit(candidate, current) {
    return (
        !current ||
        candidate.overflow < current.overflow ||
        (candidate.overflow === current.overflow &&
            candidate.collision < current.collision)
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

function setVariantDistance(slot, distance) {
    slot.style.setProperty("--library-variant-card-span", `${distance * 100}%`);
    slot.style.setProperty(
        "--library-variant-gap-span",
        `${distance * 0.75}rem`,
    );
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
            setVariantDistance(
                slot,
                Number(slot.dataset.libraryPreferredDistance ?? 1),
            );
            delete slot.dataset.libraryFittedDirection;
            delete slot.dataset.libraryFittedDistance;
        });
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
            const ancestorRects = ancestorCardBounds(slot);
            const preferredDistance = Number(
                slot.dataset.libraryPreferredDistance ?? 1,
            );
            const maximumDistance =
                slots.length + ancestorRects.length + preferredDistance + 1;
            let best = null;
            for (
                let distance = preferredDistance;
                distance <= maximumDistance;
                distance += 1
            ) {
                for (const direction of candidates) {
                    setVariantDirection(slot, direction);
                    setVariantDistance(slot, distance);
                    const rect = cardBounds(slot);
                    if (!isAncestorSafe(rect, ancestorRects)) continue;
                    const overflow = overflowScore(rect, boundary);
                    const collision = collisionScore(rect, occupiedRects);
                    const candidate = {
                        direction,
                        distance,
                        overflow,
                        collision,
                    };
                    if (isBetterVariantFit(candidate, best)) {
                        best = candidate;
                    }
                    if (collision === 0 && overflow === 0) break;
                }
                if (best?.collision === 0 && best.overflow === 0) break;
            }
            setVariantDirection(slot, best.direction);
            setVariantDistance(slot, best.distance);
            slot.dataset.libraryFittedDirection = best.direction;
            slot.dataset.libraryFittedDistance = String(best.distance);
            occupiedRects.push(collisionBounds(cardBounds(slot)));
        }
    });
}
