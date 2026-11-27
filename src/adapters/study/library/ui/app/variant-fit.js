import { VARIANT_DIRECTIONS } from "./variant-directions.js";

const pendingFits = new WeakMap();

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

function overflowScore(rectangle, boundary) {
    return (
        Math.max(0, boundary.left - rectangle.left) +
        Math.max(0, rectangle.right - boundary.right) +
        Math.max(0, boundary.top - rectangle.top) +
        Math.max(0, rectangle.bottom - boundary.bottom)
    );
}

function collisionBounds(rectangle) {
    const clearance = 2;
    return {
        top: rectangle.top - clearance,
        right: rectangle.right + clearance,
        bottom: rectangle.bottom + clearance,
        left: rectangle.left - clearance,
    };
}

export function overlapArea(rectangle, occupiedRectangle) {
    const width = Math.max(
        0,
        Math.min(rectangle.right, occupiedRectangle.right) -
            Math.max(rectangle.left, occupiedRectangle.left),
    );
    const height = Math.max(
        0,
        Math.min(rectangle.bottom, occupiedRectangle.bottom) -
            Math.max(rectangle.top, occupiedRectangle.top),
    );
    return width * height;
}

export function isAncestorSafe(rectangle, ancestorRectangles) {
    const bounds = collisionBounds(rectangle);
    return ancestorRectangles.every(
        (ancestorRectangle) => overlapArea(bounds, ancestorRectangle) === 0,
    );
}

export function hasReachableVariantPath(parent, child, obstacles) {
    const start = {
        x: (parent.left + parent.right) / 2,
        y: (parent.top + parent.bottom) / 2,
    };
    const end = {
        x: (child.left + child.right) / 2,
        y: (child.top + child.bottom) / 2,
    };
    return obstacles
        .filter((rectangle) => overlapArea(rectangle, parent) === 0)
        .every((rectangle) => {
            let enter = 0;
            let leave = 1;
            for (const [axis, lower, upper] of [
                ["x", "left", "right"],
                ["y", "top", "bottom"],
            ]) {
                const delta = end[axis] - start[axis];
                if (delta === 0) {
                    if (
                        start[axis] < rectangle[lower] ||
                        start[axis] > rectangle[upper]
                    )
                        return true;
                } else {
                    const first = (rectangle[lower] - start[axis]) / delta;
                    const second = (rectangle[upper] - start[axis]) / delta;
                    enter = Math.max(enter, Math.min(first, second));
                    leave = Math.min(leave, Math.max(first, second));
                }
            }
            return enter > leave;
        });
}

function collisionScore(rectangle, occupiedRectangles) {
    const candidateBounds = collisionBounds(rectangle);
    return occupiedRectangles.reduce(
        (score, occupiedRectangle) =>
            score + overlapArea(candidateBounds, occupiedRectangle),
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
    const pending = pendingFits.get(rootShell);
    if (pending !== undefined) window.cancelAnimationFrame(pending);
    pendingFits.delete(rootShell);
    rootShell
        .closest(".library-entry-grid")
        ?.style.removeProperty("--library-branch-space");
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
    if (pendingFits.has(rootShell)) return;
    const frame = window.requestAnimationFrame(() => {
        pendingFits.delete(rootShell);
        if (
            !rootShell.isConnected ||
            !rootShell.classList.contains("library-entry-variants-open")
        )
            return;
        const grid = rootShell.closest(".library-entry-grid");
        if (!grid) return;
        const gridRectangle = grid.getBoundingClientRect();
        const reserved =
            Number.parseFloat(
                grid.style.getPropertyValue("--library-branch-space"),
            ) || 0;
        const naturalBottom = gridRectangle.bottom - reserved;
        const boundary = {
            top: Math.max(gridRectangle.top + 14, 14),
            right: Math.min(gridRectangle.right - 6, window.innerWidth - 6),
            bottom: Math.min(naturalBottom - 6, window.innerHeight - 6),
            left: Math.max(gridRectangle.left + 6, 6),
        };
        const slots = visibleVariantSlots(rootShell);
        // Background cards are dimmed, not part of the active branch's layout.
        const rootCard = rootShell.querySelector(
            ":scope > .library-entry-card",
        );
        const occupiedRectangles = [
            collisionBounds(rootCard.getBoundingClientRect()),
        ];
        for (const slot of slots) {
            if (slot.dataset.libraryFittedDirection) {
                occupiedRectangles.push(collisionBounds(cardBounds(slot)));
            }
        }
        for (const slot of slots) {
            if (slot.dataset.libraryFittedDirection) continue;
            const candidates = variantDirectionCandidates(
                slot.dataset.libraryPreferredDirection,
            );
            const ancestorRectangles = ancestorCardBounds(slot);
            const parentRectangle = slot.parentElement
                .querySelector(":scope > .library-entry-card")
                .getBoundingClientRect();
            let best = null;
            // Always start next to the parent, regardless of the static grid plan.
            // Additional rows are available when the active branch cannot fit.
            const maximumDistance =
                slots.length + ancestorRectangles.length + 1;
            for (let distance = 1; distance <= maximumDistance; distance += 1) {
                for (const direction of candidates) {
                    setVariantDirection(slot, direction);
                    setVariantDistance(slot, distance);
                    const rectangle = cardBounds(slot);
                    if (!isAncestorSafe(rectangle, ancestorRectangles))
                        continue;
                    if (collisionScore(rectangle, occupiedRectangles) > 0)
                        continue;
                    if (
                        !hasReachableVariantPath(
                            parentRectangle,
                            rectangle,
                            occupiedRectangles,
                        )
                    )
                        continue;
                    // Never accept horizontal clipping or children above the grid.
                    if (
                        rectangle.left < boundary.left ||
                        rectangle.right > boundary.right ||
                        rectangle.top < boundary.top
                    )
                        continue;
                    const overflow = overflowScore(rectangle, boundary);
                    const candidate = {
                        direction,
                        distance,
                        overflow,
                        collision: 0,
                    };
                    if (isBetterVariantFit(candidate, best)) best = candidate;
                    if (overflow === 0) break;
                }
                if (best) break;
            }
            // The downward ray is always extendable, even in a one-column grid.
            if (!best) continue;
            setVariantDirection(slot, best.direction);
            setVariantDistance(slot, best.distance);
            slot.dataset.libraryFittedDirection = best.direction;
            slot.dataset.libraryFittedDistance = String(best.distance);
            occupiedRectangles.push(collisionBounds(cardBounds(slot)));
        }
        const bottom = Math.max(
            naturalBottom,
            ...occupiedRectangles.map((rectangle) => rectangle.bottom + 12),
        );
        grid.style.setProperty(
            "--library-branch-space",
            `${Math.max(0, bottom - naturalBottom)}px`,
        );
    });
    pendingFits.set(rootShell, frame);
}
