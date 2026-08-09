import assert from "node:assert/strict";
import test from "node:test";

import {
    bindLanguageSwitcher,
    getNextLanguage,
    promoteLanguage,
} from "../language-switcher.js";
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

test("language switcher uses persisted preferences when local state is not initialized", () => {
    const originalDocument = globalThis.document;
    const listeners = new Map();
    const button = {
        hidden: true,
        textContent: "",
        addEventListener(type, handler) {
            listeners.set(type, handler);
        },
        setAttribute(name, value) {
            this[name] = value;
        },
    };
    globalThis.document = {
        querySelector: () => button,
    };

    try {
        bindLanguageSwitcher({
            preferences: {
                languagePriority: ["en"],
                languageSwitcherShow: false,
            },
            i18n: {
                t: () => "Switch language; {language} selected",
            },
        });
        assert.equal(button.hidden, true);

        bindLanguageSwitcher({
            preferences: {
                languagePriority: ["de", "ja", "en"],
                languageSwitcherShow: true,
            },
            i18n: {
                t: () => "Switch language; {language} selected",
            },
        });

        assert.equal(button.hidden, false);
        assert.equal(button.textContent, "DE");
        assert.equal(listeners.has("click"), true);
        assert.equal(listeners.has("contextmenu"), true);
    } finally {
        globalThis.document = originalDocument;
    }
});

test("enabled language switcher remains visible with one preferred language", () => {
    const originalDocument = globalThis.document;
    const button = {
        hidden: true,
        textContent: "",
        addEventListener() {},
        setAttribute() {},
    };
    globalThis.document = {
        querySelector: () => button,
    };

    try {
        bindLanguageSwitcher({
            preferences: {
                languagePriority: ["en"],
                languageSwitcherShow: true,
            },
            i18n: {
                t: () => "Switch language; {language} selected",
            },
        });

        assert.equal(button.hidden, false);
        assert.equal(button.textContent, "EN");
    } finally {
        globalThis.document = originalDocument;
    }
});
