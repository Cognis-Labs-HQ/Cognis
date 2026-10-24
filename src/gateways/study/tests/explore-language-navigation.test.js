import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import {
    exploreLayers,
    languageExploreUrl,
    languageFlashcardsUrl,
} from "../ui/reuse/explore.js";

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

function navigationContext({ locale = "en", routes, pending = [] } = {}) {
    const context = vm.createContext({
        languageExploreUrl,
        languageFlashcardsUrl,
        document: { documentElement: { lang: locale } },
        window: { location: { pathname: "/study/explore/ja/kanji" } },
        history: { state: {} },
        parseLanguageCode: (value) => value,
        resolveLanguageLabel: (_code, name) => name,
        apiFetch: async () => ({
            ok: true,
            json: async () => ({ data: { learningLanguages: ["ja", "en"] } }),
        }),
        fetchLibrarySchemas: async () => schemas,
        fetchLibraryPushRequests: async () => pending,
        fetchSearchableDictionaryProviders: async () => [],
        escapeHtml: String,
        buildLibraryUrl: () => "/study/library",
        isAdminScope: () => false,
        loadSpaRoutes: async () =>
            routes ??
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
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/sub-navigation.js", import.meta.url),
            {
                "./reuse/explore.js": context,
                "/static/reuse/mount-scope.js": context,
                "/static/reuse/toast.js": context,
                "/static/reuse/form-builder.js": context,
                "/static/reuse/api-client.js": context,
                "/static/reuse/escape-html.js": context,
                "/static/reuse/ui-ctx.js": context,
                "/static/reuse/spa-route-registry.js": context,
                "/static/gateways/study/language.js": context,
                "/static/gateways/study/library-client.js": context,
            },
            context,
        ),
    );
    return context;
}

test("language choices resolve shared host pages even when provider child pages are empty", async () => {
    const context = navigationContext();
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
    assert.equal(deck.languagePageUrlsByCode.get("en"), "/study/en/flashcards");
});

test("Study renders Requests from route translations without an adapter locale bundle", async () => {
    const labels = {
        de: "Anfragen",
        en: "Requests",
        id: "Permintaan",
        ja: "リクエスト",
    };
    const rankings = {
        de: "Rangliste",
        en: "Leaderboard",
        id: "Peringkat",
        ja: "ランキング",
    };
    const english = localeStrings("en");
    for (const locale of ["de", "en", "id", "ja", "de-AT", "fr"]) {
        const context = navigationContext({
            locale,
            routes: [
                { base: "/study/explore" },
                { base: "/study/library/requests", navigationLabels: labels },
                { base: "/study/leaderboard", navigationLabels: rankings },
            ],
            pending: [{ canReview: true }],
        });
        context.window.location.pathname = "/study";
        const preferred = localeStrings(locale.split("-")[0]);
        const lookups = [];
        const model = await context.loadStudySubNavigationModel({
            fallbackLanguageCode: "ja",
        });
        const slot = context.createStudySubNavigationSlot(model, {
            t(key) {
                lookups.push(key);
                const value = preferred.get(key) || english.get(key);
                if (!value) throw new Error(`missing_translation:${key}`);
                return value;
            },
        });
        assert.equal(slot.id, "study-subnav");
        const html = slot.render();
        const label =
            labels[locale] ?? labels[locale.split("-")[0]] ?? labels.en;
        assert.match(
            html,
            new RegExp(`href="/study/library/requests"[^>]*>\\s*${label}`),
        );
        const rankingLabel =
            rankings[locale] ?? rankings[locale.split("-")[0]] ?? rankings.en;
        assert.match(
            html,
            new RegExp(`href="/study/leaderboard"[^>]*>\\s*${rankingLabel}`),
        );
        assert.equal(
            [...html.matchAll(/href="\/study\/leaderboard"/g)].length,
            1,
        );
        assert.ok(lookups.length > 0);
    }
});

function localeStrings(locale) {
    if (!["de", "en", "id", "ja"].includes(locale)) return new Map();
    const xml = [
        new URL(`../../../ui/languages/${locale}/strings.xml`, import.meta.url),
        new URL(`../ui/languages/${locale}/strings.xml`, import.meta.url),
    ]
        .map((url) => readFileSync(url, "utf8"))
        .join("\n");
    return new Map(
        [...xml.matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g)].map(
            (match) => [match[1], match[2]],
        ),
    );
}
