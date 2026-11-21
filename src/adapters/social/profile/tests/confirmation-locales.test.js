import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

const keys = ["action_failed", "action_uncertain", "action_refresh_failed"].map(
    (key) => `ui.app.profile.${key}`,
);

async function resolver(context, locale, omitted = []) {
    const window = new JSDOM('<html lang="en"></html>', {
        url: "https://fixture.invalid",
    }).window;
    context.after(() => window.close());
    const fetch = async (path) => {
        const language = path.includes("/en/") ? "en" : locale;
        const component = path.startsWith("/profile/");
        const xml = readFileSync(
            new URL(
                component
                    ? `../ui/languages/${language}/strings.xml`
                    : `../../../../ui/languages/${language}/strings.xml`,
                import.meta.url,
            ),
            "utf8",
        );
        const document = new window.DOMParser().parseFromString(
            xml,
            "application/xml",
        );
        for (const key of Array.isArray(omitted)
            ? omitted
            : (omitted[language] ?? []))
            document.querySelector(`string[name="${key}"]`)?.remove();
        return new Response(
            new window.XMLSerializer().serializeToString(document),
        );
    };
    const { createI18n } = loadTestModule(
        new URL("../../../../ui/reuse/i18n.js", import.meta.url),
        {
            "./ui-language-state.js": {
                activeUiLanguage: () => undefined,
                enabledUiLanguages: () => [locale],
            },
            "./api-client.js": {
                apiFetch: fetch,
                requestTargetsApi: () => false,
            },
        },
        {
            window,
            document: window.document,
            navigator: window.navigator,
            localStorage: window.localStorage,
            DOMParser: window.DOMParser,
            URL,
            fetch,
            console,
        },
    );
    return createI18n({
        preferredLanguages: [locale],
        componentStringBaseUrls: ["/profile/languages"],
        persistLocale: false,
    });
}

for (const locale of ["en", "de", "id", "ja"]) {
    test(`Profile confirmation feedback and guide copy resolve from ${locale} XML`, async (context) => {
        const language = await resolver(context, locale);
        for (const key of [
            ...keys,
            "module.social.profile.tutorial.profile.posts.body",
            "module.social.profile.tutorial.profile.social.actions.body",
        ])
            assert.ok(language.t(key));
        if (locale !== "en")
            assert.notEqual(
                language.t(keys[0]),
                (await resolver(context, "en")).t(keys[0]),
            );
    });
}

test("Profile confirmation keys fall back to English and fail explicitly when English is absent", async (context) => {
    const language = await resolver(context, "de", { de: keys });
    const english = await resolver(context, "en");
    for (const key of keys) assert.equal(language.t(key), english.t(key));
    assert.throws(
        () => language.t("ui.app.profile.unavailable_confirmation_key"),
        { code: "missing_translation" },
    );
    const missing = await resolver(context, "de", keys);
    for (const key of keys)
        assert.throws(() => missing.t(key), { code: "missing_translation" });
});
