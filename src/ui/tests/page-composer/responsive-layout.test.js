import test from "node:test";
import assert from "node:assert/strict";
import {
    resolveElementGridSize,
    resolveInitialGridWidth,
    resolveGridWidthBounds,
} from "../../reuse/page-composer/grid-sizing.js";
import { createGridOverlayHandlers } from "../../reuse/page-composer/grid-overlay.js";
import { createSubComposerHandlers } from "../../reuse/page-composer/sub-composer.js";
import { createComposerRenderer } from "../../reuse/page-composer/composer-render.js";
import {
    fitComposerPanel,
    isCompactComposer,
    resolveComposerResize,
    stackComposerPlacements,
} from "../../reuse/page-composer/responsive-layout.js";

const containerAt = (width) => ({
    style: {},
    getBoundingClientRect: () => ({ width }),
});
const dimensions = { default: [5, 3], min: [5, 2] };

for (const maximum of ["half", "fill", "full", ["half", 8], [8, 8]]) {
    test(`initial ${JSON.stringify(maximum)} element fits a phone grid`, () => {
        const element = {
            id: "content",
            gridSize: { ...dimensions, max: maximum },
        };
        const sizing = resolveElementGridSize(element);
        assert.equal(resolveInitialGridWidth(sizing, 2), 2);
        assert.deepEqual(resolveGridWidthBounds(sizing, 2), { min: 2, max: 2 });
        for (const nested of [false, true]) {
            const state = {
                elements: [element],
                gridCols: 2,
                gridRows: 6,
                layout: { placements: [], hidden: [] },
            };
            if (nested) {
                createSubComposerHandlers({
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
                { id: "content", col: 0, row: 0, w: 2, h: 3 },
            ]);
        }
    });
}

test("desktop bounds and mixed height limits retain declared width behavior", () => {
    const sizing = resolveElementGridSize({
        gridSize: { ...dimensions, max: ["half", 6] },
    });
    assert.equal(resolveInitialGridWidth(sizing, 12), 6);
    assert.deepEqual(resolveGridWidthBounds(sizing, 7), { min: 5, max: 7 });
});

test("compact presentation follows actual container width, including tablet panes", () => {
    assert.equal(isCompactComposer(containerAt(390)), true);
    assert.equal(isCompactComposer(containerAt(640)), true);
    assert.equal(isCompactComposer(containerAt(641)), false);
    assert.equal(isCompactComposer(containerAt(0)), false);
    assert.equal(isCompactComposer(null), false);
});

test("compact stacking preserves reading order, heights, and saved desktop placements", () => {
    const original = [
        { id: "first", col: 3, row: 1, w: 2, h: 2 },
        { id: "second", col: 0, row: 5, w: 6, h: 4 },
    ];
    const snapshot = structuredClone(original);
    assert.deepEqual(stackComposerPlacements(original, 3), [
        { id: "first", col: 0, row: 0, w: 3, h: 2 },
        { id: "second", col: 0, row: 2, w: 3, h: 4 },
    ]);
    assert.deepEqual(original, snapshot);
});

test("nested responsive presentation filters hidden cards and restores wide layout", () => {
    const placements = [
        { id: "first", col: 0, row: 0, w: 4, h: 2 },
        { id: "second", col: 4, row: 0, w: 4, h: 2 },
        { id: "hidden", col: 0, row: 2, w: 8, h: 2 },
    ];
    const state = {
        elements: placements.map((placement) => ({ id: placement.id })),
        layout: { placements, hidden: ["hidden"] },
        gridCols: 3,
        container: containerAt(320),
    };
    const renderer = createComposerRenderer({
        state,
        getGridSize: resolveElementGridSize,
    });
    assert.deepEqual(
        renderer
            .computeSubViewPlacements(state)
            .map(({ id, col, row, w }) => ({ id, col, row, w })),
        [
            { id: "first", col: 0, row: 0, w: 3 },
            { id: "second", col: 0, row: 2, w: 3 },
        ],
    );
    state.container = containerAt(800);
    state.gridCols = 8;
    assert.deepEqual(
        renderer.computeSubViewPlacements(state),
        placements.slice(0, 2),
    );
    assert.equal(placements[1].col, 4);
});

test("nested editor uses every available pixel rather than truncating its width", () => {
    const state = {
        container: containerAt(347),
        editing: true,
        layout: { placements: [], hidden: [] },
    };
    createSubComposerHandlers({ UNIT: 90 }).computeSubGridDimensions(state);
    assert.equal(state.gridCols, 3);
    assert.equal(state.gridTrackSize * state.gridCols, 347);
    assert.equal(state.container.style.width, "");
});

for (const nested of [false, true]) {
    test(`${nested ? "nested" : "main"} Add reveals a default-hidden widget without dragging`, () => {
        const state = {
            elements: [{ id: "optional", defaultHidden: true }],
            gridCols: 3,
            gridRows: 6,
            layout: { placements: [], hidden: [] },
        };
        const initialize = nested
            ? (options) =>
                  createSubComposerHandlers({
                      UNIT: 90,
                      getGridSize: resolveElementGridSize,
                  }).initializeSubPlacements(state, options)
            : createGridOverlayHandlers({
                  state,
                  UNIT: 90,
                  getGridSize: resolveElementGridSize,
              }).initializePlacements;
        initialize();
        assert.deepEqual(state.layout.hidden, ["optional"]);
        state.layout.hidden = [];
        initialize({ reveal: ["optional"] });
        initialize();
        assert.deepEqual(state.layout.hidden, []);
        assert.equal(state.layout.placements.length, 1);
        assert.equal(state.layout.placements[0].id, "optional");
        assert.equal(state.layout.placements[0].w, 3);
    });
}

test("floating editor actions stay inside a short landscape viewport", () => {
    const properties = new Map();
    const panel = {
        ownerDocument: { defaultView: { innerHeight: 320 } },
        style: {
            top: "180px",
            setProperty: (key, value) => properties.set(key, value),
        },
        getBoundingClientRect: () => ({ height: 280 }),
    };
    fitComposerPanel(panel);
    assert.equal(panel.style.top, "28px");
    assert.equal(properties.get("--composer-panel-top"), "28px");
    panel.ownerDocument.defaultView.visualViewport = { height: 240 };
    fitComposerPanel(panel);
    assert.equal(panel.style.top, "12px");
});

test("nested geometry remeasures same-column pixel widths in edit mode", () => {
    const state = {
        container: containerAt(347),
        editing: true,
        layout: { placements: [], hidden: [] },
    };
    const handlers = createSubComposerHandlers({ UNIT: 90 });
    handlers.computeSubGridDimensions(state);
    assert.equal(state.gridCols, 3);
    state.container = containerAt(300);
    handlers.computeSubGridDimensions(state);
    assert.equal(state.gridCols, 3);
    assert.equal(state.gridTrackSize * state.gridCols, 300);
});

test("same-column editing resizes redraw pixel geometry without reflowing unsaved placements", () => {
    const previous = { columns: 3, compact: true, width: 347 };
    assert.deepEqual(
        resolveComposerResize(previous, { ...previous, width: 300 }, true),
        { render: true, reflow: false },
    );
    assert.deepEqual(
        resolveComposerResize(previous, { ...previous, width: 300 }, false),
        { render: false, reflow: false },
    );
    assert.deepEqual(
        resolveComposerResize(
            previous,
            { columns: 2, compact: true, width: 260 },
            true,
        ),
        { render: true, reflow: true },
    );
});
