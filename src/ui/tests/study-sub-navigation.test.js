import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Study submenu links use the user-dropdown button class", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/sub-navigation.js"),
        "utf8",
    );
    const stylesheet = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.css"),
        "utf8",
    );
    const studyPage = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );

    assert.match(source, /class="dropdown-item\$\{activeClass\}"/);
    assert.match(source, /class="dropdown-item\$\{settingsActiveClass\}"/);
    assert.doesNotMatch(
        source,
        /class="[^"]*study-subnav-(?:link|module-link|language-option|settings-link)(?:\s|"|\$)/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.study-subnav-(?:module-link|language-option|settings-link)(?:\s|,|\{|:)/,
    );
    assert.doesNotMatch(
        studyPage,
        /class="[^"]*study-subnav-(?:module-link|language-option|settings-link)(?:\s|"|\$)/,
    );
    assert.match(
        stylesheet,
        /\.study-page-subnav \.dropdown-item\s*\{\s*width: auto;/,
    );
    assert.match(source, /<ul class="page-subnav-list study-subnav-settings">/);
    assert.match(
        studyPage,
        /<ul class="page-subnav-list study-subnav-settings">/,
    );
});

test("Study navigation stores language selection on buttons instead of URLs", () => {
    const navigationSource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/sub-navigation.js"),
        "utf8",
    );
    const studyPageSource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );
    const librarySource = readFileSync(
        resolve(ROOT, "src/adapters/study/library/ui/app.js"),
        "utf8",
    );

    assert.match(navigationSource, /data-language-code=/);
    assert.match(navigationSource, /readSelectedStudyLanguageCode/);
    assert.match(studyPageSource, /readSelectedStudyLanguageCode\(\)/);
    assert.match(librarySource, /readSelectedStudyLanguageCode\(\)/);
    assert.doesNotMatch(navigationSource, /withLanguageQuery/);
    assert.doesNotMatch(studyPageSource, /withLanguageQuery/);
    assert.doesNotMatch(librarySource, /withLanguageQuery/);
});
