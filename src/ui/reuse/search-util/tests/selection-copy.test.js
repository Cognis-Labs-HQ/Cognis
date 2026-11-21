import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

const keys = ["ui.search.selection_failed", "ui.search.selection_unavailable"];

test("Search outcome copy is translated and uses the English per-key fallback", async (context) => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
        url: "https://fixture.invalid/",
    });
    const previous = new Map(
        ["window", "document", "localStorage", "DOMParser", "fetch"].map(
            (key) => [key, globalThis[key]],
        ),
    );
    for (const key of ["window", "document", "localStorage", "DOMParser"])
        globalThis[key] = dom.window[key];
    context.after(() => {
        for (const [key, value] of previous) globalThis[key] = value;
        dom.window.close();
    });
    const bundles = new Map();
    for (const locale of ["en", "de", "id", "ja"]) {
        const content = await readFile(
            new URL(
                `../../../languages/${locale}/strings.xml`,
                import.meta.url,
            ),
            "utf8",
        );
        const parsed = new DOMParser().parseFromString(
            content,
            "application/xml",
        );
        for (const key of keys) {
            const value = parsed.querySelector(
                `string[name="${key}"]`,
            )?.textContent;
            assert.ok(value?.trim(), `${locale} supplies ${key}`);
            if (locale !== "en")
                assert.notEqual(
                    value,
                    bundles.get("en").querySelector(`string[name="${key}"]`)
                        .textContent,
                );
        }
        bundles.set(locale, parsed);
    }
    for (const key of keys)
        bundles.get("de").querySelector(`string[name="${key}"]`).textContent =
            " ";
    globalThis.fetch = async (input) => {
        const match = String(input).match(
            /^\/static\/languages\/(en|de)\/strings.xml$/,
        );
        assert.ok(match, `Unexpected fixture request ${input}`);
        return new Response(
            new dom.window.XMLSerializer().serializeToString(
                bundles.get(match[1]),
            ),
            { headers: { "Content-Type": "application/xml" } },
        );
    };
    const { createI18n } = await import("../../i18n.js?search-copy-fallback");
    const i18n = await createI18n({
        preferredLanguages: ["de"],
        persistLocale: false,
    });
    for (const key of keys)
        assert.equal(
            i18n.t(key),
            bundles.get("en").querySelector(`string[name="${key}"]`)
                .textContent,
        );
    for (const key of keys)
        bundles.get("en").querySelector(`string[name="${key}"]`).remove();
    const missing = await import("../../i18n.js?search-copy-missing");
    const unavailable = await missing.createI18n({
        preferredLanguages: ["de"],
        persistLocale: false,
    });
    for (const key of keys)
        assert.throws(() => unavailable.t(key), {
            code: "missing_translation",
            key,
        });
});
