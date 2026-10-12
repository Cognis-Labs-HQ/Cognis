import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { exploreLayers, languageExploreUrl } from "../ui/reuse/explore.js";

const schemas = [
    {
        id: "ja",
        language: "ja",
        layers: [
            { id: "kana", semanticRole: "atomicWritingUnit" },
            { id: "kanji", semanticRole: "compoundWritingUnit" },
            {
                id: "words",
                navigationSlug: "vocabulary",
                semanticRole: "lexicalUnit",
            },
            { id: "sentences", semanticRole: "orderedLexicalSequence" },
            { id: "definitions", semanticRole: "definition" },
        ],
    },
    {
        id: "en",
        language: "en",
        layers: [
            { id: "alphabet", semanticRole: "atomicWritingUnit" },
            {
                id: "composites",
                navigationSlug: "letter-combinations",
                semanticRole: "compoundWritingUnit",
            },
            {
                id: "words",
                navigationSlug: "vocabulary",
                semanticRole: "lexicalUnit",
            },
            { id: "sentences", semanticRole: "orderedLexicalSequence" },
            { id: "particles", semanticRole: "particle" },
        ],
    },
];

test("English and Japanese resolve the same Explore roles through their provider slugs", () => {
    for (const [from, to] of [
        ["kana", "alphabet"],
        ["kanji", "letter-combinations"],
        ["vocabulary", "vocabulary"],
        ["sentences", "sentences"],
    ]) {
        assert.equal(
            languageExploreUrl(schemas, "en", `/study/explore/ja/${from}`),
            `/study/explore/en/${to}`,
        );
    }
    assert.equal(exploreLayers(schemas, "en").length, 4);
    assert.equal(
        languageExploreUrl(schemas, "en"),
        "/study/explore/en/alphabet",
    );
    assert.equal(languageExploreUrl(schemas, "unavailable"), null);
});

test("language choices resolve shared host pages even when provider child pages are empty", async () => {
    const context = vm.createContext({
        languageExploreUrl,
        document: { documentElement: { lang: "en" } },
        window: { location: { pathname: "/study/explore/ja/kanji" } },
        history: { state: {} },
        parseLanguageCode: (value) => value,
        resolveLanguageLabel: (_code, name) => name,
        apiFetch: async () => ({
            ok: true,
            json: async () => ({ data: { learningLanguages: ["ja", "en"] } }),
        }),
        fetchLibrarySchemas: async () => schemas,
        fetchLibraryPushRequests: async () => [],
        fetchSearchableDictionaryProviders: async () => [],
        loadSpaRoutes: async () =>
            [
                "/study/explore",
                "/study/library",
                "/study/flashcards",
                "/study/library/requests",
            ].map((base) => ({ base })),
        uiCtx: {
            capabilities: {
                get: () => ({
                    load: async () => ({
                        groups: [{ code: "ja" }, { code: "en" }],
                        pagesByGroup: new Map([
                            ["ja", []],
                            ["en", []],
                        ]),
                    }),
                }),
            },
        },
    });
    const source = readFileSync(
        new URL("../ui/sub-navigation.js", import.meta.url),
        "utf8",
    )
        .replace(/^import[\s\S]*?;\n/gm, "")
        .replace(/export (async )?function/g, "$1function");
    vm.runInContext(source, context);
    const model = await context.loadStudySubNavigationModel({
        fallbackLanguageCode: "ja",
    });
    assert.equal(
        model.languagePageUrlsByCode.get("en"),
        "/study/explore/en/letter-combinations",
    );
    context.window.location.pathname = "/study/flashcards/deck";
    const deck = await context.loadStudySubNavigationModel({
        fallbackLanguageCode: "en",
    });
    assert.equal(
        deck.languagePageUrlsByCode.get("en"),
        "/study/flashcards/deck",
    );
});
