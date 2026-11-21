import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixture } from "./fixture.js";

const base = "/static/adapters/social/messages/languages";
const key = "module.social.messages.receipt_seen_by_count";

async function translator(locale, missing = []) {
    globalThis.fetch = async (path) => {
        const localeName = String(path).includes("/en/") ? "en" : locale;
        const file = path.startsWith(base)
            ? new URL(
                  `../../ui/languages/${localeName}/strings.xml`,
                  import.meta.url,
              )
            : new URL(
                  `../../../../../ui/languages/${localeName}/strings.xml`,
                  import.meta.url,
              );
        let source = readFileSync(file, "utf8");
        if (missing.includes(localeName))
            source = source.replace(
                new RegExp(`<string name="${key}">.*?</string>`),
                "",
            );
        return new Response(source);
    };
    const { createI18n } = await import(
        `../../../../../ui/reuse/i18n.js?receipts=${crypto.randomUUID()}`
    );
    return createI18n({
        preferredLanguages: [locale],
        componentStringBaseUrls: [base],
        persistLocale: false,
    });
}

for (const locale of ["en", "de", "id", "ja"])
    test(`reader controls use the ${locale} owner catalog and English fallback`, async (context) => {
        await fixture(context);
        const i18n = await translator(locale);
        assert.ok(i18n.t(key).includes("{count}"));
        assert.ok(i18n.t("ui.reuse.close"));
        assert.ok(
            i18n.t(
                "module.social.messages.tutorial.messages.room.history.body",
            ),
        );
        if (locale !== "en") {
            const fallback = await translator(locale, [locale]);
            assert.equal(fallback.t(key), "Seen by {count}");
        }
        const absent = await translator(locale, [locale, "en"]);
        assert.throws(() => absent.t(key), {
            code: "missing_translation",
            key,
        });
    });
