import test from "node:test";
import { createEditorPanelHandlers } from "../../reuse/page-composer/editor-panel.js";
import { installEditorDocument } from "./fixtures/editor.js";
import assert from "node:assert/strict";
import { mountDashboard, loadDashboard } from "./fixtures/mount.js";
import { createGridOverlayHandlers } from "../../reuse/page-composer/grid-overlay.js";
import { createPlacementResolver } from "../../reuse/page-composer/placement-resolver.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";
import { createLayoutPersistence } from "../../reuse/page-composer/layout-persistence.js";

const courseSummary = {
    id: "course-summary",
    gridSize: { default: [5, 2], min: [3, 2] },
    render: () => '<a href="/my-classes">Courses</a>',
};

function layoutFor(elements, columns, layout = { placements: [], hidden: [] }) {
    const state = {
        elements,
        layout,
        gridCols: columns,
        gridRows: 6,
        contentGrid: { getBoundingClientRect: () => ({ width: columns * 90 }) },
    };
    const grid = createGridOverlayHandlers({
        state,
        UNIT: 90,
        getGridSize: resolveElementGridSize,
    });
    const renderer = createPlacementResolver({
        state,
        getGridSize: resolveElementGridSize,
    });
    grid.initializePlacements();
    return { state, grid, renderer };
}

function assertBounded(placements, columns) {
    for (const placement of placements) {
        assert.ok(placement.col >= 0 && placement.col + placement.w <= columns);
        for (const other of placements) {
            if (other === placement) continue;
            assert.ok(
                placement.col + placement.w <= other.col ||
                    other.col + other.w <= placement.col ||
                    placement.row + placement.h <= other.row ||
                    other.row + other.h <= placement.row,
                `${placement.id} and ${other.id} must not overlap`,
            );
        }
    }
}

test("dashboard declares a compact summary, optional analogue clock and larger event list", async () => {
    const page = await mountDashboard();
    assert.equal(page.preferenceKey, "dashboard-layout");
    assert.equal(page.allowCustomization, true);
    assert.equal(page.composers[0].initialized, true);
    for (const id of [
        "welcome",
        "account-info",
        "last-login",
        "digital-clock",
    ]) {
        assert.deepEqual(
            Array.from(
                page.elements.find((element) => element.id === id).gridSize
                    .default,
            ),
            [4, 2],
        );
    }
    const calendar = page.elements.find(
        (element) => element.id === "calendar-upcoming",
    );
    assert.deepEqual(Array.from(calendar.gridSize.default), [5, 3]);
    const { state } = layoutFor(page.elements, 12);
    assert.deepEqual(state.layout.hidden, ["analogue-clock"]);
    assert.ok(state.layout.placements.some(({ id }) => id === "digital-clock"));
    const analogue = page.elements.find(
        (element) => element.id === "analogue-clock",
    );
    assert.ok(analogue.label);
    analogue.onRender();
    page.elements.find((element) => element.id === "digital-clock").onRender();
    assert.deepEqual(
        page.clocks.map(({ renderClock }) => renderClock()),
        ["analogue", "digital"],
    );
});

for (const columns of [8, 10, 12, 16]) {
    test(`default dashboard fits ${columns} desktop columns with optional contributions`, async () => {
        const page = await mountDashboard({ extensions: [courseSummary] });
        const { renderer, state } = layoutFor(page.elements, columns);
        const view = renderer.computeViewPlacements();
        assertBounded(view, columns);
        assert.equal(view.length, 7);
        assert.deepEqual(state.layout.hidden, ["analogue-clock"]);
        if (columns === 10 || columns === 12) {
            const events = view.find(({ id }) => id === "calendar-upcoming");
            const classes = view.find(({ id }) => id === courseSummary.id);
            assert.equal(events.row, classes.row);
            assert.equal(events.w, columns / 2);
            assert.equal(classes.w, columns / 2);
            assert.equal(classes.h, 2);
            assert.equal(events.h, 3);
            for (const row of new Set(view.map((placement) => placement.row))) {
                assert.equal(
                    view
                        .filter((placement) => placement.row === row)
                        .reduce((sum, placement) => sum + placement.w, 0),
                    columns,
                );
            }
        }
    });
}

test("existing saved sizes, hidden choices and manually placed analogue clock remain unchanged", async () => {
    const page = await mountDashboard();
    const { state } = layoutFor(page.elements, 12);
    state.layout.hidden = ["welcome"];
    state.layout.placements.push({
        id: "analogue-clock",
        col: 0,
        row: 12,
        w: 5,
        h: 2,
    });
    Object.assign(
        state.layout.placements.find(({ id }) => id === "account-info"),
        { w: 6, h: 4, row: 15 },
    );
    const snapshot = structuredClone(state.layout);
    const profiles = { layoutsByGrid: { "cols-12": snapshot } };
    const persistence = createLayoutPersistence({
        apiFetch: () => assert.fail("rendering must not save preferences"),
    });
    const loaded = persistence.getLayoutForGrid(profiles, 12);
    const remount = layoutFor(
        page.elements,
        12,
        structuredClone(loaded.layout),
    );
    remount.grid.initializePlacements();
    assert.deepEqual(remount.state.layout, snapshot);
    assert.deepEqual(profiles.layoutsByGrid["cols-12"], snapshot);
});

