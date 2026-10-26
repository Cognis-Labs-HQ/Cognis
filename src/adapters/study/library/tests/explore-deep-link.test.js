import {
    loadTestModule,
    importTestModule,
} from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

test("a directly opened Explore card path opens the requested preview without history state", async () => {
    const schema = { id: "ja", language: "ja" };
    const layer = { id: "words", navigationSlug: "vocabulary" };
    const entry = { id: "requested-card", schemaId: "ja", layer: "words" };
    const opened = [];
    const fetched = [];
    const context = vm.createContext({
        window: {
            location: {
                pathname: "/study/explore/ja/vocabulary/requested-card",
            },
        },
        history: { state: null },
        document: { documentElement: { lang: "en" } },
        createI18n: async () => ({ t: (key) => key }),
        loadStudySubNavigationModel: async () => ({
            selectedLanguageCode: "ja",
        }),
        loadLibrary: async () => ({ schemas: [schema], entries: [] }),
        exploreLayers: () => [{ schema, layer }],
        localizedLabel: () => "Vocabulary",
        createSideMenu: () => ({ render: () => "", mount() {} }),
        loadLibraryRequests: async () => [],
        fetchLibraryForms: async () => [],
        canCreateLayerEntries: () => false,
        applyDocumentTitle() {},
        createPageComposer: () => ({ init: async () => {} }),
        librarySelectionFloatingMenu: () => [],
        bindStudySubNavigation() {},
        bindLibraryInteractions() {},
        fetchLibraryEntry: async (id) => {
            fetched.push(id);
            return { entry };
        },
        openEntryPopup: async (...args) => opened.push(args),
        mountWhenDirect: async () => {},
    });
    context.createStudySubNavigationSlot = loadTestModule(
        new URL(
            "../../../../gateways/study/ui/sub-navigation.js",
            import.meta.url,
        ),
        {
            "./navigation-client.js": {
                fetchStudyPreferences: () => {
                    throw new Error("unexpected_study_preferences_read");
                },
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
    ).createStudySubNavigationSlot;
    context.mountLayer = (
        await importTestModule(
            new URL("../ui/app/layer/index.js", import.meta.url),
            {
                "/static/gateways/study/offline-content.js": {
                    readStudySnapshot: (load) => load(),
                    showOfflineContentNotice: () =>
                        assert.fail("cached entry must open"),
                },
                "/static/gateways/study/reuse/explore.js": {
                    exploreLayers: context.exploreLayers,
                },
                "../entry-popup.js": { openEntryPopup: context.openEntryPopup },
                "/static/gateways/study/library-client.js": {
                    fetchLibraryEntry: context.fetchLibraryEntry,
                    fetchLibraryForms: context.fetchLibraryForms,
                },
                "/static/reuse/side-menu.js": {
                    createSideMenu: context.createSideMenu,
                },
                "/static/reuse/app-router.js": {
                    navigateTo: context.navigateTo,
                },
                "/static/reuse/i18n.js": {
                    createI18n: context.createI18n,
                    applyDocumentTitle: context.applyDocumentTitle,
                },
                "/static/reuse/page-composer/index.js": {
                    createPageComposer: context.createPageComposer,
                },
                "/static/reuse/page-entry.js": {
                    mountWhenDirect: context.mountWhenDirect,
                },
                "/static/gateways/study/sub-navigation.js": {
                    bindStudySubNavigation: context.bindStudySubNavigation,
                    loadStudySubNavigationModel:
                        context.loadStudySubNavigationModel,
                    readSelectedStudyLanguageCode:
                        context.readSelectedStudyLanguageCode,
                    createStudySubNavigationSlot:
                        context.createStudySubNavigationSlot,
                },
                "../data.js": { loadLibrary: context.loadLibrary },
                "../layer-cards.js": { renderBrowser: context.renderBrowser },
                "../filters.js": {
                    refreshLibraryFilterResults:
                        context.refreshLibraryFilterResults,
                },
                "../interactions.js": {
                    bindLibraryInteractions: context.bindLibraryInteractions,
                },
                "../presentation.js": {
                    localizedLabel: context.localizedLabel,
                },
                "../selection.js": {
                    librarySelectionFloatingMenu:
                        context.librarySelectionFloatingMenu,
                },
                "../create-entry/index.js": {
                    chooseCreateLayer: context.chooseCreateLayer,
                    openCreateEntryPopup: context.openCreateEntryPopup,
                },
                "/static/reuse/ui-ctx.js": { uiCtx: context.uiCtx },
                "../requests.js": {
                    loadLibraryRequests: context.loadLibraryRequests,
                },
                "../editability.js": {
                    canCreateLayerEntries: context.canCreateLayerEntries,
                },
            },
            context,
        )
    ).mount;
    await context.mountLayer({ querySelectorAll: () => [] });
    assert.deepEqual(fetched, [entry.id]);
    assert.equal(opened[0][1], entry);
    assert.equal(opened[0][5], "ja");
});
