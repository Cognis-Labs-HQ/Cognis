import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    bindLanguageToggle,
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

test("hidden page action buttons cannot retain an empty visual presence", async () => {
    const layoutStyles = await readFile(
        new URL("../../styles/reuse/layout.css", import.meta.url),
        "utf8",
    );
    assert.match(
        layoutStyles,
        /\.page-action-dock\s*>\s*\.page-action-button\[hidden\]\s*\{\s*display:\s*none;/,
    );
    assert.match(
        layoutStyles,
        /\.page-action-dock\s*\{[\s\S]*?z-index:\s*1202;/,
    );
});

test("language binding consumes the current shell preferences without another read", async () => {
    const previousDocument = globalThis.document;
    const previousStorage = globalThis.localStorage;
    const toggle = {};
    globalThis.document = { querySelector: () => toggle };
    globalThis.localStorage = {
        getItem() {
            throw new Error("unexpected separate preference read");
        },
    };
    try {
        await bindLanguageToggle({
            preferences: Promise.resolve({ languagePriority: ["de"] }),
        });
        assert.equal(toggle.hidden, true);
    } finally {
        globalThis.document = previousDocument;
        globalThis.localStorage = previousStorage;
    }
});
