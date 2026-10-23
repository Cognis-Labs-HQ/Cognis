import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { uiCtx } from "../../../ui/reuse/ui-ctx.js";
import { createProviderLifecycle } from "../../../ui/reuse/provider-lifecycle.js";

async function fixture(
    t,
    { languages = [], searchFails = false, responseOk = true } = {},
) {
    const links = new Map();
    let searchRegistered = false;
    let loads = 0;
    const navbar = {
        contribute(id, link) {
            assert.equal(links.has(id), false);
            links.set(id, link);
            return () => links.delete(id);
        },
    };
    uiCtx.capabilities.contribute("ui:navbarLinks", navbar);
    t.after(() => uiCtx.capabilities.remove("ui:navbarLinks", navbar));
    const context = vm.createContext({
        apiFetch: async (url, { signal }) => {
            assert.equal(url, "/api/v1/study/registered-languages");
            assert.equal(signal.aborted, false);
            loads++;
            return { ok: responseOk, json: async () => ({ data: languages }) };
        },
        createI18n: async () => ({
            t: (key) =>
                ({
                    "ui.reuse.study": "Lernen",
                    "gateway.study.no_languages": "Keine Sprachen",
                })[key],
        }),
        registerSearchIndexing: () => {
            if (searchFails) throw new Error("search_registration_failed");
            searchRegistered = true;
            return () => {
                searchRegistered = false;
            };
        },
    });
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/navbar.js", import.meta.url),
            {
                "/static/reuse/api-client.js": context,
                "/static/reuse/i18n.js": context,
                "./search/index.js": context,
            },
            context,
        ),
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => ({ mountProvider: context.mountProvider }),
    });
    t.after(() => lifecycle.reconcile([]));
    return {
        links,
        context,
        lifecycle,
        loads: () => loads,
        searchRegistered: () => searchRegistered,
    };
}

for (const languages of [[], [{ code: "ja" }]]) {
    test(`Study navigation uses a localized host contribution with ${languages.length} languages and releases it on disable`, async (t) => {
        const state = await fixture(t, { languages });
        const providers = [{ scriptUrl: "/study/navbar.js" }];
        await state.lifecycle.reconcile(providers);
        assert.equal(state.loads(), 1);
        assert.equal(state.links.get("study").label, "Lernen");
        assert.equal(state.links.get("study").href, "/study");
        assert.equal(state.links.get("study").disabled, languages.length === 0);
        assert.equal(
            state.links.get("study").title,
            languages.length ? "" : "Keine Sprachen",
        );
        assert.equal(state.searchRegistered(), true);
        assert.equal(state.context.__studyGatewayAvailable, true);
        await state.lifecycle.reconcile(providers);
        assert.equal(state.loads(), 1);
        await state.lifecycle.reconcile([]);
        assert.equal(state.links.size, 0);
        assert.equal(state.searchRegistered(), false);
        assert.equal(state.context.__studyGatewayAvailable, false);
        await state.lifecycle.reconcile(providers);
        assert.equal(state.loads(), 2);
        assert.equal(state.links.size, 1);
    });
}

test("failed Study navigation initialization rolls back its contributed link", async (t) => {
    const state = await fixture(t, { searchFails: true });
    await assert.rejects(
        state.lifecycle.reconcile([{ scriptUrl: "/study/navbar.js" }]),
        /search_registration_failed/,
    );
    assert.equal(state.links.size, 0);
    assert.equal(state.searchRegistered(), false);
});

test("a failed registered-language read refuses to publish a misleading navigation state", async (t) => {
    const state = await fixture(t, { responseOk: false });
    await assert.rejects(
        state.lifecycle.reconcile([{ scriptUrl: "/study/navbar.js" }]),
        /study_navigation_languages_unavailable/,
    );
    assert.equal(state.links.size, 0);
});
