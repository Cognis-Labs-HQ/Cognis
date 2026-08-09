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

test("language switcher setting is registered before language tables", () => {
    const switcherIndex = source.indexOf('id: "language-switcher"');
    const availableLanguagesIndex = source.indexOf('id: "available-languages"');
    const preferredLanguagesIndex = source.indexOf('id: "preferred-languages"');

    assert.ok(switcherIndex >= 0);
    assert.ok(switcherIndex < availableLanguagesIndex);
    assert.ok(switcherIndex < preferredLanguagesIndex);
    assert.match(source, /languageSwitcherShow !== false/);
});
