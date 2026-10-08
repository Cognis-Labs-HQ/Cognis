import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
    resolveLabelComposition,
    distinctPronunciationLabels,
} from "../ui/app/composition-links.js";

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
        distinctPronunciationLabels,
        titleReferenceAction: (entry) =>
            `open-title-reference:${encodeURIComponent(JSON.stringify({ entryId: entry.id, transformation: entry.referenceTransformation }))}`,
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
            (label) =>
                `open-title-reference:${encodeURIComponent(JSON.stringify({ entryId: `kana-${label}` }))}`,
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
            .replaceAll("export ", "") +
            "\nglobalThis.items = popupTitleItems;",
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
    const { resolveCompositionDependants, filterImmediateDependants } =
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
        filterImmediateDependants,
        deriveDetailPronunciation() {},
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
    const indirect = {
        ...verb,
        id: "indirect",
        label: "Indirect use",
        references: [{ entryId: adverb.id }],
    };
    const detail = { entry: character, usedBy: [explicit, adverb, indirect] };
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
    assert.equal(detail.usedBy.length, 3);
});

test("a transformed kana title does not repeat the same pronunciation", () => {
    for (const [value, pronunciation] of [
        ["ありたくない", "ありたくない"],
        ["ありたくない", " ありたくない "],
        ["カナ", "ｶﾅ"],
    ]) {
        const presentation = loadPresentation()(
            { node: { value, pronunciation } },
            verb,
            schemas[0],
            [],
            "body",
            ["meaning"],
            schemas,
            entries,
        );
        assert.deepEqual(
            Array.from(
                presentation.titleDetailItems,
                ({ placement }) => placement,
            ),
            ["definition"],
        );
    }
});

test("Return to the verb root closes the transformed card and restores the base card", async () => {
    const transformation = {
        node: { value: "行かなくて", pronunciation: "いかなくて" },
    };
    const popups = [];
    const context = {
        AbortController,
        URL,
        resolveLabelComposition,
        headingCompositionReferences: () => [],
        deriveDetailPronunciation() {},
        fetchLibraryEntry: async () => ({ entry: verb, references: [] }),
        composeDetail: async () => ({
            titleDefinition: "meaning",
            body: "body",
            definitions: ["meaning"],
            renderBody: () => "body",
            actions: [],
        }),
        isMeaningLayer: () => false,
        layerForEntry: () => schemas[0].layers[1],
        entryEditMode: () => null,
        popupEntryNavigationState: () => ({ active: [verb], index: 0 }),
        popupTitleDetailItems: () => [],
        popupTitleItems: () => [],
        transformPresentation: loadPresentation(),
        withParentAttribution: (items) => items,
        withParentTitleAttribution: (items) => items,
        titleDefinitionForRole: () => "meaning",
        resolveDraw: () => null,
        drawingHeaderActions: () => [],
        referencedTransformation: (_entry, _schema, descriptor) => descriptor,
        sourceTransformation: () => null,
        resolvePopupNavigation: ({ result }) =>
            result === "variant"
                ? { entry: verb, transformation }
                : { entry: null },
        openPopup: async (options) => {
            popups.push(options);
            return ["variant", "return-root", "close"][popups.length - 1];
        },
    };
    const stripImports = (source) =>
        source
            .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
            .replace(/\bexport /g, "");
    vm.createContext(context);
    vm.runInContext(
        stripImports(
            readFileSync(
                new URL("../ui/app/transformation-detail.js", import.meta.url),
                "utf8",
            ),
        ),
        context,
    );
    vm.runInContext(
        stripImports(
            readFileSync(
                new URL("../ui/app/entry-popup.js", import.meta.url),
                "utf8",
            ),
        ) + "\nglobalThis.open = openEntryPopup;",
        context,
    );
    await context.open(
        {},
        verb,
        schemas,
        [verb, ...entries],
        {
            t: (key) =>
                key === "gateway.study.library_return_to_root"
                    ? "Return to {{ verb }}"
                    : key,
        },
        "ja",
    );
    assert.deepEqual(
        popups.map(({ title }) => title),
        ["行く", "行かなくて", "行く"],
    );
    const rootAction = popups[1].actions.find(({ id }) => id === "return-root");
    assert.equal(rootAction.label, "Return to 行く");
    assert.equal(rootAction.variant, "neutral");
    assert.deepEqual(
        popups.map(
            ({ actions }) =>
                actions.filter(({ id }) => id === "return-root").length,
        ),
        [0, 1, 0],
    );
});
