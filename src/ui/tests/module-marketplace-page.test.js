import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const marketplaceStyles = readFileSync(
    resolve(ROOT, "src/ui/styles/modules.css"),
    "utf8",
);

test("module marketplace passes root and options to the page composer", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /createPageComposer\(root, \{/);
    assert.match(source, /allowCustomization: false/);
    assert.match(source, /i18n,/);
    assert.match(source, /signal,/);
    assert.match(source, /max: "full"/);
});

test("module marketplace cards keep consistent content and action geometry", () => {
    assert.match(marketplaceStyles, /-webkit-line-clamp: 2/);
    assert.match(
        marketplaceStyles,
        /\.module-store-card-actions[\s\S]*flex-wrap: nowrap/,
    );
    assert.match(
        marketplaceStyles,
        /\.module-store-card-actions button[\s\S]*flex: 1 1 0/,
    );
});

test("module marketplace identifies immutable trusted sources", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /source\.trusted/);
    assert.match(source, /ui\.app\.modules\.trusted/);
});

test("module marketplace does not resolve repository-relative avatars against the page URL", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /const avatarUrl = resolveModuleAssetUrl/);
    assert.match(
        source,
        /if \(candidate\.startsWith\("\/"\)\) return candidate/,
    );
    assert.match(source, /parsed\.protocol === "https:"/);
});

test("module marketplace replaces unavailable icons with the unknown icon", () => {
    const pageSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const errorHandlerSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const fallbackIcon = readFileSync(
        resolve(ROOT, "src/ui/public/assets/reuse/module-icon-unknown.svg"),
        "utf8",
    );
    assert.match(pageSource, /data-resource-fallback/);
    assert.match(pageSource, /module-icon-unknown\.svg/);
    assert.match(errorHandlerSource, /dataset\.resourceFallback/);
    assert.match(fallbackIcon, /class="mark"/);
});

test("module marketplace refreshes every configured source on demand", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /id="module-source-refresh"/);
    assert.match(source, /ui\.reuse\.refresh/);
    assert.match(source, /async function loadMarketplaceCatalog/);
    assert.match(source, /loadModuleSources\(\)/);
    assert.match(source, /await loadAvailableModules\(tokens\)/);
    assert.match(source, /target\.id === "module-source-refresh"/);
    assert.match(source, /ui\.app\.modules\.refresh_complete/);
});

test("module marketplace opens repository readmes in a full detail view", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /data-module-uuid/);
    assert.match(source, /renderMarkdown\(module\.readme/);
    assert.match(source, /module-detail-screenshots/);
    assert.match(source, /data-module-back/);
    assert.match(source, /renderSidebar\(categories\)/);
    assert.match(source, /module-detail-back/);
    assert.match(source, /selectedModule = null/);
    assert.match(source, /target\.classList\.contains\("module-store-card"\)/);
    assert.match(source, /data-module-install/);
    assert.match(source, /data-module-enable/);
    assert.match(source, /data-module-disable/);
    assert.match(source, /data-module-uninstall/);
    assert.match(source, /modulesForView\(\)\.flatMap/);
    assert.match(source, /formatTag\(item\)/);
    assert.match(source, /capture: true/);
    assert.match(source, /composer\.refreshElements\(\["module-store"\]\)/);
    assert.doesNotMatch(source, /composer\.refresh\(elements\(\)\)/);
});
