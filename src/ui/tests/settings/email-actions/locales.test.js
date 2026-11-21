import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { installI18nEnvironment } from "../../../reuse/tests/fixtures/i18n-environment.js";

const keys = [
    "remove_failed",
    "remove_primary_body",
    "primary_failed",
    "remove_completed",
    "primary_completed",
    "queued",
    "saved_refresh_failed",
    "queued_refresh_failed",
    "outcome_unknown",
    "refreshed",
].map((suffix) => `ui.app.settings.emails_${suffix}`);
const catalogs = Object.fromEntries(
    await Promise.all(
        ["en", "de", "id", "ja"].map(async (locale) => [
            locale,
            await readFile(
                new URL(
                    `../../../languages/${locale}/strings.xml`,
                    import.meta.url,
                ),
                "utf8",
            ),
        ]),
    ),
);
let source = catalogs;
installI18nEnvironment(async (path) => {
    const match = String(path).match(
        /^\/static\/languages\/(en|de|id|ja)\/strings\.xml$/,
    );
    assert.ok(match, `Unexpected locale request: ${path}`);
    return new Response(source[match[1]]);
});

for (const locale of ["en", "de", "id", "ja"]) {
    test(`Settings email outcome and tutorial copy resolves from the ${locale} catalog`, async () => {
        const { createI18n } = await import(
            `../../../reuse/i18n.js?email-locale=${locale}`
        );
        const i18n = await createI18n({
            preferredLanguages: [locale],
            persistLocale: false,
        });
        for (const key of [
            ...keys,
            "ui.tutorial.settings.general.email.addresses.body",
        ]) {
            const expected = catalogs[locale].match(
                new RegExp(
                    `<string name="${key.replaceAll(".", "\\.")}">([^<]+)</string>`,
                ),
            );
            assert.ok(expected, key);
            assert.equal(i18n.t(key), expected[1]);
            if (locale !== "en")
                assert.notEqual(
                    i18n.t(key),
                    catalogs.en.match(
                        new RegExp(
                            `<string name="${key.replaceAll(".", "\\.")}">([^<]+)</string>`,
                        ),
                    )[1],
                );
        }
    });
}

test("a missing preferred outcome string falls back to English and missing English fails explicitly", async () => {
    const key = "ui.app.settings.emails_outcome_unknown";
    const pattern =
        /  <string name="ui.app.settings.emails_outcome_unknown">[^<]*<\/string>\n/;
    source = { ...catalogs, de: catalogs.de.replace(pattern, "") };
    const fallbackModule =
        await import("../../../reuse/i18n.js?email-fallback");
    const fallback = await fallbackModule.createI18n({
        preferredLanguages: ["de"],
        persistLocale: false,
    });
    assert.equal(
        fallback.t(key),
        catalogs.en.match(
            /<string name="ui.app.settings.emails_outcome_unknown">([^<]*)<\/string>/,
        )[1],
    );
    source = { ...source, en: catalogs.en.replace(pattern, "") };
    const missingModule = await import("../../../reuse/i18n.js?email-missing");
    const missing = await missingModule.createI18n({
        preferredLanguages: ["de"],
        persistLocale: false,
    });
    assert.throws(() => missing.t(key), /missing_translation/);
});
