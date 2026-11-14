import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { installI18nEnvironment } from "../../reuse/tests/fixtures/i18n-environment.js";
import { settingsFixture, settle } from "../fixtures/message-style.js";

for (const locale of ["en", "de", "id", "ja"]) {
    test(`Settings synthetic records use the ${locale} catalog`, async (context) => {
        installI18nEnvironment((path) => {
            const language = path.includes(`/${locale}/`) ? locale : "en";
            return new Response(
                readFileSync(
                    new URL(
                        `../../languages/${language}/strings.xml`,
                        import.meta.url,
                    ),
                    "utf8",
                ),
            );
        });
        const { createI18n } = await import(
            `../../reuse/i18n.js?preview=${locale}`
        );
        const translation = await createI18n({
            preferredLanguages: [locale],
            persistLocale: false,
        });
        const fixture = await settingsFixture(context, { translation });
        await settle();
        assert.equal(
            fixture.root.querySelector("#message-style-preview-title")
                .textContent,
            translation.t("ui.app.settings.message_preview_title"),
        );
        const records = fixture.state.renders.at(-1).records;
        assert.equal(
            records[0].text,
            translation.t("ui.app.settings.message_preview_text_1"),
        );
        assert.equal(
            records[1].senderDisplayName,
            translation.t("ui.app.settings.message_preview_self"),
        );
        assert.ok(records[1].text.length > 20);
    });
}

test("sample copy falls back to English and missing English fails explicitly", async () => {
    const english = readFileSync(
        new URL("../../languages/en/strings.xml", import.meta.url),
        "utf8",
    );
    const key = "ui.app.settings.message_preview_text_1";
    for (const missing of [false, true]) {
        installI18nEnvironment(
            (path) =>
                new Response(
                    path.includes("/de/")
                        ? '<resources><string name="ui.app.settings.message_preview_text_1"> </string></resources>'
                        : missing
                          ? english.replace(
                                /<string name="ui.app.settings.message_preview_text_1">[^<]*<\/string>/,
                                "",
                            )
                          : english,
                ),
        );
        const { createI18n } = await import(
            `../../reuse/i18n.js?previewMissing=${missing}`
        );
        const i18n = await createI18n({
            preferredLanguages: ["de"],
            persistLocale: false,
        });
        if (missing)
            assert.throws(() => i18n.t(key), {
                code: "missing_translation",
                key,
            });
        else assert.equal(i18n.t(key), "How is your practice going?");
    }
});

test("language remount regenerates synthetic records from the new active catalog", async (context) => {
    installI18nEnvironment(
        (path) =>
            new Response(
                readFileSync(
                    new URL(
                        `../../languages/${path.includes("/ja/") ? "ja" : "en"}/strings.xml`,
                        import.meta.url,
                    ),
                    "utf8",
                ),
            ),
    );
    const { createI18n } =
        await import("../../reuse/i18n.js?previewTransition");
    const english = await createI18n({
        preferredLanguages: ["en"],
        persistLocale: false,
    });
    const japanese = await createI18n({
        preferredLanguages: ["ja"],
        persistLocale: false,
    });
    const fixture = await settingsFixture(context, { translation: english });
    await settle();
    const before = fixture.state.renders.at(-1).records[0].text;
    fixture.state.translation = japanese;
    await fixture.state.mount();
    await settle();
    const after = fixture.state.renders.at(-1).records[0].text;
    assert.notEqual(after, before);
    assert.equal(after, japanese.t("ui.app.settings.message_preview_text_1"));
    assert.equal(fixture.state.writes.length, 0);
});
