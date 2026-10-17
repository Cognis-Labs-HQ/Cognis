import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { popupEntryEditMode } from "../ui/app/editability.js";

const source = readFileSync(
    new URL("../ui/app/request-preview.js", import.meta.url),
    "utf8",
)
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(/export (async )?function/g, "$1function");
test("request previews use the normal card renderer with staged fields and persist only the proposed root", async () => {
    const request = {
        id: "request",
        sourceEntryId: "card",
        source: {
            id: "card",
            schemaId: "schema",
            layer: "words",
            label: "before",
            fields: { pictures: [] },
        },
        proposedEntry: {
            label: "after",
            fields: { pictures: ["file:picture"] },
        },
        status: "pending",
        canReview: true,
        canStage: true,
    };
    const rendered = [];
    const popups = [];
    const saved = [];
    let listener;
    let reloaded = 0;
    const context = {
        Map,
        escapeHtml: String,
        layerForEntry: () => ({ id: "words" }),
        renderEntryCard: (entry) => {
            rendered.push(entry);
            return `<button data-library-entry="${entry.id}">${entry.label}</button>`;
        },
        openEntryPopup: async (...args) => popups.push(args.at(-1)),
        stageLibraryPromotion: async (id, entry) => {
            saved.push([id, entry]);
            return { ...request, proposedEntry: entry };
        },
        showToast() {},
        console,
    };
    vm.runInNewContext(source, context);
    const schemas = [{ id: "schema" }];
    const i18n = { t: (key) => key };
    context.renderRequestPreview(request, schemas, [], i18n, true);
    context.renderRequestPreview(request, schemas, [], i18n, false);
    assert.deepEqual(
        rendered.map(({ label }) => label),
        ["after", "before"],
    );
    assert.deepEqual(rendered[0].fields.pictures, ["file:picture"]);
    const root = {
        addEventListener: (_type, handler) => {
            listener = handler;
        },
    };
    context.bindRequestPreviews(root, [request], {
        schemas,
        entries: [],
        i18n,
        reload: async () => {
            reloaded++;
        },
    });
    const preview = {
        dataset: { requestPreview: "staged" },
        closest: () => ({ dataset: { libraryRequest: "request" } }),
    };
    const card = { dataset: { libraryEntry: "card" }, closest: () => preview };
    await listener({ target: { closest: () => card } });
    assert.equal(popups[0].editDraft, true);
    assert.equal(popups[0].detail.entry.label, "after");
    await popups[0].persistDraft({ label: "tweaked" });
    assert.deepEqual(saved, [["request", { label: "tweaked" }]]);
    assert.equal(reloaded, 1);
    assert.equal(request.source.label, "before");
    preview.dataset.requestPreview = "current";
    await listener({ target: { closest: () => card } });
    assert.equal(popups[1].readOnly, true);
    assert.equal(
        popupEntryEditMode(
            { id: "child", canEdit: true },
            { id: "card" },
            { editDraft: true },
        ),
        null,
    );
    assert.equal(
        popupEntryEditMode({ id: "card" }, { id: "card" }, { editDraft: true }),
        "direct",
    );
});
