import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { installI18nEnvironment } from "../../../ui/reuse/tests/fixtures/i18n-environment.js";

const context = vm.createContext({});
const module = new vm.SourceTextModule(
    await readFile(new URL("../ui/event-composer.js", import.meta.url), "utf8"),
    { context },
);
await module.link((specifier) => {
    const contracts = {
        "/static/reuse/form-builder.js": {
            createFormBuilder: (_dependencies, options) => options,
        },
        "/static/reuse/escape-html.js": { escapeHtml: String },
    };
    const exports = contracts[specifier];
    assert.ok(exports, `Unexpected composer dependency: ${specifier}`);
    return new vm.SyntheticModule(
        Object.keys(exports),
        function () {
            for (const [name, value] of Object.entries(exports))
                this.setExport(name, value);
        },
        { context },
    );
});
await module.evaluate();
const { createEventComposerBuilder } = module.namespace;

async function loadTranslations(locale, omitLocales = []) {
    installI18nEnvironment(async (path) => {
        const language = path.split("/").at(-2);
        const component = path.startsWith("/calendar/");
        const location = component
            ? `../ui/languages/${language}/strings.xml`
            : `../../../ui/languages/${language}/strings.xml`;
        let xml = await readFile(new URL(location, import.meta.url), "utf8");
        if (component && omitLocales.includes(language)) {
            xml = xml.replace(
                /<string name="gateway\.calendar\.status_busy">[^<]*<\/string>/,
                "",
            );
        }
        return new Response(xml);
    });
    const { createI18n } = await import(
        `../../../ui/reuse/i18n.js?fixture=${crypto.randomUUID()}`
    );
    return createI18n({
        preferredLanguages: [locale],
        componentStringBaseUrls: ["/calendar"],
    });
}

const labels = {
    en: ["Busy", "Free"],
    de: ["Belegt", "Frei"],
    id: ["Sibuk", "Kosong"],
    ja: ["予定あり", "空き"],
};

for (const [locale, expected] of Object.entries(labels)) {
    for (const readOnly of [false, true]) {
        test(`${locale} resolves actual composer status options with readOnly=${readOnly}`, async () => {
            const i18n = await loadTranslations(locale);
            const form = createEventComposerBuilder({
                i18n,
                defaultValues: { status: "free" },
                readOnly,
                calendars: [{ id: "personal", name: "Personal" }],
            });
            const status = form.fields.find((field) => field.name === "status");
            assert.deepEqual(
                Array.from(status.options, (option) => option.value),
                ["busy", "free"],
            );
            assert.deepEqual(
                Array.from(status.options, (option) => option.label),
                expected,
            );
            assert.equal(status.value, "free");
            assert.equal(status.disabled, readOnly);
        });
    }
}

test("composer status labels use English fallback and reject a missing English key", async () => {
    const fallback = await loadTranslations("de", ["de"]);
    const form = createEventComposerBuilder({ i18n: fallback });
    const status = form.fields.find((field) => field.name === "status");
    assert.equal(status.options[0].label, "Busy");
    assert.equal(status.options[1].label, "Frei");
    const missing = await loadTranslations("de", ["de", "en"]);
    assert.throws(() => createEventComposerBuilder({ i18n: missing }), {
        code: "missing_translation",
        key: "gateway.calendar.status_busy",
    });
});
