import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost } from "../../../ui/reuse/tutorials/tests/fixtures/host.js";
import { registerScopedUiActions } from "../../../ui/reuse/scoped-actions.js";
import { mountTutorialProvider } from "../../../ui/reuse/tutorials/pages.js";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import * as explore from "../ui/reuse/explore.js";
import { guides } from "../ui/guides.js";

for (const dictionary of [true, false]) {
    test(`Study overview replays on Explore with ${dictionary ? "four" : "three"} available navigation targets`, async (context) => {
        let navigations = 0;
        const host = tutorialHost({
            openPage: () => {
                navigations++;
            },
        });
        const controller = new AbortController();
        context.after(() => {
            controller.abort();
            host.dispose();
            delete globalThis.document;
        });
        const providerCtx = { ...host.ctx, signal: controller.signal };
        host.ctx.capabilities.remove("ui:tutorials", host.api);
        host.ctx.capabilities.contribute("ui:tutorials", {
            ...host.api,
            owner: (id, options) =>
                host.api.owner(id, { ...options, i18n: { t: (key) => key } }),
        });
        host.window.location.pathname = "/study/explore/cy/symbols";
        const selectors = [
            ".study-subnav-modules",
            ".study-subnav-language-options",
            "[data-study-settings]",
        ];
        if (dictionary) selectors.push("[data-study-dictionary-search]");
        const targets = new Map(
            selectors.map((selector) => [selector, host.element()]),
        );
        host.document.querySelector = (selector) =>
            targets.get(selector) ?? null;
        host.document.querySelectorAll = (selector) =>
            targets.has(selector) ? [targets.get(selector)] : [];
        host.document.documentElement = { lang: "en" };
        host.document.body = {
            ...host.element(),
            querySelectorAll: host.document.querySelectorAll,
            contains: () => true,
        };
        globalThis.document = host.document;
        host.ctx.capabilities.contribute("session:isAuthenticated", () => true);
        host.ctx.capabilities.contribute("ui:navigate", () => {
            navigations++;
        });
        host.ctx.capabilities.contribute("study:navigation", {
            isEnrolled: (language) => ["cy", "fi"].includes(language),
        });
        host.ctx.capabilities.contribute(
            "ui:scopedActions",
            registerScopedUiActions,
        );
        host.ctx.capabilities.contribute("ui:reuse", {
            importModule: async (name) => {
                if (name === "tutorials/pages.js")
                    return { mountTutorialProvider };
                if (name === "i18n.js")
                    return {
                        createI18n: async () => ({ t: (key) => key }),
                        extendI18n: async (base) => base,
                    };
                throw new Error(name);
            },
        });
        const provider = loadTestModule(
            new URL("../ui/tutorials.js", import.meta.url),
            {
                "/static/reuse/transient-surfaces.js": {
                    transientSurfaces: { attachLifetime: () => true },
                },
                "./guides.js": { guides },
                "./library-client.js": { fetchLibrarySchemas: async () => [] },
                "./reuse/explore.js": explore,
            },
            { document: host.document, window: host.window },
        );
        const dispose = await provider.mountProvider(providerCtx);
        context.after(dispose);
        const available = await host.api.list({
            page: { pathname: host.window.location.pathname },
        });
        assert.deepEqual(
            available.map(({ id }) => id),
            ["study:getting-started"],
        );
        assert.equal(available[0].automatic, false);
        assert.equal(navigations, 0);
        const languageTargets = host.ctx.capabilities.get(
            "study:tutorialTargets",
        );
        assert.equal(
            languageTargets.matchesPage({
                pathname: host.window.location.pathname,
                language: "cy",
            }),
            true,
        );
        assert.equal(
            languageTargets.matchesPage({
                pathname: host.window.location.pathname,
                language: "fi",
            }),
            false,
        );
        for (const replay of [false, true]) {
            const session = await host.api.start("study:getting-started");
            await session.ready;
            assert.equal(session.state().total, selectors.length);
            assert.equal(session.state().stepId, "navigation");
            await session.next();
            assert.equal(session.state().stepId, "languages");
            await session.back();
            assert.equal(session.state().stepId, "navigation");
            await session.restart();
            assert.equal(session.state().stepId, "navigation");
            for (let index = 0; index < selectors.length; index++)
                await session.next();
            assert.equal((await session.finished).status, "completed");
            assert.equal(
                navigations,
                0,
                `Replay ${replay} must stay on the current layer`,
            );
        }
        const pending = await host.api.start("study:getting-started");
        await pending.ready;
        controller.abort();
        assert.equal((await pending.finished).status, "cancelled");
        assert.equal((await host.api.list()).length, 0);
    });
}
