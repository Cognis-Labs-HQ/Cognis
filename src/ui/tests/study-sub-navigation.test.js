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
        /\.study-page-subnav \[data-language-code\]\s*\{\s*width: auto;/,
    );
    assert.doesNotMatch(stylesheet, /\.dropdown-item/);
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
        resolve(ROOT, "src/adapters/study/library/ui/app/index.js"),
        "utf8",
    );
    const routerSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );

    assert.match(navigationSource, /data-language-code=/);
    assert.match(navigationSource, /readSelectedStudyLanguageCode/);
    assert.match(navigationSource, /bindStudySubNavigation/);
    assert.match(navigationSource, /resolveRememberedStudyPageUrl/);
    assert.match(
        navigationSource,
        /registeredPageUrls\.has\(rememberedPageUrl\)/,
    );
    assert.match(navigationSource, /studyLastPageUrl/);
    assert.match(navigationSource, /data-study-settings/);
    assert.match(navigationSource, /currentPath !== "\/study\/settings"/);
    assert.match(studyPageSource, /readSelectedStudyLanguageCode\(\)/);
    assert.match(studyPageSource, /history\.state\?\.studyLastPageUrl/);
    assert.match(studyPageSource, /!isSettingsPath && languageCode/);
    assert.match(librarySource, /readSelectedStudyLanguageCode\(\)/);
    assert.doesNotMatch(navigationSource, /withLanguageQuery/);
    assert.doesNotMatch(studyPageSource, /withLanguageQuery/);
    assert.doesNotMatch(librarySource, /withLanguageQuery/);
    assert.doesNotMatch(routerSource, /studyLanguageCode|data-language-code/);
});

test("Study pages redirect to the unavailable page without valid languages", () => {
    const studyPageSource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );
    const childRouteSource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/route.js"),
        "utf8",
    );
    assert.match(
        studyPageSource,
        /registeredLanguages\.length === 0[\s\S]*navigateTo\("\/error\?code=503"\)/,
    );
    assert.match(
        childRouteSource,
        /languages\.length === 0[\s\S]*navigateTo\("\/error\?code=503"\)/,
    );
});

test("Study child loader delegates hub paths after a direct refresh", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/route.js"),
        "utf8",
    );
    assert.match(source, /\["\/study", "\/study\/"/);
    assert.match(source, /import\("\/static\/gateways\/study\/study\.js"\)/);
    assert.match(source, /await hub\.mount\(root, options\)/);
});

test("Study sub-navigation normalizes language codes before resolving flags", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/sub-navigation.js"),
        "utf8",
    );
    assert.match(
        source,
        /const languageCode = parseLanguageCode\(registeredLanguage\?\.code\)/,
    );
    assert.match(
        source,
        /\.map\(\(languageCode\) => parseLanguageCode\(languageCode\)\)/,
    );
    assert.match(source, /\$\{escapeHtml\(language\.flag\)\}/);
});

test("Study page links use light-theme success hover tokens", () => {
    const stylesheet = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.css"),
        "utf8",
    );

    assert.match(
        stylesheet,
        /body\[data-theme="light"\] \.study-hub-module-link:hover,[\s\S]*background: var\(--color-success-hover-bg\);[\s\S]*color: var\(--color-success-outline-text\);/,
    );
});
