import test from "node:test";
import assert from "node:assert/strict";
import { createGridGeometry } from "../../reuse/page-composer/grid-geometry.js";
import { createGridOverlayHandlers } from "../../reuse/page-composer/grid-overlay.js";
import { createNestedComposerHandlers } from "../../reuse/page-composer/sub-composer.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";

class GridElement extends EventTarget {
    constructor(width = 720) {
        super();
        this.width = width;
        this.style = {};
        this.dataset = {};
        this.children = [];
        this.isConnected = true;
        this.classList = {
            add() {},
            remove() {},
            toggle() {},
        };
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    remove() {
        if (!this.parentElement) return;
        this.parentElement.children = this.parentElement.children.filter(
            (child) => child !== this,
        );
    }

    replaceWith(replacement) {
        const index = this.parentElement.children.indexOf(this);
        replacement.parentElement = this.parentElement;
        this.parentElement.children[index] = replacement;
    }

    querySelector(selector) {
        return selector === ".composer-grid-overlay"
            ? this.children.find(
                  (child) => child.className === "composer-grid-overlay",
              )
            : null;
    }

    getBoundingClientRect() {
        return { left: 0, top: 0, width: this.width };
    }

    closest() {
        return null;
    }

    setAttribute() {}

    setPointerCapture() {}

    hasPointerCapture() {
        return true;
    }

    releasePointerCapture() {}
}

function dispatchPointer(element, type, coordinates = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, {
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        ...coordinates,
    });
    element.dispatchEvent(event);
}

for (const columns of [2, 3, 8]) {
    test(`full-width array declarations fill ${columns} columns in both composers`, () => {
        const element = {
            id: "form",
            gridSize: { default: [4, 3], min: [2, 2], max: ["full", "fill"] },
        };
        const normalized = resolveElementGridSize(element);
        assert.equal(normalized.fullWidth, true);
        assert.equal(normalized.fillHeight, true);
        assert.equal(normalized.max, null);
        for (const nested of [false, true]) {
            const state = {
                elements: [element],
                gridCols: columns,
                gridRows: 6,
                layout: { placements: [], hidden: [] },
            };
            if (nested) {
                createNestedComposerHandlers({
                    UNIT: 90,
                    getGridSize: resolveElementGridSize,
                }).initializeSubPlacements(state);
            } else {
                createGridOverlayHandlers({
                    state,
                    UNIT: 90,
                    getGridSize: resolveElementGridSize,
                }).initializePlacements();
            }
            assert.deepEqual(state.layout.placements, [
                { id: "form", col: 0, row: 0, w: columns, h: 6 },
            ]);
        }
    });
}

for (const columns of [2, 3, 8]) {
    for (const height of [2, 3]) {
        for (const completion of ["pointerup", "pointercancel"]) {
            test(`pointer drag grows all grid bounds before ${completion} at ${columns} columns and ${height} rows`, (context) => {
                const previousDocument = globalThis.document;
                const previousWindow = globalThis.window;
                globalThis.document = {
                    createElement: () => new GridElement(),
                    getElementById: () => null,
                };
                globalThis.window = {
                    getComputedStyle: () => ({}),
                    requestAnimationFrame: () => 1,
                    cancelAnimationFrame() {},
                };
                context.after(() => {
                    globalThis.document = previousDocument;
                    globalThis.window = previousWindow;
                });
                const placement = {
                    id: "card",
                    col: 0,
                    row: 0,
                    w: 2,
                    h: height,
                };
                const element = {
                    id: "card",
                    pinned: true,
                    gridSize: {
                        default: [2, height],
                        min: [2, height],
                        max: [2, height],
                    },
                };
                const state = {
                    editing: true,
                    elements: [element],
                    gridCols: columns,
                    gridSection: new GridElement(columns * 90 + 17),
                    contentGrid: new GridElement(columns * 90 + 17),
                    layout: { placements: [placement], hidden: [] },
                };
                let renders = 0;
                const handlers = createGridOverlayHandlers({
                    state,
                    UNIT: 90,
                    getGridSize: resolveElementGridSize,
                    i18n: { t: (key) => key },
                    renderGridComposer() {
                        renders++;
                        handlers.computeGridDimensions();
                    },
                });
                handlers.computeGridDimensions();
                const initialHeight = state.gridPixelHeight;
                state.gridSection.appendChild(handlers.createGridOverlay());
                const cell = handlers.createCell(element, placement, {
                    includeContent: false,
                });
                state.gridSection.appendChild(cell);
                const targetRow = height === 3 ? 8.5 : 8;
                const clientY = (targetRow + height / 2) * 98;
                dispatchPointer(cell, "pointerdown", {
                    clientY: (height / 2) * 98,
                });
                dispatchPointer(cell, "pointermove", { clientY });
                const overlay = state.gridSection.querySelector(
                    ".composer-grid-overlay",
                );
                const shade = state.gridSection.children.find(
                    (child) => child.className === "composer-shade",
                );
                assert.ok(state.gridPixelHeight > initialHeight);
                assert.equal(state.gridPixelHeight, state.gridRows * 98 - 8);
                assert.equal(
                    state.gridSection.style.minHeight,
                    `${state.gridPixelHeight}px`,
                );
                assert.equal(
                    state.contentGrid.style.minHeight,
                    `${state.gridPixelHeight}px`,
                );
                assert.equal(
                    overlay.style.height,
                    `${state.gridPixelHeight}px`,
                );
                for (const gridCell of overlay.children) {
                    assert.ok(
                        Number.parseFloat(gridCell.style.left) +
                            Number.parseFloat(gridCell.style.width) <=
                            state.gridPixelWidth + 0.001,
                    );
                    assert.ok(
                        Number.parseFloat(gridCell.style.top) +
                            Number.parseFloat(gridCell.style.height) <=
                            state.gridPixelHeight + 0.001,
                    );
                }
                const lastOverlayCell = overlay.children.at(-1);
                assert.ok(
                    Number.parseFloat(lastOverlayCell.style.top) >
                        initialHeight,
                );
                assert.ok(
                    Number.parseFloat(shade.style.top) +
                        Number.parseFloat(shade.style.height) <=
                        state.gridPixelHeight,
                );
                assert.equal(placement.row, 0);
                dispatchPointer(cell, completion, { clientY });
                assert.equal(placement.row, 0);
                assert.equal(
                    renders,
                    0,
                    "Dropping into the original free column snaps back without a redundant render",
                );
                assert.equal(state.gridPixelHeight, state.gridRows * 98 - 8);
                if (completion === "pointercancel") {
                    assert.equal(state.gridPixelHeight, initialHeight);
                    assert.equal(
                        state.gridSection.style.minHeight,
                        `${initialHeight}px`,
                    );
                    assert.equal(
                        state.contentGrid.style.minHeight,
                        `${initialHeight}px`,
                    );
                    assert.equal(
                        state.gridSection.querySelector(
                            ".composer-grid-overlay",
                        ).style.height,
                        `${initialHeight}px`,
                    );
                }
            });
        }
    }
}

