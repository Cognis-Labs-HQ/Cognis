import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { formatTemplate } from "../../../../ui/reuse/format-template.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import { replaceMountScope } from "../../../../ui/reuse/mount-scope.js";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import {
    createPracticeSession,
    resumePracticeSession,
} from "../ui/app/practice-session.js";
import {
    flashcardsRoute,
    deckMatchesLanguage,
    deckRouteKey,
} from "../ui/app/language.js";
import { languageFlashcardsUrl } from "../../../../gateways/study/ui/reuse/explore.js";

function source(relative) {
    return readFileSync(new URL(relative, import.meta.url), "utf8")
        .replace(/^import[\s\S]*?;\n/gm, "")
        .replaceAll("export async function", "async function")
        .replaceAll("export function", "function")
        .replaceAll("export const", "const");
}

test("Back from Explore remounts the complete locked-mode deck at the saved card with working Previous and Next", async () => {
    const cards = ["one", "two", "three"].map((id) => ({
        entry: { id, schemaId: "ja", label: id },
    }));
    const deck = {
        id: "deck-id",
        name: "First Words Renamed",
        language: "ja",
        entryIds: cards.map(({ entry }) => entry.id),
        notes: [],
        progress: {},
    };
    const nodes = new Map();
    const listeners = new Map();
    const root = {
        querySelector(selector) {
            if (!nodes.has(selector))
                nodes.set(selector, { innerHTML: "", hidden: false });
            return nodes.get(selector);
        },
        querySelectorAll: () => [],
        addEventListener(type, handler) {
            listeners.set(type, handler);
        },
    };
    const history = {
        state: { routerIndex: 7 },
        replaceState(state) {
            this.state = JSON.parse(JSON.stringify(state));
        },
    };
    const location = { pathname: "/study/ja/flashcards/first-words--deck-id" };
    const mounts = [];
    let choices = 0;
    const reviews = [];
    const queueCalls = [];
    const menus = [];
    const navigations = [];
    const environment = vm.createContext({
        AbortController,
        uiCtx,
        replaceMountScope,
        createPracticeSession,
        resumePracticeSession,
        flashcardsRoute,
        deckMatchesLanguage,
        deckRouteKey,
        languageFlashcardsUrl,
        history,
        location,
        window: { addEventListener() {} },
        document: { documentElement: { lang: "en" } },
        createI18n: async () => ({ t: (key) => key }),
        applyDocumentTitle() {},
        loadStudySubNavigationModel: async () => ({
            selectedLanguageCode: "ja",
        }),
        fetchStudyDecks: async () => [deck],
        fetchLibrarySchemas: async () => [{ id: "ja", language: "ja" }],
        loadDeckTemplates: async () => ({
            completion: readFileSync(
                new URL("../ui/templates/gallery.html", import.meta.url),
                "utf8",
            ).match(
                /<template data-deck-template="completion">([\s\S]*?)<\/template>/,
            )[1],
        }),
        fetchStudyDeck: async () => ({ deck, cards }),
        loadFavourites: async () => ({ bind() {} }),
        createSideMenu: (options) => {
            menus.push(options);
            return { render: () => "deck menu", mount() {} };
        },
        navigateTo: async (url) => navigations.push(url),
        createPageComposer: (_root, options) => ({
            getFloatingSlot: () => ({}),
            init: async () => {
                assert.equal(options.toolbar[0].render(), "deck menu");
                assert.equal(options.toolbarScrollable, false);
                root.querySelector("[data-study-deck]").innerHTML =
                    "<section data-study-session></section>";
            },
        }),
        bindStudySubNavigation() {},
        renderDeckDetail: () => "<section data-study-session></section>",
        createPracticeModePreference: async ({ mode }) => {
            choices++;
            return {
                value: mode ?? "writing",
                id: "mode",
                render: () => "",
                mount() {},
            };
        },
        fetchLibraryLocations: async () => ({ readable: [] }),
        noteDetails: () => [],
        practiceQueue: (all, progress, filter) => {
            queueCalls.push({ progress, filter });
            return filter === "new"
                ? all.filter(({ entry }) => !progress[entry.id])
                : all;
        },
        practiceSummary: () => ({}),
        mountPractice: (_target, options) => {
            mounts.push(options);
            return () => {};
        },
        reviewStudyCard: async (_deckId, entryId, grade) => {
            reviews.push({ entryId, grade });
            deck.progress[entryId] = { due: "2099-01-01" };
            return deck;
        },
        escapeHtml,
        formatTemplate,
        mountWhenDirect: async () => {},
        showToast: () => assert.fail("Unexpected deck failure"),
    });
    vm.runInContext(
        source("../../../../gateways/study/ui/reuse/action-flows.js"),
        environment,
    );
    vm.runInContext(source("../ui/app/actions.js"), environment);
    await vm.runInContext(
        `(async () => { ${source("../ui/app/index.js")}; globalThis.mountDeck = mount; })()`,
        environment,
    );
    vm.runInContext(
        source("../ui/app/markup.js").slice(
            source("../ui/app/markup.js").indexOf(
                "function renderDeckCompletion",
            ),
        ),
        environment,
    );
    await environment.mountDeck(root);
    assert.equal(mounts.at(-1).detail.entry.id, "one");
    assert.equal(mounts.at(-1).mode, "writing");
    await mounts.at(-1).onNext("good");
    assert.equal(mounts.at(-1).detail.entry.id, "two");
    await mounts.at(-1).onAnswer("again");
    await mounts.at(-1).onDeparture("again");
    const savedHistory = JSON.parse(JSON.stringify(history.state));
    assert.equal(savedHistory.routerIndex, 7);
    history.state = { studyEntryId: "two" };
    location.pathname = "/study/explore/ja/kanji";
    history.state = savedHistory;
    location.pathname = "/study/ja/flashcards/first-words--deck-id";
    await environment.mountDeck(root);
    assert.equal(menus.at(-1).activeId, deck.id);
    assert.equal(menus.at(-1).groups[0].collapsible, false);
    assert.equal(menus.at(-1).groups[0].items[0].id, "all");
    await menus.at(-1).onSelect("all");
    assert.equal(navigations.at(-1), "/study/ja/flashcards");
    assert.equal(menus.at(-1).groups[0].items[1].label, deck.name);
    await menus.at(-1).onSelect(deck.id);
    assert.equal(
        navigations.at(-1),
        "/study/ja/flashcards/first-words-renamed--deck-id",
    );
    assert.equal(choices, 2);
    assert.equal(mounts.at(-1).mode, "writing");
    assert.equal(mounts.at(-1).detail.entry.id, "two");
    assert.equal(mounts.at(-1).answeredGrade, "again");
    assert.deepEqual(Array.from(mounts.at(-1).navigationEntryIds), [
        "one",
        "two",
        "three",
    ]);
    assert.equal(typeof mounts.at(-1).onPrevious, "function");
    await mounts.at(-1).onNext("again");
    assert.equal(mounts.at(-1).detail.entry.id, "three");
    mounts.at(-1).onPrevious();
    assert.equal(mounts.at(-1).detail.entry.id, "two");
    assert.deepEqual(reviews, [
        { entryId: "one", grade: "good" },
        { entryId: "two", grade: "again" },
    ]);
    await mounts.at(-1).onNext("again");
    await mounts.at(-1).onNext("good");
    const completed = root.querySelector("[data-study-session]").innerHTML;
    assert.match(completed, /study-deck-completion-check/);
    assert.match(completed, /data-practice-restart/);
    assert.match(completed, /ui.reuse.home/);
    const completedFilter = history.state.studyDeckSession.filter;
    const reviewsBeforeRetry = reviews.length;
    await listeners.get("click")({
        target: {
            closest: (selector) =>
                selector === "[data-practice-restart]" ? {} : null,
        },
    });
    assert.equal(mounts.at(-1).detail.entry.id, "one");
    assert.equal(mounts.at(-1).answeredGrade, undefined);
    assert.equal(history.state.studyDeckSession.filter, completedFilter);
    assert.equal(history.state.studyDeckSession.index, 0);
    assert.equal(reviews.length, reviewsBeforeRetry);
    assert.equal(queueCalls.at(-1).progress, deck.progress);
    assert.equal(queueCalls.at(-1).filter, completedFilter);
    // A focused New queue becomes empty after review; retry must not replay it.
    const filterButton = { dataset: { practiceFilter: "new" } };
    await listeners.get("click")({
        target: {
            closest: (selector) =>
                selector === "[data-practice-filter]" ? filterButton : null,
        },
    });
    const mountCount = mounts.length;
    await listeners.get("click")({
        target: {
            closest: (selector) =>
                selector === "[data-practice-restart]" ? {} : null,
        },
    });
    assert.equal(mounts.length, mountCount);
    assert.equal(queueCalls.at(-1).filter, "new");
    assert.equal(history.state.studyDeckSession.filter, "new");
    assert.deepEqual(history.state.studyDeckSession.cardIds, []);
    const home = { dataset: { deckAction: "browse" }, disabled: false };
    await listeners.get("click")({
        target: {
            closest: (selector) =>
                selector === "[data-deck-action]" ? home : null,
        },
    });
    assert.equal(navigations.at(-1), "/study/ja/flashcards");
});
