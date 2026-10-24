import test from "node:test";
import assert from "node:assert/strict";
import { installI18nEnvironment } from "../fixtures/i18n-environment.js";

const xml = (strings) =>
    new Response(
        `<resources>${Object.entries(strings)
            .map(([key, value]) => `<string name="${key}">${value}</string>`)
            .join("")}</resources>`,
    );

async function resolver({ core = {}, component = {}, module = {} } = {}) {
    const environment = installI18nEnvironment((path) => {
        if (path.startsWith("/static/languages/"))
            return xml(core[path.includes("/de/") ? "de" : "en"] ?? {});
        if (path.startsWith("/modules/example/"))
            return xml(module[path.endsWith("/de.xml") ? "de" : "en"] ?? {});
        return xml(component[path.includes("/de/") ? "de" : "en"] ?? {});
    });
    const i18n = await import(`../../i18n.js?fixture=${crypto.randomUUID()}`);
    return { ...i18n, ...environment };
}

test("core keys fall back to English per key even when only German was requested", async () => {
    const host = await resolver({
        core: {
            de: { greeting: "Hallo", empty: " " },
            en: {
                greeting: "Hello",
                empty: "English",
                englishOnly: "Available",
            },
        },
    });
    const i18n = await host.createI18n({ preferredLanguages: ["de"] });
    assert.equal(i18n.locale, "de");
    assert.equal(i18n.t("greeting"), "Hallo");
    assert.equal(i18n.t("empty"), "English");
    assert.equal(i18n.t("englishOnly"), "Available");
    assert.equal(document.documentElement.lang, "de");
    assert.deepEqual(JSON.parse(host.storage.get("cognis_language_priority")), [
        "de",
        "en",
    ]);
    assert.throws(() => i18n.t("absent"), {
        code: "missing_translation",
        key: "absent",
    });
});

test("module and component bundles merge nonempty preferred values over English keys", async () => {
    const host = await resolver({
        core: { de: { core: "Kern" }, en: { core: "Core" } },
        component: {
            de: { title: "Titel", fallback: "" },
            en: { title: "Title", fallback: "Fallback" },
        },
        module: {
            de: { "module.example.name": "Beispiel" },
            en: {
                "module.example.name": "Example",
                "module.example.help": "Help",
                foreign: "Hidden",
            },
        },
    });
    const i18n = await host.createI18n({
        preferredLanguages: ["de"],
        moduleIds: ["example"],
        componentStringBaseUrls: ["/component"],
    });
    assert.equal(i18n.t("title"), "Titel");
    assert.equal(i18n.t("fallback"), "Fallback");
    assert.equal(i18n.t("module.example.name"), "Beispiel");
    assert.equal(i18n.t("module.example.help"), "Help");
    assert.throws(() => i18n.t("foreign"), { code: "missing_translation" });
});

test("extending a resolver handles missing and empty keys without mutating preferences", async () => {
    const host = await resolver({
        component: {
            de: { title: "Titel", fallback: "" },
            en: { title: "Title", fallback: "Fallback", empty: " " },
        },
    });
    host.storage.set("cognis_language_priority", '["de"]');
    const i18n = await host.extendI18n(
        { locale: "de", t: (key) => (key === "base" ? "Basis" : "") },
        "/component",
    );
    assert.equal(i18n.t("title"), "Titel");
    assert.equal(i18n.t("fallback"), "Fallback");
    assert.equal(i18n.t("base"), "Basis");
    for (const key of ["absent", "empty"])
        assert.throws(() => i18n.t(key), { code: "missing_translation", key });
    assert.equal(host.storage.get("cognis_language_priority"), '["de"]');
    assert.equal(document.documentElement.lang, "de");
});

test("missing English keys in core, module and component resolvers reject empty values", async () => {
    const host = await resolver({
        core: { de: { good: "Gut", empty: " " }, en: { empty: "" } },
        module: { en: { "module.example.empty": " " } },
        component: { en: { componentEmpty: "" } },
    });
    const i18n = await host.createI18n({
        preferredLanguages: ["de"],
        moduleIds: ["example"],
        componentStringBaseUrls: ["/component"],
    });
    for (const key of [
        "absent",
        "empty",
        "module.example.empty",
        "componentEmpty",
    ])
        assert.throws(() => i18n.t(key), { code: "missing_translation", key });
});

test("unavailable locale bundles log diagnostics and English fallback still resolves", async (context) => {
    const failures = [];
    context.mock.method(console, "error", (...args) => failures.push(args));
    installI18nEnvironment((path) =>
        path.includes("/de/")
            ? new Response("", { status: 404 })
            : xml({ title: "English title" }),
    );
    const { extendI18n } = await import(
        `../../i18n.js?fixture=${crypto.randomUUID()}`
    );
    const i18n = await extendI18n(
        { locale: "de", t: () => "" },
        "/missing-locale",
    );
    assert.equal(i18n.t("title"), "English title");
    assert.deepEqual(failures[0][1], {
        component: "core",
        operation: "loadTranslationBundle",
        locale: "de",
        path: "/missing-locale/de/strings.xml",
        status: 404,
        errorName: "Error",
    });
});

test("background translation completion cannot overwrite a newer locale selection", async () => {
    const pendingEnglish = Promise.withResolvers();
    const { storage } = installI18nEnvironment((path) =>
        path.includes("/en/")
            ? pendingEnglish.promise
            : xml({ title: "Deutsch" }),
    );
    const host = await import(`../../i18n.js?fixture=${crypto.randomUUID()}`);
    document.documentElement.lang = "en";
    host.setPreferredLanguages(["en"], { mode: "manual" });
    const loadingCopy = host.createI18n({
        preferredLanguages: ["en"],
        persistLocale: false,
    });
    host.setPreferredLanguages(["de"], { mode: "manual" });
    document.documentElement.lang = "de";
    const currentPreferences = [...storage];
    const currentCookie = document.cookie;
    pendingEnglish.resolve(xml({ title: "English" }));
    const i18n = await loadingCopy;
    assert.equal(i18n.locale, "en");
    assert.equal(i18n.t("title"), "English");
    assert.deepEqual([...storage], currentPreferences);
    assert.equal(document.cookie, currentCookie);
    assert.equal(document.documentElement.lang, "de");
});

test("read-only translation fallback does not prune saved locale preferences", async (context) => {
    context.mock.method(console, "error", () => {});
    const { storage } = installI18nEnvironment((path) =>
        path.includes("/de/")
            ? new Response("", { status: 404 })
            : xml({ title: "English fallback" }),
    );
    const host = await import(`../../i18n.js?fixture=${crypto.randomUUID()}`);
    host.setPreferredLanguages(["de"], { mode: "manual" });
    const currentPreferences = [...storage];
    const currentCookie = document.cookie;
    const i18n = await host.createI18n({
        preferredLanguages: ["de"],
        persistLocale: false,
    });
    assert.equal(i18n.locale, "en");
    assert.equal(i18n.t("title"), "English fallback");
    assert.deepEqual([...storage], currentPreferences);
    assert.equal(document.cookie, currentCookie);
    assert.equal(document.documentElement.lang, "de");
});