test("half-grid spans share gaps and pointer origin with CSS tracks", (context) => {
    const previousWindow = globalThis.window;
    globalThis.window = {
        getComputedStyle: () => ({
            paddingLeft: "28px",
            paddingRight: "28px",
            paddingTop: "14px",
        }),
    };
    context.after(() => {
        globalThis.window = previousWindow;
    });
    const state = {
        contentGrid: new GridElement(720),
        gridSection: new GridElement(720),
        gridCols: 4,
        editing: true,
        layout: { placements: [], hidden: [] },
    };
    const geometry = createGridGeometry(state, 90);
    geometry.computeGridDimensions();
    assert.equal(geometry.gridRowSpanSize(0.5), 41);
    assert.equal(geometry.gridRowOffset(0.5), 49);
    assert.equal(geometry.gridColumnSpanSize(0.5), 76);
    assert.equal(geometry.gridColumnOffset(0.5), 84);
    assert.deepEqual(
        geometry.gridPointerPosition({ clientX: 112, clientY: 63 }),
        { x: 84, y: 49 },
    );
});

test("grid width is measured after height growth reserves scrollbar space", (context) => {
    const previousWindow = globalThis.window;
    globalThis.window = {
        getComputedStyle: () => ({}),
        requestAnimationFrame: () => 1,
        cancelAnimationFrame() {},
    };
    context.after(() => {
        globalThis.window = previousWindow;
    });
    const section = new GridElement(720);
    section.getBoundingClientRect = () => ({
        width: section.style.minHeight ? 705 : 720,
    });
    const state = {
        contentGrid: new GridElement(720),
        gridSection: section,
        gridCols: 4,
        editing: true,
        layout: { placements: [], hidden: [] },
    };
    const geometry = createGridGeometry(state, 90);
    geometry.computeGridDimensions();
    assert.equal(state.gridPixelWidth, 705);
    assert.equal(geometry.gridColumnSpanSize(4), 705);
});

test("nested grid growth applies its provisional height without a temporary shrink", () => {
    const heights = [];
    const container = new GridElement(270);
    container.style = {
        width: "",
        set minHeight(value) {
            heights.push(value);
        },
    };
    const state = {
        container,
        editing: true,
        layout: {
            placements: [{ id: "card", col: 0, row: 0, w: 3, h: 4 }],
            hidden: [],
        },
    };
    const { computeSubGridDimensions: computeNestedGridDimensions } =
        createNestedComposerHandlers({
            UNIT: 90,
        });
    computeNestedGridDimensions(state, { minimumRows: 20 });
    computeNestedGridDimensions(state, { minimumRows: 22 });
    assert.deepEqual(
        heights,
        ["1800px", "1980px"],
        "Each growth writes only the final minimum height",
    );
    assert.equal(state.gridRows, 22);
    computeNestedGridDimensions(state);
    assert.equal(
        heights.at(-1),
        "540px",
        "Normal bounds are restored when the gesture ends",
    );
});
