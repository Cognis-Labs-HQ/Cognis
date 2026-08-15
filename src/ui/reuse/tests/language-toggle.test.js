import assert from "node:assert/strict";
import test from "node:test";

import {
    promoteLanguage,
    shouldShowLanguageToggle,
} from "../language-toggle.js";

test("language switcher is enabled by default for multiple preferences", () => {
    assert.equal(shouldShowLanguageToggle({}, ["en", "de"]), true);
    assert.equal(shouldShowLanguageToggle({}, ["en"]), false);
});

test("language switcher respects the explicit opt-out", () => {
    assert.equal(
        shouldShowLanguageToggle({ alwaysShowLanguageSwitcher: false }, [
            "en",
            "de",
        ]),
        false,
    );
});

test("selected language is promoted without changing the remaining order", () => {
    assert.deepEqual(promoteLanguage(["en", "de", "ja"], "ja"), [
        "ja",
        "en",
        "de",
    ]);
});
