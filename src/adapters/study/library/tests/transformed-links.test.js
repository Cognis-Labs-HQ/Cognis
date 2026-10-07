import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { resolveLabelComposition } from "../ui/app/composition-links.js";

const schemas = [
    {
        id: "japanese",
        language: "ja",
        layers: [
            { id: "kana", semanticRole: "atomicWritingUnit" },
            { id: "words", semanticRole: "lexicalUnit" },
        ],
    },
];
const verb = {
    id: "go",
    label: "行く",
    schemaId: "japanese",
    language: "ja",
    layer: "words",
};
const entries = ["行", "い", "か", "な", "く", "て", "ゆ", "っく", "り"].map(
    (label) => ({
        id: `kana-${label}`,
        label,
        schemaId: "japanese",
        language: "ja",
        layer: "kana",
    }),
);

function loadPresentation() {
    const source = readFileSync(
        new URL("../ui/app/transformation-popup.js", import.meta.url),
        "utf8",
    )
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
    const context = {
        resolveLabelComposition,
        transformedDefinitions: (definitions) => definitions,
    };
    vm.runInNewContext(
        source + "\nglobalThis.present = transformedPopupPresentation;",
        context,
    );
    return context.present;
}

test("verb transformations link their changed reading to canonical kana", () => {
    const presentation = loadPresentation()(
        { node: { value: "行かなくて", pronunciation: "いかなくて" } },
        verb,
        schemas[0],
        [{ label: "いく", placement: "reading" }],
        "body",
        ["to not go"],
        schemas,
        entries,
    );
    assert.equal(presentation.title, "行かなくて");
    const reading = presentation.titleDetailItems.filter(
        ({ placement }) => placement === "reading",
    );
    assert.equal(reading.map(({ label }) => label).join(""), "いかなくて");
    assert.deepEqual(
        Array.from(reading, ({ actionId }) => actionId),
        ["い", "か", "な", "く", "て"].map(
            (label) => `open-title-reference:kana-${label}`,
        ),
    );
    assert.equal(presentation.titleDetailItems.at(-1).label, "to not go");
});

test("transformed titles retain clickable canonical character components", () => {
    const source = readFileSync(
        new URL("../ui/app/popup-title.js", import.meta.url),
        "utf8",
    );
    const context = {};
    vm.runInNewContext(
        source
            .slice(source.indexOf("export function popupTitleItems"))
            .replace("export ", "") + "\nglobalThis.items = popupTitleItems;",
        context,
    );
    for (const title of ["行かなくて", "ゆっくり"]) {
        const references = resolveLabelComposition(
            title,
            verb,
            schemas,
            entries,
        );
        const items = context.items(references);
        assert.equal(items.map(({ label }) => label).join(""), title);
        for (const item of items) {
            const payload = JSON.parse(
                decodeURIComponent(
                    item.actionId.slice("open-title-reference:".length),
                ),
            );
            assert.ok(entries.some(({ id }) => id === payload.entryId));
        }
    }
});

test("unresolved transformed readings stay visible without partial links", () => {
    const presentation = loadPresentation()(
        { node: { value: "unknown", pronunciation: "unresolved" } },
        verb,
        schemas[0],
        [],
        "body",
        [],
        schemas,
        entries,
    );
    assert.equal(presentation.titleDetailItems[0].label, "unresolved");
    assert.equal(presentation.titleDetailItems[0].actionId, undefined);
});

test("detail rendering merges canonical upward links with stored relationships", async () => {
    const { resolveCompositionDependants } =
        await import("../ui/app/composition-links.js");
    const character = entries.find(({ label }) => label === "っく");
    const adverb = { ...verb, id: "slowly", label: "ゆっくり" };
    const explicit = { ...verb, id: "explicit", label: "Explicit use" };
    const source = readFileSync(
        new URL("../ui/app/detail.js", import.meta.url),
        "utf8",
    )
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
    let flowDetail;
    const context = {
        resolveCompositionDependants,
        uiCtx: {
            runFlow: async (_flow, { detail }) => {
                flowDetail = detail;
                return { stageResults: {} };
            },
        },
        layerForEntry: (schemas, entry) =>
            schemas
                .find(({ id }) => id === entry.schemaId)
                ?.layers.find(({ id }) => id === entry.layer),
        definitionDisplay: () => ({
            titleDefinition: "",
            additionalDefinitions: [],
        }),
        isWritingUnitLayer: (layer) =>
            layer?.semanticRole === "atomicWritingUnit",
        uniqueRelatedEntries: (entries) => entries,
        metadataFields: () => [],
        localizedLabel: () => "",
        transformationPathways: () => [],
        renderAudio: () => "",
        renderMetadataPills: () => "",
        renderDetailFields: () => "",
        renderScope: () => "",
        section: () => "",
        escapeHtml: (value) => value,
        similarEntries: () => [],
        relationSection: (title, entries) =>
            `${title}:${entries.map(({ id }) => id).join(",")}`,
    };
    vm.runInNewContext(
        source + "\nglobalThis.compose = composeDetail;",
        context,
    );
    const detail = { entry: character, usedBy: [explicit, adverb] };
    const composed = await context.compose(
        detail,
        schemas,
        [...entries, adverb],
        { t: (key) => key },
        "ja",
    );
    assert.deepEqual(
        Array.from(flowDetail.usedBy, ({ id }) => id),
        ["explicit", "slowly"],
    );
    assert.ok(
        composed.body.includes("gateway.study.library_used_by:explicit,slowly"),
    );
    assert.equal(detail.usedBy.length, 2);
});
