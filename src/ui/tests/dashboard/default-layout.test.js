import test from "node:test";
import {
    composerFixture,
    settle,
} from "../page-composer/fixtures/save-runtime.js";
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
    let renders = 0;
    const fixture = await composerFixture({
        mode: "deferred",
        initialProfiles: { layoutsByGrid: {} },
        elements: page.elements,
        onRender: () => {
            renders++;
        },
    });
    context.after(() => fixture.dispose());
    context.after(() => assert.deepEqual(fixture.errors, []));
    fixture.edit();
    const panel = fixture.document.querySelector(".composer-panel");
    assert.match(panel.innerHTML, /analogue_clock.label/);
    const add = panel.querySelector(
        '[data-composer-panel-item="analogue-clock"] .composer-add-btn',
    );
    assert.ok(add);
    assert.equal(add.textContent, fixture.i18n.t("ui.reuse.add"));
    assert.equal(add.disabled, false);
    const previousRenders = renders;
    add.click();
    assert.equal(renders, previousRenders + 1);
    assert.ok(
        fixture.root.querySelector('[data-composer-element="analogue-clock"]'),
    );
    assert.equal(fixture.snapshot().leaveProtected, true);
    fixture.done("panel");
    await settle();
    assert.equal(fixture.snapshot().writes, 1);
    assert.equal(fixture.snapshot().editorPresent, true);
    assert.equal(fixture.snapshot().leaveProtected, true);
    assert.equal(
        fixture.document
            .querySelector(".composer-done-btn")
            .getAttribute("aria-disabled"),
        "true",
    );
    fixture.done("panel");
    await settle();
    assert.equal(fixture.snapshot().writes, 1);
    const saved = structuredClone(
        fixture.pending[0].body.layout.layoutsByGrid["cols-12"],
    );
    assert.ok(!saved.hidden.includes("analogue-clock"));
    assert.ok(saved.placements.some(({ id }) => id === "analogue-clock"));
    assertBounded(saved.placements, 12);
    assert.deepEqual(
        layoutFor(page.elements, 12, structuredClone(saved)).state.layout,
        saved,
    );
    fixture.complete();
    await settle();
    assert.equal(fixture.snapshot().editorPresent, false);
    assert.equal(fixture.snapshot().leaveProtected, false);
    assert.deepEqual(fixture.stored().layoutsByGrid["cols-12"], saved);
    await fixture.remount();
    assert.ok(
        fixture.root.querySelector('[data-composer-element="analogue-clock"]'),
    );
    assert.equal(fixture.snapshot().writes, 1);
    assert.deepEqual(fixture.stored().layoutsByGrid["cols-12"], saved);
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
