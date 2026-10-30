import test from "node:test";
import assert from "node:assert/strict";
import {
    selectSupportedLanguage,
    buildLanguagePriority,
    sanitizeLanguagePriority,
} from "../reuse/i18n.js";

test("selectSupportedLanguage picks first supported browser language", () => {
    const selectedLanguage = selectSupportedLanguage(
        ["ja-JP", "de-DE", "en-US"],
        ["en", "de", "ja"],
        "en",
    );
    assert.equal(selectedLanguage, "ja");
});

test("selectSupportedLanguage falls back when preferred list is unsupported", () => {
    const selectedLanguage = selectSupportedLanguage(
        ["pt-BR", "it-IT"],
        ["en", "de", "ja"],
        "en",
    );
    assert.equal(selectedLanguage, "en");
});

test("selectSupportedLanguage handles normalized supported values", () => {
    const selectedLanguage = selectSupportedLanguage(
        ["DE-de", "en-US"],
        ["ja-JP", "de-DE"],
        "en",
    );
    assert.equal(selectedLanguage, "de");
});

test("buildLanguagePriority puts browser language before stored preferences", () => {
    const languagePriority = buildLanguagePriority(
        ["de-DE", "ja-JP"],
        ["ja", "en"],
    );
    assert.deepEqual(languagePriority, ["de", "ja", "en"]);
});

test("buildLanguagePriority always includes English fallback", () => {
    const languagePriority = buildLanguagePriority([], []);
    assert.deepEqual(languagePriority, ["en"]);
});

test("buildLanguagePriority ignores browser order after manual priority changes", () => {
    const languagePriority = buildLanguagePriority(
        ["de-DE", "id-ID"],
        ["ja", "en"],
        { mode: "manual" },
    );
    assert.deepEqual(languagePriority, ["ja", "en"]);
});

test("sanitizeLanguagePriority drops unsupported languages silently", () => {
    const languagePriority = sanitizeLanguagePriority(
        ["xx", "ja-JP", "en-US"],
        ["en", "ja"],
    );
    assert.deepEqual(languagePriority, ["ja", "en"]);
});
