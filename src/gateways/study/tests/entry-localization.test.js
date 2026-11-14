import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installI18nEnvironment } from "../../../ui/reuse/tests/fixtures/i18n-environment.js";

const key = "gateway.study.entry_failed";
const resources = (locale) =>
    readFileSync(
        new URL(`../ui/languages/${locale}/strings.xml`, import.meta.url),
        "utf8",
    );

for (const locale of ["de", "en", "id", "ja"]) {
    test(`Study entry errors resolve the ${locale} XML catalog`, async () => {
        installI18nEnvironment(
            (path) =>
                new Response(
                    resources(path.includes(`/${locale}/`) ? locale : "en"),
                ),
        );
        const { extendI18n } = await import(
            `../../../ui/reuse/i18n.js?fixture=${crypto.randomUUID()}`
        );
        const i18n = await extendI18n(
            { locale, t: () => "" },
            "/static/gateways/study/languages",
        );
        const expected = resources(locale).match(
            /name="gateway.study.entry_failed">([^<]+)/,
        )[1];
        assert.equal(i18n.t(key), expected);
    });
}

test("Study entry errors use English for an empty preferred key and fail when English is also missing", async () => {
    for (const missingEnglish of [false, true]) {
        installI18nEnvironment(
            (path) =>
                new Response(
                    path.includes("/de/") || missingEnglish
                        ? "<resources></resources>"
                        : resources("en"),
                ),
        );
        const { extendI18n } = await import(
            `../../../ui/reuse/i18n.js?fixture=${crypto.randomUUID()}`
        );
        const i18n = await extendI18n(
            { locale: "de", t: () => "" },
            "/static/gateways/study/languages",
        );
        if (missingEnglish)
            assert.throws(() => i18n.t(key), {
                code: "missing_translation",
                key,
            });
        else
            assert.equal(
                i18n.t(key),
                resources("en").match(
                    /name="gateway.study.entry_failed">([^<]+)/,
                )[1],
            );
    }
});
