import { replaceMountScope } from "../../../ui/reuse/mount-scope.js";
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

function navigationContext({
    locale = "en",
    routes,
    pending = [],
    admin = false,
} = {}) {
    const context = vm.createContext({
        languageExploreUrl,
        languageFlashcardsUrl,
        replaceMountScope,
        document: { documentElement: { lang: locale } },
        window: { location: { pathname: "/study/explore/ja/kanji" } },
        history: { state: {} },
        parseLanguageCode: (value) => value,
        resolveLanguageLabel: (_code, name) => name,
        fetchStudyPreferences: async () => ({
            learningLanguages: ["ja", "en"],
        }),
        fetchLibrarySchemas: async () => schemas,
        fetchLibraryPushRequests: async () => pending,
        fetchSearchableDictionaryProviders: async () => [],
        escapeHtml: String,
        buildLibraryUrl: () => "/study/library",
        isAdminScope: () => admin,
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
                "./navigation-client.js": context,
                "/static/reuse/offline-state.js": {
                    isOffline: () => context.offline === true,
                },
                "./reuse/explore.js": context,
                "/static/reuse/mount-scope.js": context,
                "/static/reuse/toast.js": context,
                "/static/reuse/form-builder.js": context,
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

test("Study management links follow connectivity while Explore remains available", async () => {
    const context = navigationContext({
        admin: true,
        routes: [
            {
                base: "/study/library",
                id: "study-library-page",
                navigationLabels: { en: "Library" },
            },
            { base: "/study/explore" },
        ],
    });
    const model = await context.loadStudySubNavigationModel({
        fallbackLanguageCode: "ja",
    });
    const english = localeStrings("en");
    const slot = context.createStudySubNavigationSlot(model, {
        t: (key) => {
            const text = english.get(key);
            assert.ok(text, key);
            return text;
        },
    });
    assert.match(slot.render(), /href="\/study\/library"/);
    context.offline = true;
    assert.match(slot.render(), /href="\/study\/library" aria-disabled="true"/);
    assert.doesNotMatch(slot.render(), /href="\/study\/explore" aria-disabled/);
    assert.match(slot.render(), /href="\/study\/explore"/);
    const offline = await context.loadStudySubNavigationModel({
        fallbackLanguageCode: "ja",
    });
    assert.deepEqual(
        Array.from(offline.modules, (page) => page.id),
        Array.from(model.modules, (page) => page.id),
    );
    context.offline = false;
    assert.match(slot.render(), /href="\/study\/library"/);
    assert.doesNotMatch(slot.render(), /aria-disabled="true"/);
});

test("an already mounted Study menu disables management links on disconnect and cleans up its listener", () => {
    const context = navigationContext();
    const events = new EventTarget();
    context.window.addEventListener = events.addEventListener.bind(events);
    const root = new EventTarget();
    const attributes = new Map();
    const link = {
        dataset: {},
        hidden: false,
        getAttribute: (name) =>
            name === "href" ? "/study/library" : attributes.get(name),
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: (name) => attributes.delete(name),
    };
    root.querySelectorAll = () => [link];
    const scope = new AbortController();
    context.bindStudySubNavigation(root, { signal: scope.signal });
    assert.equal(attributes.has("aria-disabled"), false);
    context.offline = true;
    events.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.equal(attributes.get("aria-disabled"), "true");
    assert.equal(link.hidden, false);
    context.offline = false;
    events.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.equal(attributes.has("aria-disabled"), false);
    scope.abort();
    context.offline = true;
    events.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.equal(attributes.has("aria-disabled"), false);
});

test("disabled Study language links cannot bypass the router through their stateful navigation handler", () => {
    const context = navigationContext();
    const events = new EventTarget();
    context.window.addEventListener = events.addEventListener.bind(events);
    const listeners = new Map();
    const root = {
        querySelectorAll: () => [],
        addEventListener: (name, listener) => listeners.set(name, listener),
    };
    const navigated = [];
    context.uiCtx.capabilities.get =
        () =>
        (...args) =>
            navigated.push(args);
    const scope = new AbortController();
    context.bindStudySubNavigation(root, { signal: scope.signal });
    let disabled = true;
    const link = {
        dataset: { languageCode: "ja" },
        getAttribute: (name) =>
            name === "aria-disabled"
                ? String(disabled)
                : "/study/explore/ja/kanji",
    };
    const event = {
        target: {
            closest: (selector) =>
                selector === "a[data-language-code]" ? link : null,
        },
        preventDefault() {},
        stopPropagation() {},
    };
    listeners.get("click")(event);
    assert.equal(navigated.length, 0);
    disabled = false;
    listeners.get("click")(event);
    assert.equal(navigated.length, 1);
    assert.equal(navigated[0][0], "/study/explore/ja/kanji");
    scope.abort();
});