test("the available-elements Add control reveals the analogue clock and saves its placement", async (context) => {
    const page = await mountDashboard();
    const { state, grid } = layoutFor(page.elements, 12);
    const controls = installEditorDocument(context);
    const previousWindow = globalThis.window;
    globalThis.window = { innerWidth: 1200 };
    context.after(() => {
        globalThis.window = previousWindow;
    });
    state.root = { querySelector: () => null };
    state.panelPosition = null;
    state.contentGrid.getBoundingClientRect = () => ({
        width: 1080,
        top: 20,
        right: 1100,
    });
    let renders = 0;
    let saved;
    const panel = createEditorPanelHandlers({
        state,
        i18n: page.i18n,
        bindPanelItemDrag() {},
        initializePlacements: grid.initializePlacements,
        renderGridComposer: () => {
            renders++;
        },
        compactPlacements: grid.compactPlacements,
        endEditMode() {},
        saveLayout: async () => {
            saved = structuredClone(state.layout);
        },
    });
    panel.createElementsPanel();
    assert.match(state.elementsPanel.innerHTML, /analogue_clock.label/);
    assert.ok(controls.has("analogue-clock"));
    controls.get("analogue-clock").dispatchEvent(new Event("click"));
    assert.equal(renders, 1);
    assert.ok(!state.layout.hidden.includes("analogue-clock"));
    assert.ok(
        state.layout.placements.some(({ id }) => id === "analogue-clock"),
    );
    controls
        .get(".composer-done-btn")
        .dispatchEvent(new Event("click", { cancelable: true }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(saved);
    const added = structuredClone(state.layout);
    grid.initializePlacements();
    assert.deepEqual(state.layout, added);
    assertBounded(state.layout.placements, 12);
    assert.deepEqual(layoutFor(page.elements, 12, saved).state.layout, added);
});

for (const width of [320, 390, 640]) {
    test(`saved dashboard stacks at ${width}px and returns to desktop without saving`, async () => {
        const page = await mountDashboard({ extensions: [courseSummary] });
        const { state, renderer } = layoutFor(page.elements, 12);
        const desktop = renderer.computeViewPlacements();
        const saved = structuredClone(state.layout);
        state.contentGrid = { getBoundingClientRect: () => ({ width }) };
        state.gridCols = Math.floor(width / 90);
        const compact = renderer.computeViewPlacements();
        assertBounded(compact, state.gridCols);
        assert.ok(
            compact.every(({ col, w }) => col === 0 && w === state.gridCols),
        );
        assert.deepEqual(
            compact.map(({ id }) => id),
            desktop.map(({ id }) => id),
        );
        assert.deepEqual(state.layout, saved);
        state.contentGrid = { getBoundingClientRect: () => ({ width: 1080 }) };
        state.gridCols = 12;
        assert.deepEqual(renderer.computeViewPlacements(), desktop);
    });
}

test("empty and populated calendar hydration keeps default dimensions and all event links", async () => {
    const events = Array.from({ length: 5 }, (_, index) => ({
        id: `event-${index}`,
        calendarId: "calendar",
        calendarName: "Learning",
        title: `Long event ${index}`,
        startAt: "2026-11-14T12:00:00Z",
    }));
    const empty = await mountDashboard();
    const populated = await mountDashboard({ events });
    const emptyCard = empty.elements.find(
        ({ id }) => id === "calendar-upcoming",
    );
    const populatedCard = populated.elements.find(
        ({ id }) => id === "calendar-upcoming",
    );
    assert.match(emptyCard.render(), /calendar_upcoming.empty/);
    assert.equal(
        (populatedCard.render().match(/dashboard-upcoming-event-link/g) ?? [])
            .length,
        5,
    );
    assert.deepEqual(
        JSON.parse(JSON.stringify(emptyCard.gridSize)),
        JSON.parse(JSON.stringify(populatedCard.gridSize)),
    );
});

test("repeated mount preserves default declarations and an aborted mount adds no composer", async () => {
    const fixture = await loadDashboard();
    const first = new AbortController();
    await fixture.mount({}, { signal: first.signal });
    first.abort();
    await fixture.mount({}, { signal: new AbortController().signal });
    await fixture.mount({}, { signal: AbortSignal.abort() });
    assert.equal(fixture.composers.length, 2);
    for (const composer of fixture.composers) {
        const { state } = layoutFor(composer.options.elements, 12);
        assert.deepEqual(state.layout.hidden, ["analogue-clock"]);
        assert.equal(state.layout.placements.length, 6);
    }
});
