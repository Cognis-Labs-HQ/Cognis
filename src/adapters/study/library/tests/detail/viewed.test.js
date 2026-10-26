import * as offlineState from "../../../../../ui/reuse/offline-state.js";
import * as entryGraph from "../../ui/reuse/entry-graph.js";
import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";

function popupFixture({ next, fetchError, editing = false } = {}) {
    const viewed = [],
        opened = [];
    const schema = {
        id: "schema",
        layers: [{ id: "words", semanticRole: "lexicalUnit" }],
    };
    const initial = {
        id: "first",
        schemaId: schema.id,
        layer: "words",
        label: "First",
    };
    const second = { ...initial, id: "second", label: "Second" };
    const root = {};
    const { openEntryPopup } = loadTestModule(
        new URL("../../ui/app/entry-popup.js", import.meta.url),
        {
            "/static/reuse/offline-state.js": offlineState,
            "../reuse/entry-graph.js": entryGraph,
            "./viewed-entries.js": {
                markEntryViewed: async (_root, entry) => {
                    assert.ok(opened.length);
                    viewed.push(entry.id);
                },
            },
            "./detail-layout.js": {
                bindEntryDetail() {},
                releaseEntryMedia() {},
            },
            "/static/reuse/popup.js": {
                openPopup: async (options) => {
                    opened.push("detail");
                    options.onOpen(
                        { classList: { add() {} }, addEventListener() {} },
                        () => {},
                        {},
                    );
                    assert.ok(!options.body.includes("library-new-pill"));
                    return next &&
                        opened.filter((value) => value === "detail").length ===
                            1
                        ? "next"
                        : null;
                },
            },
            "./entry-data.js": loadTestModule(
                new URL("../../ui/app/entry-data.js", import.meta.url),
                {
                    "/static/reuse/offline-state.js": offlineState,
                    "../reuse/entry-graph.js": entryGraph,
                    "/static/gateways/study/library-client.js": {
                        fetchLibraryEntry: async (id) => {
                            if (fetchError) throw fetchError;
                            return {
                                entry: id === initial.id ? initial : second,
                                references: [],
                            };
                        },
                    },
                },
            ),
            "./detail.js": {
                composeDetail: async () => ({
                    body: "detail",
                    actions: [],
                    definitions: [],
                }),
            },
            "./presentation.js": {
                isMeaningLayer: () => false,
                layerForEntry: () => schema.layers[0],
            },
            "./popup-title.js": {
                popupTitleDetailItems: () => [],
                popupTitleItems: () => [],
                hasReadingDetails: () => false,
                withParentTitleAttribution: (items) => items,
            },
            "./popup-navigation.js": {
                popupEntryNavigationState: () => ({
                    active: [initial, second],
                    index: 0,
                }),
                popupNavigationActions: () => [],
                resolvePopupNavigation: ({ result }) => ({
                    entry: result === "next" ? second : null,
                    sourceDefinition: "",
                }),
            },
            "./title-definition.js": {
                titleDefinitionForRole: () => "meaning",
            },
            "./admin-interactions/index.js": {
                openLibraryEntryEditor: async (options) => {
                    opened.push("editor");
                    options.onOpened?.();
                },
            },
            "./editability.js": {
                popupEntryEditMode: () => (editing ? "direct" : null),
            },
            "./transformation-popup.js": {
                transformedPopupPresentation: (
                    _transformation,
                    entry,
                    _schema,
                    titleDetailItems,
                    body,
                    definitions,
                ) => ({
                    title: entry.label,
                    titleDetailItems,
                    body,
                    definitions,
                }),
            },
            "./transformation-detail.js": {
                detailTitleReferences: () => [],
                resolveDetailTransformation: () => null,
                selectDetailTransformation: () => false,
                transformedDetailEntry: (entry) => entry,
                transformedParentAttribution: (items) => items,
            },
            "./drawing.js": {
                canDraw: () => false,
                resolveDraw: () => null,
                openDrawing() {},
                drawingHeaderActions: () => [],
            },
        },
        { AbortController },
    );
    return {
        viewed,
        opened,
        open: (options = {}, signal) =>
            openEntryPopup(
                root,
                initial,
                [schema],
                [],
                { t: String },
                "ja",
                signal,
                options,
            ),
    };
}

test("deep-link and next-card details mark each displayed canonical entry without preview interaction", async () => {
    const fixture = popupFixture({ next: true });
    await fixture.open();
    assert.deepEqual(fixture.viewed, ["first", "second"]);
});

test("direct editor opening also records the viewed card", async () => {
    const fixture = popupFixture({ editing: true });
    await fixture.open({ startEditing: true });
    assert.deepEqual(fixture.opened, ["editor", "detail"]);
    assert.deepEqual(fixture.viewed, ["first", "first"]);
});

test("failed or aborted details do not mark unseen cards", async () => {
    const failure = popupFixture({ fetchError: new Error("entry_failed") });
    await assert.rejects(failure.open(), /entry_failed/);
    assert.deepEqual(failure.viewed, []);
    const controller = new AbortController();
    controller.abort();
    const aborted = popupFixture();
    await aborted.open({}, controller.signal);
    assert.deepEqual(aborted.viewed, []);
});
