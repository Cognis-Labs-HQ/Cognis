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
        const gridRect = grid.getBoundingClientRect();
        const reserved =
            Number.parseFloat(
                grid.style.getPropertyValue("--library-branch-space"),
            ) || 0;
        const naturalBottom = gridRect.bottom - reserved;
        const boundary = {
            top: Math.max(gridRect.top + 14, 14),
            right: Math.min(gridRect.right - 6, window.innerWidth - 6),
            bottom: Math.min(naturalBottom - 6, window.innerHeight - 6),
            left: Math.max(gridRect.left + 6, 6),
        };
        const slots = visibleVariantSlots(rootShell);
        // Background cards are dimmed, not part of the active branch's layout.
        const rootCard = rootShell.querySelector(
            ":scope > .library-entry-card",
        );
        const occupiedRects = [
            collisionBounds(rootCard.getBoundingClientRect()),
        ];
        for (const slot of slots) {
            if (slot.dataset.libraryFittedDirection) {
                occupiedRects.push(collisionBounds(cardBounds(slot)));
            }
        }
        for (const slot of slots) {
            if (slot.dataset.libraryFittedDirection) continue;
            const candidates = variantDirectionCandidates(
                slot.dataset.libraryPreferredDirection,
            );
            const ancestorRects = ancestorCardBounds(slot);
            let best = null;
            // Always start next to the parent, regardless of the static grid plan.
            // Additional rows are available when the active branch cannot fit.
            const maximumDistance = slots.length + ancestorRects.length + 1;
            for (let distance = 1; distance <= maximumDistance; distance += 1) {
                for (const direction of candidates) {
                    setVariantDirection(slot, direction);
                    setVariantDistance(slot, distance);
                    const rect = cardBounds(slot);
                    if (!isAncestorSafe(rect, ancestorRects)) continue;
                    if (collisionScore(rect, occupiedRects) > 0) continue;
                    // Never accept horizontal clipping or children above the grid.
                    if (
                        rect.left < boundary.left ||
                        rect.right > boundary.right ||
                        rect.top < boundary.top
                    )
                        continue;
                    const overflow = overflowScore(rect, boundary);
                    const candidate = {
                        direction,
                        distance,
                        overflow,
                        collision: 0,
                    };
                    if (isBetterVariantFit(candidate, best)) best = candidate;
                    if (overflow === 0) break;
                }
                if (best?.overflow === 0) break;
            }
            // The downward ray is always extendable, even in a one-column grid.
            if (!best) continue;
            setVariantDirection(slot, best.direction);
            setVariantDistance(slot, best.distance);
            slot.dataset.libraryFittedDirection = best.direction;
            slot.dataset.libraryFittedDistance = String(best.distance);
            occupiedRects.push(collisionBounds(cardBounds(slot)));
        }
        const bottom = Math.max(
            naturalBottom,
            ...occupiedRects.map((rect) => rect.bottom + 12),
        );
        grid.style.setProperty(
            "--library-branch-space",
            `${Math.max(0, bottom - naturalBottom)}px`,
        );
    });
    pendingFits.set(rootShell, frame);
}
