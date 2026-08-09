import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../app/settings/index.js", import.meta.url),
    "utf8",
);

test("date and time settings render independently spaced sections", () => {
    assert.match(
        source,
        /<section class="components-section">[\s\S]*datetime_tz_heading[\s\S]*<\/section>[\s\S]*<section class="components-section">[\s\S]*datetime_time_format_heading/,
    );
});

test("language headings keep actions outside heading elements", () => {
    assert.match(
        source,
        /settings-language-heading-row components-section-heading">[\s\S]*<h3>[\s\S]*preferred_languages[\s\S]*<\/h3>[\s\S]*pref-language-sync-from-browser/,
    );
});

test("language settings render as one block with side-by-side tables", () => {
    assert.match(source, /id: "language-preferences"/);
    assert.match(
        source,
        /settings-language-block[\s\S]*pref-language-switcher-show[\s\S]*settings-language-tables[\s\S]*id="available-languages"[\s\S]*id="preferred-languages"/,
    );
    assert.match(source, /languageSwitcherShow !== false/);
});
