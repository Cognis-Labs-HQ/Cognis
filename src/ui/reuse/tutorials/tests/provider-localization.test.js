import test from "node:test";
import assert from "node:assert/strict";
import { installI18nEnvironment } from "../../tests/fixtures/i18n-environment.js";
import { tutorialHost } from "./fixtures/host.js";
import { mountTutorialProvider } from "../pages.js";
import { workerFixture } from "../../../tests/fixtures/offline-worker.js";

test("provider localization refreshes an earlier worker-cached gateway catalog, preserves English fallback and reuses the result offline", async (context) => {
    let published = false;
    const baseUrl = "/static/gateways/example/languages";
    const worker = workerFixture();
    const environment = installI18nEnvironment((path, options) =>
        worker.request(path, undefined, options),
    );
    worker.serve((url) => {
        const path = new URL(url).pathname;
        const entries = path.startsWith(baseUrl)
            ? published
                ? path.includes("/en/")
                    ? {
                          "example.guide.title": "Guide",
                          "example.guide.options.title": "Options",
                          "example.guide.options.body": "Review your options.",
                      }
                    : {
                          "example.guide.title": "Anleitung",
                          "example.guide.options.title": "Optionen",
                      }
                : { "example.page.title": "Page" }
            : { "ui.reuse.save": "Save" };
        return new Response(
            `<resources>${Object.entries(entries)
                .map(
                    ([key, value]) => `<string name="${key}">${value}</string>`,
                )
                .join("")}</resources>`,
        );
    });
    const i18n = await import(`../../i18n.js?fixture=${crypto.randomUUID()}`);
    const earlier = await i18n.createI18n({
        preferredLanguages: ["de"],
        persistLocale: false,
        componentStringBaseUrls: [baseUrl],
    });
    assert.throws(() => earlier.t("example.guide.title"), {
        code: "missing_translation",
    });
    published = true;
    const cached = await i18n.createI18n({
        preferredLanguages: ["de"],
        persistLocale: false,
        componentStringBaseUrls: [baseUrl],
    });
    assert.throws(() => cached.t("example.guide.title"), {
        code: "missing_translation",
    });
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    state.window.location.origin = "https://cognis.test";
    state.document.cookie = "";
    state.document.documentElement = { lang: "de" };
    state.document.body = {
        ownerDocument: state.document,
        isConnected: true,
        querySelectorAll: () => [],
    };
    globalThis.document = state.document;
    globalThis.window = state.window;
    state.ctx.capabilities.contribute("ui:reuse", {
        importModule: async (path) => {
            assert.equal(path, "i18n.js");
            return i18n;
        },
    });
    const guides = [
        {
            owner: "example.page",
            definitions: [
                {
                    id: "overview",
                    page: "/dashboard",
                    titleKey: "example.guide.title",
                    steps: [
                        {
                            id: "options",
                            titleKey: "example.guide.options.title",
                            bodyKey: "example.guide.options.body",
                        },
                    ],
                },
            ],
        },
    ];
    const options = { guides, stringsBaseUrls: [baseUrl] };
    const dispose = await mountTutorialProvider(state.ctx, options);
    assert.equal((await state.api.list())[0].title, "Anleitung");
    const session = await state.api.start("example.page:overview");
    await session.ready;
    assert.deepEqual(state.rendered.at(-1).text, {
        title: "Optionen",
        body: "Review your options.",
    });
    await session.dispose();
    assert.ok(
        environment.requests.some(
            ({ path, options }) =>
                path.startsWith(baseUrl) && options.cache === "reload",
        ),
    );
    dispose();
    const count = environment.requests.length;
    const onlineFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new TypeError("offline");
    };
    const offlineDispose = await mountTutorialProvider(state.ctx, options);
    assert.equal((await state.api.list())[0].title, "Anleitung");
    assert.equal(environment.requests.length, count);
    offlineDispose();
    globalThis.fetch = onlineFetch;
    const missing = {
        guides: [
            {
                owner: "example.missing",
                definitions: [
                    {
                        id: "overview",
                        page: "/dashboard",
                        titleKey: "missing.title",
                        steps: [{ id: "options", titleKey: "missing.options" }],
                    },
                ],
            },
        ],
        stringsBaseUrls: [baseUrl],
    };
    await assert.rejects(mountTutorialProvider(state.ctx, missing), {
        code: "missing_translation",
        key: "missing.title",
    });
    assert.deepEqual(await state.api.list(), []);
    assert.ok(state.events.includes("ui:tutorial:register"));
});
