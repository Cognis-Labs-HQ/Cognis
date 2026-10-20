import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("a directly opened Explore card path opens the requested preview without history state", async () => {
    const schema = { id: "ja", language: "ja" };
    const layer = { id: "words", navigationSlug: "vocabulary" };
    const entry = { id: "requested-card", schemaId: "ja", layer: "words" };
    const opened = [];
    const fetched = [];
    const source = readFileSync(
        new URL("../ui/app/layer/index.js", import.meta.url),
        "utf8",
    )
        .replace(/^import[\s\S]*?;\n/gm, "")
        .replace("export async function mount", "async function mount");
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
    const navigationSource = readFileSync(
        new URL(
            "../../../../gateways/study/ui/sub-navigation.js",
            import.meta.url,
        ),
        "utf8",
    ).replace(/export (async )?function/g, "$1function");
    vm.runInContext(
        navigationSource.slice(
            navigationSource.indexOf("function createStudySubNavigationSlot"),
            navigationSource.indexOf("function renderStudySubNavigation"),
        ),
        context,
    );
    await vm.runInContext(
        `(async () => { ${source}; globalThis.mountLayer = mount; })()`,
        context,
    );
    await context.mountLayer({ querySelectorAll: () => [] });
    assert.deepEqual(fetched, [entry.id]);
    assert.equal(opened[0][1], entry);
    assert.equal(opened[0][5], "ja");
});
