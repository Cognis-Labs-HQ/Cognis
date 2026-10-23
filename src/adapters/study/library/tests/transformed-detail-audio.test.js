import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import {
    createClassificationResolver,
    learnerTagMetadata,
} from "../ui/reuse/classification.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { generatedTransformationCard } from "../ui/reuse/transformations.js";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

test("selected verb, adverb and plural details request their transformed audio through the real detail flow", async () => {
    const flowId = "study:library:composeEntryDetail";
    uiCtx.registerFlow(flowId, ["beforeCore", "core", "afterCore", "actions"]);
    const observed = [];
    uiCtx.extendFlow(
        flowId,
        "beforeCore",
        { id: "audio-test" },
        ({ input: { detail } }) => {
            observed.push(detail.entry);
        },
    );
    const context = vm.createContext({
        uiCtx,
        createClassificationResolver,
        learnerTagMetadata,
        generatedTransformationCard,
        escapeHtml,
        document: { documentElement: { lang: "en" } },
        parseLanguageCode: (code) => code,
        renderReferenceImages: () => "",
        deriveDetailPronunciation() {},
        resolveCompositionDependants: () => [],
        filterImmediateDependants: () => [],
        dependantsMatchingTransformation: () => [],
        transformationPathways: () => [],
        similarEntries: () => [],
        uniqueRelatedEntries: (entries) => entries,
        definitionDisplay: () => ({
            titleDefinition: "meaning",
            additionalDefinitions: [],
        }),
    });
    Object.assign(context, loadLibraryUiModule("app/presentation.js", context));
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/app/transformation-detail.js", import.meta.url),
            {
                "./presentation.js": context,
                "./composition-links.js": context,
                "./transformation-popup.js": context,
                "./popup-title.js": context,
                "../reuse/transformations.js": context,
            },
            context,
        ),
    );
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/app/detail.js", import.meta.url),
            {
                "../reuse/classification.js": context,
                "./reference-images.js": context,
                "./transformation-detail.js": context,
                "./composer-contract.js": context,
                "/static/reuse/ui-ctx.js": context,
                "/static/reuse/escape-html.js": context,
                "./presentation.js": context,
                "./composition-links.js": context,
                "./definition-display.js": context,
                "/static/gateways/study/reuse/similar-items.js": context,
                "./related-entries.js": context,
                "../reuse/transformations.js": context,
            },
            context,
        ),
    );
    const schema = {
        id: "schema",
        language: "en",
        layers: [
            {
                id: "words",
                semanticRole: "lexicalUnit",
                fields: [
                    {
                        id: "audio",
                        type: "audio",
                        audioLookupAvailable: true,
                        metadata: { labels: { en: "Audio" } },
                    },
                ],
            },
        ],
    };
    for (const [base, label, setId, reading] of [
        ["行く", "行った", "godan-iku", "いった"],
        ["大きい", "大きく", "i-adjective", "おおきく"],
        ["dog", "dogs", "noun-dog", "/dɒɡz/"],
    ]) {
        const entry = {
            id: base,
            label: base,
            schemaId: "schema",
            layer: "words",
            language: "en",
            scope: "global",
            tags: ["transform:fixture"],
            fields: { pronunciation: [base] },
            references: [],
        };
        schema.transformSets = [
            {
                id: setId,
                flag: "transform:fixture",
                matchTags: ["transform:fixture"],
                baseState: "base",
                rules: [
                    {
                        id: "form",
                        fromState: "base",
                        toState: "form",
                        removeSuffix: base,
                        append: label,
                        pronunciation: { removeSuffix: base, append: reading },
                    },
                ],
            },
        ];
        const result = await context.composeDetail(
            { entry, references: [] },
            [schema],
            [],
            { t: (key) => key },
            "en",
            {
                transformation: {
                    set: { id: setId },
                    node: {
                        value: label,
                        pronunciation: reading,
                        path: ["form"],
                    },
                },
            },
        );
        assert.match(result.body, /data-library-audio-transformation=/);
        assert.ok(
            result.body.includes(
                escapeHtml(JSON.stringify({ setId, path: ["form"] })),
            ),
        );
        assert.equal(observed.at(-1).label, label);
        assert.deepEqual(observed.at(-1).fields.pronunciation, [reading]);
    }
});
