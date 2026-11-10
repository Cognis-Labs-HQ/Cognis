import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost } from "../../../../ui/reuse/tutorials/tests/fixtures/host.js";
import { registerScopedUiActions } from "../../../../ui/reuse/scoped-actions.js";
import { mountTutorialProvider } from "../../../../ui/reuse/tutorials/pages.js";
import { exploreLayers } from "../../../../gateways/study/ui/reuse/explore.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { exploreWalkthrough } from "../ui/tutorials/walkthrough.js";
import { canCreateLayerEntries } from "../ui/app/editability.js";
import { guides } from "../ui/app/guides.js";

function fixture(context) {
    const host = tutorialHost();
    const controller = new AbortController();
    context.after(() => {
        controller.abort();
        host.dispose();
        delete globalThis.document;
    });
    const { ctx, document, window, api } = host;
    ctx.signal = controller.signal;
    window.location.pathname = "/study";
    const element = host.element();
    document.querySelector = () => element;
    document.querySelectorAll = () => [element];
    document.body = {
        ...element,
        ownerDocument: document,
        querySelectorAll: () => [element],
    };
    document.documentElement = { lang: "en" };
    globalThis.document = document;
    const enrolled = new Set(["en", "ja"]);
    const catalogs = [];
    ctx.capabilities.contribute("session:isAuthenticated", () => true);
    ctx.capabilities.contribute("ui:scopedActions", registerScopedUiActions);
    ctx.capabilities.contribute("ui:reuse", {
        importModule: async (name) => {
            if (name === "tutorials/pages.js") return { mountTutorialProvider };
            if (name === "i18n.js")
                return {
                    createI18n: async () => ({ t: (key) => key }),
                    extendI18n: async (base, urls) => {
                        catalogs.push(urls);
                        return base;
                    },
                };
            throw Error(name);
        },
    });
    let routes = 0;
    ctx.capabilities.contribute("study:tutorialTargets", {
        isEnrolled: (language) => enrolled.has(language),
        matchesPage: ({ pathname }) => pathname === "/study",
        route: async ({ language }) => {
            routes++;
            return `/study/explore/${language}/alphabet`;
        },
    });
    const { mountProvider } = loadTestModule(
        new URL("../ui/tutorials/provider.js", import.meta.url),
        {
            "./walkthrough.js": { exploreWalkthrough },
            "../app/guides.js": { guides },
            "/static/gateways/study/library-client.js": {
                fetchLibrarySchemas: async () => [],
            },
            "/static/gateways/study/reuse/explore.js": { exploreLayers },
            "../app/editability.js": { canCreateLayerEntries },
        },
        { window, document, AbortSignal },
    );
    const register = (language, signal = controller.signal) =>
        ctx.capabilities.get("study:libraryTutorials").register({
            owner: `module.study-language-${language}`,
            id: "introduction",
            language,
            titleKey: `module.study-language-${language}.tutorial.title`,
            stringsBaseUrls: [
                `/static/modules/study-language-${language}/languages`,
            ],
            signal,
        });
    const list = async (pathname) => {
        window.location.pathname = pathname;
        return api.list({ page: { pathname } });
    };
    return {
        ...host,
        mount: () => mountProvider(ctx),
        register,
        list,
        enrolled,
        catalogs,
        routes: () => routes,
    };
}

test("language guides replace generic Explore only for an enrolled active language; overview discovery never navigates", async (context) => {
    const host = fixture(context);
    await host.mount();
    assert.deepEqual(
        (await host.list("/study/explore/en/alphabet")).map((x) => x.id),
        ["study.library.pages:explore"],
    );
    await host.register("en");
    await host.register("ja");
    const overview = await host.list("/study");
    assert.equal(overview.length, 2);
    assert.ok(overview.every((x) => x.automatic === false));
    assert.equal(host.routes(), 0);
    const active = await host.list("/study/explore/ja/kanji");
    assert.deepEqual(
        active.map((x) => x.id),
        ["module.study-language-ja:introduction"],
    );
    assert.notEqual(active[0].automatic, false);
    assert.equal(host.routes(), 0);
    host.enrolled.delete("ja");
    assert.deepEqual(
        (await host.list("/study/explore/ja/kanji")).map((x) => x.id),
        ["study.library.pages:explore"],
    );
    assert.ok(host.events.includes("study.library:tutorials:register"));
    assert.ok(
        host.catalogs.some(
            (urls) =>
                urls.includes("/static/modules/study-language-ja/languages") &&
                urls.includes("/static/adapters/study/library/languages"),
        ),
    );
});

test("duplicate language registrations fail without losing the guide; provider removal restores generic Explore", async (context) => {
    const host = fixture(context);
    await host.mount();
    const lifetime = new AbortController();
    await host.register("en", lifetime.signal);
    await assert.rejects(
        host.register("en"),
        /invalid_library_tutorial_language/,
    );
    assert.equal(
        (await host.list("/study/explore/en/words"))[0].id,
        "module.study-language-en:introduction",
    );
    lifetime.abort();
    assert.deepEqual(
        (await host.list("/study/explore/en/words")).map((x) => x.id),
        ["study.library.pages:explore"],
    );
    await host.register("en");
    assert.equal(
        (await host.list("/study/explore/en/words"))[0].id,
        "module.study-language-en:introduction",
    );
});
