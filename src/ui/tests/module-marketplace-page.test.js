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

test("module cards and details show upgrade and downgrade versions", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const upArrow = readFileSync(
        resolve(ROOT, "src/ui/public/assets/reuse/arrow-up.svg"),
        "utf8",
    );
    const downArrow = readFileSync(
        resolve(ROOT, "src/ui/public/assets/reuse/arrow-down.svg"),
        "utf8",
    );

    assert.match(source, /function renderAvailableVersion/);
    assert.match(source, /compareVersions\(channel\.version, currentVersion\)/);
    assert.match(source, /module-available-version/);
    assert.match(source, /is-downgrade/);
    assert.match(source, /\$\{renderAvailableVersion\(module\)\}/);
    assert.match(marketplaceStyles, /background: #ffedd5/);
    assert.match(marketplaceStyles, /border-radius: 999px/);
    assert.match(upArrow, /M8 13V3/);
    assert.match(downArrow, /M8 3v10/);
});

test("module details preserve position and update enabled modules atomically", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );

    assert.match(source, /function formatVersion/);
    assert.match(source, /return normalized \? `v\$\{normalized\}` : ""/);
    assert.match(source, /restoreWindowScrollPosition/);
    assert.match(
        source,
        /\["update", "force-update", "change-channel"\]\.includes\(action\)/,
    );
    assert.match(
        source,
        /await setModuleEnabled\(module\.id, false\)[\s\S]*await installModule[\s\S]*await setModuleEnabled\(module\.id, true\)/,
    );
    assert.doesNotMatch(source, /disable_before_update/);
    assert.doesNotMatch(
        source,
        /setModuleEnabled\(module\.id, false\);\s*module\.status = "disabled"/,
    );
});

test("module details use composer refreshes and SPA deep links", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );

    assert.match(source, /createPageComposer\(root, \{/);
    assert.match(source, /composer\?\.refreshElements\(\["module-store"\]\)/);
    assert.match(source, /function detailModuleUuid/);
    assert.match(source, /ui:navigate/);
    assert.match(
        source,
        /`\/administration\/modules\/\$\{encodeURIComponent\(module\.uuid\)\}`/,
    );
    assert.match(source, /"\/administration\/modules"/);
    assert.doesNotMatch(source, /selectedModule = module/);
});

test("module marketplace identifies immutable trusted sources", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /source\.trusted/);
    assert.match(source, /ui\.app\.modules\.default_source/);
});

test("recommended modules include the published Cognis HQ modules", () => {
    const recommended = JSON.parse(
        readFileSync(
            resolve(ROOT, "src/ui/public/recommended-modules.json"),
            "utf8",
        ),
    );
    assert.deepEqual(recommended, [
        "f055f2e5-227a-5fb4-b934-5397ec32cf2d",
        "5bb6105d-14d2-5d9d-a284-b2969fb4e35d",
        "e10c016f-8a15-5ec2-8188-c1657dfbe829",
    ]);
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
    assert.match(
        pageSource,
        /\/static\/assets\/reuse\/module-icon-unknown\.svg/,
    );
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
    assert.match(source, /async function loadKnownModules/);
    assert.match(source, /loadCachedModules\(\)/);
    assert.match(source, /const catalogPresentation =/);
    assert.match(source, /Object\.assign\(known, catalogPresentation\)/);
    assert.match(source, /async function discoverConfiguredSources/);
    assert.match(source, /loadModuleSources\(\)/);
    assert.match(
        source,
        /await loadAvailableModules\(tokens, \[\s*source\.uuid/,
    );
    assert.match(source, /target\.id === "module-source-refresh"/);
    assert.match(source, /ui\.app\.modules\.refresh_complete/);
    assert.match(source, /void refreshMarketplaceData\(\)/);
});

test("module installation failures stay local to the marketplace action", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/api.js"),
        "utf8",
    );
    assert.match(
        source,
        /installModule[\s\S]*suppressConnectionRecoveryToast: true/,
    );
    assert.match(source, /detail\?\.message/);
    assert.match(source, /error\.code = detail\?\.code/);
});

