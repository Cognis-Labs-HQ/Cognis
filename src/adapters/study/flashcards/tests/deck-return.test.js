import * as offlineState from "../../../../ui/reuse/offline-state.js";
import {
    loadTestModule,
    importTestModule,
} from "../../../../tooling/reuse/test-module.ts";
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
    const scrolls = [];
    const nodes = new Map();
    const listeners = new Map();
    const root = {
        querySelector(selector) {
            if (!nodes.has(selector))
                nodes.set(selector, {
                    innerHTML: "",
                    hidden: false,
                    scrollIntoView: (options) =>
                        scrolls.push({ selector, ...options }),
                });
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
        loadDeckTemplates: async () =>
            Object.fromEntries(
                [
                    ...readFileSync(
                        new URL(
                            "../ui/templates/gallery.html",
                            import.meta.url,
                        ),
                        "utf8",
                    ).matchAll(
                        /<template data-deck-template="([^"]+)">([\s\S]*?)<\/template>/g,
                    ),
                ].map((match) => [match[1], match[2]]),
            ),
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
                assert.equal(options.toolbarScrollable, true);
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
                setWritingAvailable() {},
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
        supportsDeckWriting: () => true,
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
    environment.createStudySubNavigationSlot = loadTestModule(
        new URL(
            "../../../../gateways/study/ui/sub-navigation.js",
            import.meta.url,
        ),
        {
            "/static/reuse/offline-state.js": offlineState,
            "./navigation-client.js": {
                fetchStudyPreferences: () => {
                    throw new Error("unexpected_study_preferences_read");
                },
            },
            "./reuse/explore.js": environment,
            "/static/reuse/mount-scope.js": environment,
            "/static/reuse/toast.js": environment,
            "/static/reuse/form-builder.js": environment,
            "/static/reuse/escape-html.js": environment,
            "/static/reuse/ui-ctx.js": environment,
            "/static/reuse/spa-route-registry.js": environment,
            "/static/gateways/study/language.js": environment,
            "/static/gateways/study/library-client.js": environment,
        },
        environment,
    ).createStudySubNavigationSlot;
    Object.assign(
        environment,
        loadTestModule(
            new URL(
                "../../../../gateways/study/ui/reuse/action-flows.js",
                import.meta.url,
            ),
            {
                "/static/reuse/ui-ctx.js": environment,
            },
            environment,
        ),
    );
    Object.assign(
        environment,
        loadTestModule(
            new URL("../ui/app/actions.js", import.meta.url),
            {
                "/static/gateways/study/reuse/action-flows.js": environment,
            },
            environment,
        ),
    );
    environment.renderDeckCompletion = loadTestModule(
        new URL("../ui/app/markup.js", import.meta.url),
        {
            "../reuse/review.js": environment,
            "/static/reuse/format-template.js": environment,
            "/static/reuse/escape-html.js": environment,
            "/static/gateways/study/reuse/favourites.js": environment,
        },
        environment,
    ).renderDeckCompletion;
    environment.mountDeck = (
        await importTestModule(
            new URL("../ui/app/index.js", import.meta.url),
            {
                "/static/reuse/offline-state.js": offlineState,
                "/static/gateways/study/offline-page.js": {
                    mountOfflineStudyPage: () =>
                        assert.fail("cached content must mount normally"),
                },
                "/static/gateways/study/offline-content.js": {
                    readStudySnapshot: (load) => load(),
                    showOfflineContentNotice: () =>
                        assert.fail("unexpected cache miss"),
                    isOfflineContentMiss: () => false,
                },
                "./deck-editor.js": { editDeck: environment.editDeck },
                "/static/reuse/collection-view.js": {
                    sortItems: environment.sortItems,
                    filterItems: environment.filterItems,
                },
                "../reuse/practice-mode.js": {
                    createPracticeModePreference:
                        environment.createPracticeModePreference,
                },
                "./practice-session.js": {
                    createPracticeSession: environment.createPracticeSession,
                    resumePracticeSession: environment.resumePracticeSession,
                },
                "/static/gateways/study/reuse/explore.js": {
                    languageFlashcardsUrl: environment.languageFlashcardsUrl,
                },
                "./language.js": {
                    flashcardsRoute: environment.flashcardsRoute,
                    deckMatchesLanguage: environment.deckMatchesLanguage,
                    deckRouteKey: environment.deckRouteKey,
                },
                "./practice-model.js": {
                    practiceSummary: environment.practiceSummary,
                    practiceQueue: environment.practiceQueue,
                    supportsDeckWriting: environment.supportsDeckWriting,
                },
                "./practice.js": { mountPractice: environment.mountPractice },
                "./actions.js": { runDeckAction: environment.runDeckAction },
                "./markup.js": {
                    loadDeckTemplates: environment.loadDeckTemplates,
                    renderDeckBrowser: environment.renderDeckBrowser,
                    renderDeckDetail: environment.renderDeckDetail,
                    renderDeckPreviews: environment.renderDeckPreviews,
                    renderDeckCompletion: environment.renderDeckCompletion,
                },
                "/static/reuse/mount-scope.js": {
                    replaceMountScope: environment.replaceMountScope,
                },
                "/static/gateways/study/reuse/favourites.js": {
                    loadFavourites: environment.loadFavourites,
                },
                "/static/reuse/ui-ctx.js": { uiCtx: environment.uiCtx },
                "/static/reuse/i18n.js": {
                    createI18n: environment.createI18n,
                    applyDocumentTitle: environment.applyDocumentTitle,
                },
                "/static/reuse/side-menu.js": {
                    createSideMenu: environment.createSideMenu,
                },
                "/static/reuse/page-composer/index.js": {
                    createPageComposer: environment.createPageComposer,
                },
                "/static/reuse/page-entry.js": {
                    mountWhenDirect: environment.mountWhenDirect,
                },
                "/static/reuse/popup.js": { openPopup: environment.openPopup },
                "/static/reuse/escape-html.js": {
                    escapeHtml: environment.escapeHtml,
                },
                "/static/reuse/toast.js": { showToast: environment.showToast },
                "/static/reuse/app-router.js": {
                    navigateTo: environment.navigateTo,
                },
                "/static/gateways/study/sub-navigation.js": {
                    loadStudySubNavigationModel:
                        environment.loadStudySubNavigationModel,
                    createStudySubNavigationSlot:
                        environment.createStudySubNavigationSlot,
                    bindStudySubNavigation: environment.bindStudySubNavigation,
                    readSelectedStudyLanguageCode:
                        environment.readSelectedStudyLanguageCode,
                },
                "/static/gateways/study/library-client.js": {
                    fetchLibraryLocations: environment.fetchLibraryLocations,
                    fetchLibrarySchemas: environment.fetchLibrarySchemas,
                    fetchLibraryEntries: environment.fetchLibraryEntries,
                },
                "../decks-client.js": {
                    fetchStudyDecks: environment.fetchStudyDecks,
                    fetchStudyDeck: environment.fetchStudyDeck,
                    deleteStudyDeck: environment.deleteStudyDeck,
                    reviewStudyCard: environment.reviewStudyCard,
                },
                "../reuse/flashcard.js": {
                    flashcardValues: environment.flashcardValues,
                    noteDetails: environment.noteDetails,
                },
                "../anki.js": { exportAnkiNotes: environment.exportAnkiNotes },
            },
            environment,
        )
    ).mount;
    await environment.mountDeck(root);
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].selector, "[data-study-deck]");
    assert.equal(scrolls[0].block, "start");
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
    assert.equal(scrolls.length, 1);
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
    assert.doesNotMatch(
        root.querySelector("[data-study-session]").innerHTML,
        /data-practice-restart/,
    );
    assert.match(
        root.querySelector("[data-study-session]").innerHTML,
        /ui.reuse.home/,
    );
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
