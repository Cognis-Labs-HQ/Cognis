import assert from "node:assert/strict";
import test from "node:test";

import { getNextLanguage, promoteLanguage } from "../language-switcher.js";

test("language switcher cycles through preferred languages", () => {
    const languages = ["de", "ja", "en"];

    assert.equal(getNextLanguage(languages, "de"), "ja");
    assert.equal(getNextLanguage(languages, "ja"), "en");
    assert.equal(getNextLanguage(languages, "en"), "de");
});

test("language switcher promotes the selected language", () => {
    assert.deepEqual(promoteLanguage(["de", "ja", "en"], "ja"), [
        "ja",
        "de",
        "en",
    ]);
});
