import assert from "node:assert/strict";
import test from "node:test";

import { getNextLanguage, promoteLanguage } from "../language-switcher.js";
import { readFileSync } from "node:fs";

test("language switcher cycles through preferred languages", () => {
    const languages = ["de", "ja", "en"];

    assert.equal(getNextLanguage(languages, "de"), "ja");
    assert.equal(getNextLanguage(languages, "ja"), "en");
    assert.equal(getNextLanguage(languages, "en"), "de");
});

test("floating switchers link their context menus to settings", () => {
    const languageSwitcherSource = readFileSync(
        new URL("../language-switcher.js", import.meta.url),
        "utf8",
    );
    const themeSwitcherSource = readFileSync(
        new URL("../theme-toggle.js", import.meta.url),
        "utf8",
    );

    assert.match(
        languageSwitcherSource,
        /contextmenu[\s\S]*navigateToSettingsSection\("language"\)/,
    );
    assert.match(
        themeSwitcherSource,
        /contextmenu[\s\S]*navigateToSettingsSection\("appearance"\)/,
    );
});

test("language switcher promotes the selected language", () => {
    assert.deepEqual(promoteLanguage(["de", "ja", "en"], "ja"), [
        "ja",
        "de",
        "en",
    ]);
});
