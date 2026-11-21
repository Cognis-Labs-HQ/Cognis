import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.mjs";

const keys = [
    "error_load",
    "error_styles",
    "error_refresh",
    "error_refresh_after_change",
    "error_change_rejected",
    "error_change_uncertain",
    "error_preview",
    "mark_read",
    "open_inbox",
].map((key) => `adapter.notify.internal.${key}`);

for (const locale of ["en", "de", "id", "ja"]) {
    test(`notification outcome copy resolves from ${locale} XML`, async (context) => {
        const environment = await fixture({ realI18n: true });
        context.after(environment.close);
        for (const key of keys) {
            const value = await environment.translate(key, locale);
            assert.ok(value && value !== key);
            if (locale !== "en")
                assert.notEqual(value, await environment.translate(key, "en"));
        }
    });
}

test("missing preferred translation falls back to the English XML", async (context) => {
    const key = keys[0];
    const environment = await fixture({
        realI18n: true,
        missingTranslations: { de: [key] },
    });
    context.after(environment.close);
    assert.equal(
        await environment.translate(key, "de"),
        await environment.translate(key, "en"),
    );
});

test("missing preferred and English copy throws rather than hiding the error", async (context) => {
    const key = keys[0];
    const environment = await fixture({
        realI18n: true,
        missingTranslations: { de: [key], en: [key] },
    });
    context.after(environment.close);
    await assert.rejects(
        environment.translate(key, "de"),
        (error) => error.code === "missing_translation" && error.key === key,
    );
});

for (const name of ["mark_read", "open_inbox", "error_styles"]) {
    const key = `adapter.notify.internal.${name}`;
    test(`${name} label falls back from preferred locale to English XML`, async (context) => {
        const environment = await fixture({
            realI18n: true,
            missingTranslations: { de: [key] },
        });
        context.after(environment.close);
        assert.equal(
            await environment.translate(key, "de"),
            await environment.translate(key, "en"),
        );
    });
    test(`${name} label rejects missing preferred and English XML`, async (context) => {
        const environment = await fixture({
            realI18n: true,
            missingTranslations: { de: [key], en: [key] },
        });
        context.after(environment.close);
        await assert.rejects(
            environment.translate(key, "de"),
            (error) =>
                error.code === "missing_translation" && error.key === key,
        );
    });
}
