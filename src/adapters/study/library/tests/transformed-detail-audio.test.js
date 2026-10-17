import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

function load(path, context) {
    vm.runInContext(
        readFileSync(new URL(path, import.meta.url), "utf8")
            .replace(/^import[\s\S]*?;\n/gm, "")
            .replace(/export (async )?function/g, "$1function"),
        context,
    );
}

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
        escapeHtml,
        document: { documentElement: { lang: "en" } },
        parseLanguageCode: (code) => code,
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
    load("../ui/app/presentation.js", context);
    load("../ui/app/transformation-detail.js", context);
    load("../ui/app/detail.js", context);
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
            tags: [],
            fields: { pronunciation: [base] },
            references: [],
        };
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
        assert.equal(observed.at(-1).fields.pronunciation, reading);
    }
});
