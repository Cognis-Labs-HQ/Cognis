import test from "node:test";
import assert from "node:assert/strict";
import { subscribeDiagnostics } from "../../../../tooling/reuse/diagnostic-fixture.ts";
import { installI18nEnvironment } from "../../../../tooling/reuse/i18n-environment.js";

const xml = (value) =>
    new Response(
        `<resources><string name="title">${value}</string></resources>`,
    );

for (const component of [false, true]) {
    test(`${component ? "component" : "core"} translations refresh in the same page after server recovery`, async () => {
        let title = "Before restart";
        const host = installI18nEnvironment(() => xml(title));
        const { createI18n } = await import(
            `../../i18n.js?fixture=${crypto.randomUUID()}`
        );
        const options = {
            preferredLanguages: ["en"],
            componentStringBaseUrls: component
                ? ["/static/gateways/example/languages"]
                : [],
        };
        assert.equal((await createI18n(options)).t("title"), title);
        const firstReadCount = host.requests.length;
        assert.ok(
            host.requests.every(({ options }) => options.cache === "default"),
        );
        title = "After restart";
        window.dispatchEvent(new Event("cognis:connection-restoring"));
        assert.equal((await createI18n(options)).t("title"), title);
        assert.ok(
            host.requests
                .slice(firstReadCount)
                .every(({ options }) => options.cache === "reload"),
        );
    });
}

test("an HTML response during restart cannot poison a component translation cache", async (t) => {
    const logs = [];
    const release = subscribeDiagnostics(async (entry) => {
        logs.push(entry);
        return true;
    });
    t.after(release);
    t.mock.method(console, "error", () =>
        assert.fail("Translations must use the logging gateway"),
    );
    let restarting = true;
    installI18nEnvironment(() =>
        restarting
            ? new Response("<html><body>Starting</body></html>")
            : xml("Recovered"),
    );
    const { extendI18n } = await import(
        `../../i18n.js?fixture=${crypto.randomUUID()}`
    );
    const base = {
        locale: "en",
        t(key) {
            throw Object.assign(new Error(key), {
                code: "missing_translation",
            });
        },
    };
    const load = () => extendI18n(base, "/static/gateways/example/languages");
    const unavailable = await load();
    assert.ok(
        logs.some(
            (entry) =>
                entry.level === "error" &&
                entry.message === "translation_bundle_load_failed" &&
                entry.meta.operation === "loadTranslationBundle",
        ),
    );
    assert.throws(() => unavailable.t("title"), {
        code: "missing_translation",
    });
    restarting = false;
    assert.equal((await load()).t("title"), "Recovered");
});

test(
    "a core response started before recovery cannot populate the recovered cache",
    { timeout: 3000 },
    async () => {
        let finish;
        const oldResponse = new Promise((resolve) => {
            finish = resolve;
        });
        let recovering = false;
        installI18nEnvironment(() =>
            recovering ? xml("Current") : oldResponse,
        );
        const { createI18n } = await import(
            `../../i18n.js?fixture=${crypto.randomUUID()}`
        );
        const load = () => createI18n({ preferredLanguages: ["en"] });
        const earlier = load();
        await new Promise(setImmediate);
        recovering = true;
        window.dispatchEvent(new Event("cognis:connection-restoring"));
        assert.equal((await load()).t("title"), "Current");
        finish(xml("Stale"));
        await earlier;
        assert.equal((await load()).t("title"), "Current");
    },
);

test("new bundles after recovery use ordinary reads and failed reloads remain retryable", async () => {
    let fail = false;
    const host = installI18nEnvironment(() =>
        fail ? new Response("<html>Starting</html>") : xml("Ready"),
    );
    const { extendI18n } = await import(
        `../../i18n.js?reload=${crypto.randomUUID()}`
    );
    const base = { locale: "en", t: (key) => key };
    await extendI18n(base, "/static/gateways/known/languages");
    window.dispatchEvent(new Event("cognis:connection-restoring"));
    await extendI18n(base, "/static/gateways/new/languages");
    assert.equal(host.requests.at(-1).options.cache, "default");
    fail = true;
    await extendI18n(base, "/static/gateways/known/languages");
    assert.equal(host.requests.at(-1).options.cache, "reload");
    fail = false;
    assert.equal(
        (await extendI18n(base, "/static/gateways/known/languages")).t("title"),
        "Ready",
    );
    assert.equal(host.requests.at(-1).options.cache, "reload");
    window.dispatchEvent(new Event("cognis:module-lifecycle-changed"));
    await extendI18n(base, "/static/gateways/known/languages");
    assert.equal(host.requests.at(-1).options.cache, "default");
});
