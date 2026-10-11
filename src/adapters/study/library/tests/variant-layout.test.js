import assert from "node:assert/strict";
import test from "node:test";
import {
    fitVariantBranchWithinGrid,
    restorePreferredVariantDirections,
} from "../ui/app/variant-fit.js";

function fixture({ width = 400, height = 200, rootX = 12, rootY = 12 } = {}) {
    const frames = new Map();
    let nextFrame = 0;
    const style = () => {
        const values = new Map();
        return {
            setProperty: (key, value) => values.set(key, value),
            getPropertyValue: (key) => values.get(key) ?? "",
            removeProperty: (key) => values.delete(key),
        };
    };
    const classes = (...initial) => {
        const values = new Set(initial);
        return {
            contains: (key) => values.has(key),
            toggle: (key, enabled) =>
                enabled ? values.add(key) : values.delete(key),
        };
    };
    const rect = (left, top) => ({
        left,
        top,
        right: left + 100,
        bottom: top + 70,
        width: 100,
        height: 70,
    });
    const grid = {
        classList: classes("library-entry-grid"),
        style: style(),
        getBoundingClientRect: () => ({
            left: 0,
            right: width,
            top: 0,
            bottom:
                height +
                (parseFloat(
                    grid.style.getPropertyValue("--library-branch-space"),
                ) || 0),
        }),
    };
    const slots = [];
    const root = {
        isConnected: true,
        classList: classes(
            "library-entry-card-shell",
            "library-entry-variants-open",
        ),
        parentElement: grid,
        closest: () => grid,
        querySelectorAll: () => slots,
        querySelector: () => ({
            getBoundingClientRect: () => rect(rootX, rootY),
        }),
    };
    const offsets = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
        "up-left": [-1, -1],
        "up-right": [1, -1],
        "down-left": [-1, 1],
        "down-right": [1, 1],
    };
    const add = (parent = root, preferred = "up", distance = 5) => {
        const slot = {
            parentElement: parent,
            classList: classes("library-entry-variant-shell"),
            style: style(),
            dataset: {
                libraryPreferredDirection: preferred,
                libraryPreferredDistance: String(distance),
            },
            visible: true,
            getClientRects: () => (slot.visible ? [{}] : []),
        };
        const card = {
            getBoundingClientRect: () => {
                const origin = parent
                    .querySelector(":scope > .library-entry-card")
                    .getBoundingClientRect();
                const direction =
                    Object.keys(offsets).find((key) =>
                        slot.classList.contains(`library-entry-variant-${key}`),
                    ) ?? preferred;
                const step =
                    parseFloat(
                        slot.style.getPropertyValue(
                            "--library-variant-card-span",
                        ),
                    ) / 100 || distance;
                const [x, y] = offsets[direction];
                return rect(
                    origin.left + x * step * 112,
                    origin.top + y * step * 82,
                );
            },
        };
        const shell = {
            parentElement: slot,
            classList: classes("library-entry-card-shell"),
            dataset: { libraryVariantDepth: String(parent === root ? 1 : 2) },
            querySelector: () => card,
        };
        slot.querySelector = (selector) =>
            selector.endsWith(" > .library-entry-card") ? card : shell;
        slots.push(slot);
        return { slot, shell, card };
    };
    globalThis.window = {
        innerWidth: width,
        innerHeight: height,
        requestAnimationFrame: (fn) => {
            frames.set(++nextFrame, fn);
            return nextFrame;
        },
        cancelAnimationFrame: (id) => frames.delete(id),
    };
    const flush = () => {
        for (const [id, fn] of frames) {
            frames.delete(id);
            fn();
        }
    };
    return { root, grid, add, flush, frames };
}

test("children stay adjacent to their parent instead of avoiding dimmed background cards", () => {
    const { root, add, flush } = fixture();
    const child = add();
    fitVariantBranchWithinGrid(root);
    flush();
    assert.equal(child.slot.dataset.libraryFittedDistance, "1");
    assert.ok(child.card.getBoundingClientRect().right < 400);
});

test("nested children reserve rows in a narrow grid without collisions or clipping", () => {
    const { root, grid, add, flush } = fixture({ width: 124, height: 100 });
    const child = add();
    const grandchild = add(child.shell);
    fitVariantBranchWithinGrid(root);
    flush();
    const first = child.card.getBoundingClientRect();
    const second = grandchild.card.getBoundingClientRect();
    assert.equal(first.left, 12);
    assert.equal(second.left, 12);
    assert.ok(second.top > first.bottom);
    assert.ok(grid.getBoundingClientRect().bottom >= second.bottom + 12);
    const reserved = grid.style.getPropertyValue("--library-branch-space");
    fitVariantBranchWithinGrid(root);
    flush();
    assert.equal(
        grid.style.getPropertyValue("--library-branch-space"),
        reserved,
    );
    restorePreferredVariantDirections(root);
    assert.equal(grid.style.getPropertyValue("--library-branch-space"), "");
});

test("opening a deeper branch preserves the fitted ancestor and separates its siblings", () => {
    const { root, add, flush } = fixture();
    const child = add();
    fitVariantBranchWithinGrid(root);
    flush();
    const original = child.card.getBoundingClientRect();
    const grandchildren = [add(child.shell), add(child.shell)];
    fitVariantBranchWithinGrid(root);
    flush();
    assert.deepEqual(child.card.getBoundingClientRect(), original);
    const [left, right] = grandchildren.map(({ card }) =>
        card.getBoundingClientRect(),
    );
    assert.ok(
        left.right <= right.left ||
            right.right <= left.left ||
            left.bottom <= right.top ||
            right.bottom <= left.top,
    );
});

test("layout requests coalesce and closing cancels pending work", () => {
    const { root, add, flush, frames } = fixture();
    const child = add();
    fitVariantBranchWithinGrid(root);
    fitVariantBranchWithinGrid(root);
    assert.equal(frames.size, 1);
    restorePreferredVariantDirections(root);
    flush();
    assert.equal(frames.size, 0);
    assert.equal(child.slot.dataset.libraryFittedDirection, undefined);
});