test("module sources use an independent list and editor", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /function renderSourceManager/);
    assert.match(source, /function renderSourceForm/);
    assert.match(source, /module-settings-sources/);
    assert.match(source, /id: "editor"/);
    assert.doesNotMatch(source, /id="module-source-settings"/);
    assert.match(source, /source\.trusted/);
    assert.match(source, /data-edit-source/);
    assert.match(source, /data-remove-source/);
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
    assert.match(
        source,
        /module-detail-navigation[\s\S]*module-detail-back[\s\S]*\$\{advanced\}/,
    );
    assert.doesNotMatch(
        source,
        /module-detail-actions[^`]*renderLifecycleActions\(module\)\}\$\{advanced\}/,
    );
    assert.match(source, /selectedModule = null/);
    assert.match(source, /target\.classList\.contains\("module-store-card"\)/);
    assert.match(source, /renderLifecycleButton\(module, "install"/);
    assert.match(source, /renderLifecycleButton\(module, "enable"/);
    assert.match(source, /renderLifecycleButton\(module, "disable"/);
    assert.match(source, /renderLifecycleButton\(module, "uninstall"/);
    assert.match(source, /renderLifecycleButton\(module, "update"/);
    assert.match(source, /data-module-branch/);
    assert.match(source, /!module\.installed && module\.branches\?\.length/);
    assert.match(source, /openHamburgerMenu/);
    assert.match(source, /data-module-menu/);
    assert.match(
        source,
        /id: "force-update"[\s\S]*variant: "danger"[\s\S]*id: "change-channel"/,
    );
    assert.match(source, /async function selectReleaseChannel/);
    assert.match(source, /class="module-release-channel-list"/);
    assert.match(source, /data-release-channel/);
    assert.match(
        source,
        /selectedBranches\.set\(module\.uuid, releaseChannel\)/,
    );
    assert.match(
        source,
        /\["update", "force-update", "change-channel"\]\.includes\(action\)[\s\S]*module\.status === "enabled"/,
    );
    assert.match(
        source,
        /setModuleEnabled\(module\.id, false\)[\s\S]*installModule\([\s\S]*module,[\s\S]*token,[\s\S]*branch,[\s\S]*\)[\s\S]*setModuleEnabled\(module\.id, true\)/,
    );
    assert.doesNotMatch(source, /class="theme-select" data-module-branch/);
    assert.match(source, /function selectedBranch/);
    assert.match(source, /function hasModuleUpdate/);
    assert.match(source, /module\.defaultBranch/);
    assert.match(source, /module\.installedCommit/);
    assert.match(source, /modulesForView\(\)\.flatMap/);
    assert.match(source, /formatTag\(item\)/);
    assert.match(source, /capture: true/);
    assert.match(source, /composer\?\.refreshElements\(\["module-store"\]\)/);
    assert.doesNotMatch(source, /composer\.refresh\(elements\(\)\)/);
});

test("module marketplace uses curated recommendations and compact details", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /loadModuleMarketplaceSettings/);
    assert.match(source, /recommendedModulesUrl/);
    assert.match(source, /id="module-marketplace-settings"/);
    assert.match(source, /module-icon-settings/);
    assert.match(source, /module-icon-refresh/);
    assert.match(source, /module-icon-back/);
    assert.match(source, /module-detail-license/);
    assert.match(source, /module\.status = "disabled"/);
    assert.match(source, /cognis:navbar-plugins-refresh/);
    assert.match(source, /cognis:module-lifecycle-changed/);
    assert.match(source, /void loadKnownModules\(\)\.catch/);
    assert.match(marketplaceStyles, /\.module-detail[\s\S]*width: 100%/);
    assert.match(marketplaceStyles, /arrow-back-light\.svg/);
    assert.match(marketplaceStyles, /arrow-back-dark\.svg/);
    assert.match(marketplaceStyles, /refresh-light\.svg/);
    assert.match(marketplaceStyles, /refresh-dark\.svg/);
    assert.match(marketplaceStyles, /settings-cog-light\.svg/);
    assert.match(marketplaceStyles, /settings-cog-dark\.svg/);
});

test("module marketplace defaults to all statuses and bounds installs", () => {
    const pageSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const apiSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/api.js"),
        "utf8",
    );
    assert.match(pageSource, /let view = "all"/);
    assert.match(
        pageSource,
        /\["all", "recommended", "installed", "available"\]/,
    );
    assert.match(pageSource, /item === "all" \? "ui\.reuse\.all"/);
    assert.match(apiSource, /MODULE_INSTALL_TIMEOUT_MS = 2 \* 60 \* 1000/);
    assert.match(apiSource, /timeoutMs: MODULE_INSTALL_TIMEOUT_MS/);
});

test("module marketplace exposes releases and pending action feedback", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const loadingSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/button-loading.js"),
        "utf8",
    );
    const loadingStyles = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/button-loading.css"),
        "utf8",
    );
    assert.match(source, /module\.releases/);
    assert.match(source, /ui\.app\.modules\.releases/);
    assert.match(source, /beginButtonLoading\(target\)/);
    assert.match(source, /pendingModuleActions\.set\(module\.uuid, action\)/);
    assert.match(source, /pendingModuleActions\.delete\(module\.uuid\)/);
    assert.match(source, /isPending \? " button-loading"/);
    assert.match(source, /ui\.app\.modules\.installing/);
    assert.match(source, /ui\.app\.modules\.upgrading/);
    assert.match(source, /ui\.app\.modules\.downgrading/);
    assert.match(source, /ui\.app\.modules\.changing_release_channel/);
    assert.match(source, /variant: "confirm"/);
    assert.match(source, /module\.restartRequired/);
    assert.match(source, /ui\.app\.modules\.restart_required/);
    assert.match(source, /module-detail-release/);
    assert.match(source, /module-release-channel-list/);
    assert.match(marketplaceStyles, /button\.is-active/);
    assert.match(source, /i18n\.t\("ui\.reuse\.installed"\)/);
    assert.match(
        marketplaceStyles,
        /\.module-release-channel-list[\s\S]*overflow-y: auto/,
    );
    assert.match(source, /module_lifecycle_action_failed/);
    assert.match(source, /github_connection_timeout/);
    assert.match(source, /github_timeout_warning/);
    assert.match(loadingSource, /classList\.add\("button-loading"\)/);
    assert.match(loadingStyles, /@keyframes button-loading-spin/);
});

test("module details rotate bounded screenshots with manual navigation", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /data-screenshot-step="-1"/);
    assert.match(source, /data-screenshot-step="1"/);
    assert.match(source, /window\.setInterval[\s\S]*5000/);
    assert.match(source, /is-previous/);
    assert.match(source, /is-next/);
    assert.match(marketplaceStyles, /max-height: 28rem/);
    assert.match(marketplaceStyles, /opacity: 0\.24/);
    assert.match(marketplaceStyles, /transform 420ms ease/);
});

test("module marketplace omits template manifests", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /return module\.template !== true/);
    assert.match(source, /isVisibleMarketplaceModule\(module\)/);
});

test("module marketplace refresh actions emit one completion result", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /if \(marketplaceRefreshPending\) return/);
    assert.match(source, /marketplaceRefreshPending = true/);
    assert.match(
        source,
        /finally \{\s*marketplaceRefreshPending = false;\s*\}/,
    );
});

test("catalog presentation updates win over installed manifest metadata", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /const catalogPresentation =/);
    assert.match(source, /name: known\.name/);
    assert.match(source, /description: known\.description/);
    assert.match(source, /assets: known\.assets/);
    assert.match(source, /Object\.assign\(known, catalogPresentation\)/);
});
