import assert from "node:assert/strict";
import test from "node:test";
import { localizeDefinition } from "../service/definitions.js";

test("definition preview fills missing languages and preserves provider translations", async () => {
    const requests: object[] = [];
    const translations = { en: "classroom", de: "Klassenzimmer" };
    const result = await localizeDefinition(
        { translations, languages: ["de", "en", "id", "ja"] },
        {
            translate: async (request) => {
                requests.push(request);
                return request.targetLanguage === "ja" ? "教室" : "ruang kelas";
            },
        },
    );
    assert.deepEqual(result, {
        translations: {
            en: "classroom",
            de: "Klassenzimmer",
            id: "ruang kelas",
            ja: "教室",
        },
        missingLanguages: [],
    });
    assert.equal(requests.length, 2);
    assert.deepEqual(translations, { en: "classroom", de: "Klassenzimmer" });
});

test("translation failures are logged and remain missing rather than using copied English", async () => {
    const logs: object[] = [];
    const result = await localizeDefinition(
        { translations: { en: "room" }, languages: ["de", "en", "id", "ja"] },
        {
            translate: async ({ targetLanguage }) => {
                if (targetLanguage === "de")
                    throw new Error("provider_unavailable");
                return targetLanguage === "ja" ? "部屋" : null;
            },
        },
        async (_level, _message, metadata) => {
            logs.push(metadata);
        },
    );
    assert.deepEqual(result.translations, { en: "room", ja: "部屋" });
    assert.deepEqual(result.missingLanguages, ["de", "id"]);
    assert.equal(logs.length, 1);
    const absent = await localizeDefinition({
        translations: { en: "room" },
        languages: ["ja"],
    });
    assert.deepEqual(absent, {
        translations: { en: "room" },
        missingLanguages: ["ja"],
    });
});

test("a provider definition in another UI language can request English and input is validated", async () => {
    const result = await localizeDefinition(
        { translations: { ja: "教室" }, languages: ["en"] },
        {
            translate: async ({ sourceLanguage, sourceText }) => {
                assert.equal(sourceLanguage, "ja");
                assert.equal(sourceText, "教室");
                return "classroom";
            },
        },
    );
    assert.equal(result.translations.en, "classroom");
    await assert.rejects(
        localizeDefinition({ translations: {}, languages: ["en"] }),
        /definition_source_required/,
    );
    await assert.rejects(
        localizeDefinition({
            translations: { en: "x" },
            languages: ["invalid"],
        }),
        /invalid_definition_localization/,
    );
});
