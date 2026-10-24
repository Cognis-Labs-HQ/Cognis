import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

async function drawingAction(openDrawing) {
    let action;
    const entry = {
        id: "card",
        label: "学",
        schemaId: "schema",
        layer: "characters",
    };
    const context = {
        AbortController,
        isMeaningLayer: () => false,
        layerForEntry: () => ({}),
        fetchLibraryEntry: async () => ({ entry }),
        detailTitleReferences: () => [],
        popupEntryEditMode: () => null,
        popupEntryNavigationState: () => ({ active: [entry], index: 0 }),
        popupTitleDetailItems: () => [],
        popupTitleItems: () => [],
        composeDetail: async () => ({
            body: "",
            titleDefinition: "meaning",
            definitions: ["meaning"],
            actions: [],
        }),
        transformPresentation: (
            _transformation,
            _entry,
            _schema,
            items,
            body,
            definitions,
        ) => ({ titleDetailItems: items, body, definitions }),
        transformedParentAttribution: (items) => items,
        titleDefinitionForRole: () => "meaning",
        transformedDetailEntry: (entry) => entry,
        resolveDraw: () => ({ strokes: [1] }),
        drawingHeaderActions: () => [],
        withParentTitleAttribution: (items) => items,
        hasReadingDetails: () => false,
        popupNavigationActions: () => [],
        releaseEntryMedia() {},
        resolvePopupNavigation: () => ({ entry: null }),
        resolveDetailTransformation: () => null,
        canDraw: () => true,
        openDrawing,
        openPopup: async (options) => {
            action = options.onAction;
            return "close";
        },
    };
    const { openEntryPopup } = loadTestModule(
        new URL("../../ui/app/entry-popup.js", import.meta.url),
        {
            "./viewed-entries.js": context,
            "./detail-layout.js": context,
            "/static/reuse/popup.js": context,
            "/static/gateways/study/library-client.js": context,
            "./detail.js": context,
            "./presentation.js": context,
            "./popup-title.js": context,
            "./popup-navigation.js": context,
            "./title-definition.js": context,
            "./admin-interactions/index.js": context,
            "./editability.js": context,
            "./transformation-popup.js": {
                transformedPopupPresentation: context.transformPresentation,
            },
            "./transformation-detail.js": context,
            "./drawing.js": context,
        },
        context,
    );
    await openEntryPopup(
        {},
        entry,
        [{ id: "schema" }],
        [entry],
        { t: (key) => key },
        "ja",
    );
    return action;
}

test("card details request dismissal only after the drawing pad opens", async () => {
    let opened = false;
    const action = await drawingAction(async (entry, pattern, definition) => {
        assert.equal(entry.id, "card");
        assert.equal(pattern.strokes.length, 1);
        assert.equal(definition, "meaning");
        await Promise.resolve();
        opened = true;
    });
    const dismiss = await action("draw");
    assert.equal(opened, true);
    assert.equal(dismiss, true);
});

test("a failed pad opening propagates to the popup and keeps the details available", async () => {
    const action = await drawingAction(async () => {
        throw new Error("drawing_unavailable");
    });
    await assert.rejects(action("draw"), /drawing_unavailable/);
});
