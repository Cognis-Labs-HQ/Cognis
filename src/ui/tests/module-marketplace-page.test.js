import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    applyModuleFilterSelection,
    createModuleFilters,
    filterModules,
    renderModuleFilters,
} from "../app/modules/filters.js";
import {
    assertRequiredModulePreferences,
    missingRequiredModulePreferenceKeys,
    readModulePreferenceValues,
    renderModulePreferenceField,
} from "../app/modules/preferences.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const marketplaceStyles = readFileSync(
    resolve(ROOT, "src/ui/styles/modules.css"),
    "utf8",
);
const popupStyles = readFileSync(
    resolve(ROOT, "src/ui/styles/popup.css"),
    "utf8",
);
const popupSource = readFileSync(
    resolve(ROOT, "src/ui/reuse/popup.js"),
    "utf8",
);
const filterSource = readFileSync(
    resolve(ROOT, "src/ui/app/modules/filters.js"),
    "utf8",
);
const moduleApiSource = readFileSync(
    resolve(ROOT, "src/ui/app/modules/api.js"),
    "utf8",
);
const modulePreferencesSource = readFileSync(
    resolve(ROOT, "src/ui/app/modules/preferences.js"),
    "utf8",
);

test("modules navigation derives its width from its content", () => {
    assert.match(
        marketplaceStyles,
        /\[data-module-sidebar\]\s*{[^}]*width: max-content;[^}]*max-width: 100%/,
    );
    assert.match(
        marketplaceStyles,
        /\[data-module-sidebar\] button\s*{[^}]*width: fit-content;[^}]*min-width: 0/,
    );
});

test("module preference fields use stable popup layout and descriptor tooltips", () => {
    const field = renderModulePreferenceField(
        {
            key: "instance-url",
            label: "Instance URL",
            description: "HTTPS deployment URL",
            type: "string",
        },
        "https://meet.example.com",
        "More information",
    );

    assert.match(field, /module-settings-popup-field/);
    assert.match(field, /module-settings-popup-label-row/);
    assert.match(field, /class="info-tooltip"/);
    assert.doesNotMatch(field, /<small>/);
    assert.match(
        popupStyles,
        /module-settings-popup-field > input:not\(\[type="checkbox"\]\)/,
    );
    assert.match(
        popupSource,
        /renderInfoTooltip\([\s\S]*description[\s\S]*ui\.reuse\.more_information/,
    );
    assert.doesNotMatch(popupSource, /module-settings-popup-description/);
    assert.match(
        popupSource,
        /querySelector\("input, textarea, select"\) \?\?[\s\S]*button:not\(\.popup-close-btn\)/,
    );
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(
        marketplaceSource,
        /didSave = await openModulePreferences[\s\S]*if \(didSave\)[\s\S]*preferences_saved/,
    );
});

test("module settings use manifest translations and module-owned config routes", () => {
    assert.match(
        moduleApiSource,
        /\/modules\/\$\{encodeURIComponent\(moduleId\)\}\/config/,
    );
    assert.match(moduleApiSource, /method: "PUT"/);
    assert.match(modulePreferencesSource, /definition\.labelKey/);
    assert.match(modulePreferencesSource, /definition\.descriptionKey/);
    assert.match(modulePreferencesSource, /module\.ui\?\.stringsBaseUrl/);
});

test("module filters include modules matching any active category", () => {
    const filters = createModuleFilters();
    assert.equal(
        applyModuleFilterSelection(filters, { storeCategory: "productivity" }),
        true,
    );
    const modules = [
        {
            id: "notes",
            tags: ["productivity", "collaboration"],
        },
        { id: "tasks", tags: ["productivity"] },
        { id: "meetings", tags: ["collaboration"] },
    ];

    assert.deepEqual(
        filterModules(modules, filters).map((module) => module.id),
        ["notes", "tasks"],
    );
    applyModuleFilterSelection(filters, { storeCategory: "collaboration" });
    assert.deepEqual(
        filterModules(modules, filters).map((module) => module.id),
        ["notes", "tasks", "meetings"],
    );
    applyModuleFilterSelection(filters, { storeCategory: "collaboration" });
    assert.deepEqual(
        filterModules(modules, filters).map((module) => module.id),
        ["notes", "tasks"],
    );
});

test("module filters expose every selected state", () => {
    const filters = createModuleFilters();
    applyModuleFilterSelection(filters, { storeView: "installed" });
    applyModuleFilterSelection(filters, { storeCategory: "productivity" });
    applyModuleFilterSelection(filters, { storeCategory: "collaboration" });
    const html = renderModuleFilters(
        ["productivity", "collaboration"],
        filters,
        {
            i18n: { t: (key) => key },
            escapeHtml: (value) => value,
            formatTag: (value) => value,
        },
    );

    assert.match(html, /data-store-view="installed" aria-pressed="true"/);
    assert.match(
        html,
        /data-store-category="productivity" aria-pressed="true"/,
    );
    assert.match(
        html,
        /data-store-category="collaboration" aria-pressed="true"/,
    );
    assert.match(
        marketplaceStyles,
        /\[data-module-sidebar\] button\.is-active\s*{[^}]*border-color: var\(--accent-color\)/,
    );
});

test("module marketplace passes root and options to the page composer", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /createPageComposer\(root, \{/);
    assert.match(source, /if \(globalThis\.__spaRouter && !signal\) return/);
    assert.match(source, /allowCustomization: false/);
    assert.match(source, /i18n,/);
    assert.match(source, /signal,/);
    assert.match(source, /max: "full"/);
    assert.match(source, /const finishPageLoading = beginPageLoading\(\)/);
    assert.match(source, /finally \{\s*finishPageLoading\(\)/);
});

test("module marketplace cards keep consistent content and action geometry", () => {
    assert.match(marketplaceStyles, /-webkit-line-clamp: 2/);
    assert.match(
        marketplaceStyles,
        /\.module-store-card-actions[\s\S]*grid-auto-columns: minmax\(0, 1fr\)[\s\S]*grid-auto-flow: column/,
    );
    assert.doesNotMatch(marketplaceStyles, /flex-wrap: nowrap/);
});

test("module marketplace content keeps a stable Modules heading", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /<h2>\$\{escapeHtml\(i18n\.t\("ui\.reuse\.modules"\)\)\}<\/h2>/,
    );
    assert.doesNotMatch(
        source,
        /<h2>\$\{escapeHtml\(viewLabel\(view\)\)\}<\/h2>/,
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
    assert.match(
        marketplaceStyles,
        /body\[data-theme="dark"\] \.module-available-version\.is-downgrade/,
    );
    assert.match(
        marketplaceStyles,
        /body:has\(\.module-detail\) \.global-topbar[\s\S]*background-color/,
    );
    assert.match(upArrow, /M8 13V3/);
    assert.match(downArrow, /M8 3v10/);
});

test("module details preserve position and update enabled modules atomically", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const presentationSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/presentation.js"),
        "utf8",
    );

    assert.match(presentationSource, /function formatVersion/);
    assert.match(
        presentationSource,
        /return normalized \? `v\$\{normalized\}` : ""/,
    );
    assert.match(source, /restoreWindowScrollPosition/);
    assert.match(
        source,
        /\["update", "force-update", "change-channel"\]\.includes\(action\)/,
    );
    assert.match(
        source,
        /await setModuleEnabled\(module\.id, false\)[\s\S]*await installModule[\s\S]*await enableModuleWithIntegrityCheck\(/,
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
    const presentationSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/presentation.js"),
        "utf8",
    );

    assert.match(source, /createPageComposer\(root, \{/);
    assert.match(source, /composer\?\.refreshElements\(\["module-store"\]\)/);
    assert.match(presentationSource, /function detailModuleUuid/);
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
    assert.match(source, /const locked = source\?\.trusted/);
    assert.match(source, /const sourceValues = selectedSource\?\.trusted/);
    assert.match(source, /const STORED_PAT_MASK = "\*\*\*\*"/);
    assert.match(source, /values\.token !== STORED_PAT_MASK/);
    assert.match(source, /await validateModuleSourceCredential/);
    assert.match(source, /if \(!validation\.valid\)/);
    assert.match(source, /credential_validation_warning/);
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

test("module pictures remain hidden until their refreshed image is ready", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const carouselSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/carousel.js"),
        "utf8",
    );
    assert.match(source, /module-store-avatar module-picture/);
    assert.match(source, /width="64" height="64"/);
    assert.match(carouselSource, /function revealLoadedModulePictures/);
    assert.match(
        carouselSource,
        /picture\.complete && picture\.naturalWidth > 0/,
    );
    assert.match(source, /event\.target\.classList\.add\("is-loaded"\)/);
    assert.match(
        marketplaceStyles,
        /\.module-picture\s*{[^}]*visibility: hidden/,
    );
    assert.match(
        marketplaceStyles,
        /\.module-picture\.is-loaded\s*{[^}]*visibility: visible/,
    );
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
        /loadAvailableModules\(\s*tokens,\s*sources\.map\(\(source\) => source\.uuid\),\s*forceRefresh/,
    );
    assert.match(source, /discoverConfiguredSources\(true\)/);
    assert.match(source, /target\.id === "module-source-refresh"/);
    assert.match(source, /ui\.app\.modules\.refresh_complete/);
    assert.match(source, /await refreshMarketplaceData\(\)/);
    assert.match(source, /void loadKnownModules\(\)\.catch/);
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
    const presentationSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/presentation.js"),
        "utf8",
    );
    assert.match(source, /data-module-uuid/);
    assert.match(source, /renderMarkdown\(module\.readme/);
    assert.match(source, /module-detail-screenshots/);
    assert.match(source, /data-module-back/);
    assert.match(source, /renderSidebar\(categories\)/);
    assert.match(source, /module-detail-back/);
    assert.match(source, /module-detail-advanced/);
    assert.match(
        source,
        /module-detail-header-actions[^`]*\$\{advanced\}\$\{settings\}/,
    );
    assert.match(
        source,
        /module-detail-settings[^`]*data-module-preferences[^`]*module-icon-settings/,
    );
    assert.match(source, /getFloatingSlot\(pageRoot, "module-actions"\)/);
    assert.match(source, /renderDetailActions\(selectedModule\)/);
    assert.match(source, /function refreshDetailActions\(\)/);
    assert.match(source, /floatingMenu: \[/);
    assert.match(source, /subPageNavigation: true/);
    assert.doesNotMatch(source, /toolbarScrollable:/);
    assert.doesNotMatch(source, /contentScrolling:/);
    assert.doesNotMatch(marketplaceStyles, /\.module-store-sidebar/);
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
    assert.match(source, /confirmModuleUninstall\(i18n\)/);
    assert.match(source, /uninstallModule\(module\.uuid, options\)/);
    assert.match(source, /renderLifecycleButton\(module, "update"/);
    assert.match(source, /data-module-branch/);
    assert.match(source, /!module\.installed && module\.branches\?\.length/);
    assert.match(source, /openHamburgerMenu/);
    assert.match(source, /data-module-menu/);
    assert.match(
        marketplaceStyles,
        /\[data-floating-slot="module-actions"\][\s\S]*align-items: center/,
    );
    assert.match(
        marketplaceStyles,
        /\.module-detail-header[\s\S]*justify-content: space-between/,
    );
    assert.match(
        source,
        /id: "force-update"[\s\S]*variant: "danger"[\s\S]*id: "change-channel"/,
    );
    assert.match(source, /async function selectReleaseChannel/);
    assert.match(source, /class="module-release-channel-list"/);
    assert.match(source, /data-release-channel/);
    assert.match(source, /selectedBranches\.set\(module\.uuid, branch\)/);
    assert.match(
        source,
        /if \(releaseChannel === module\.installedBranch\) return/,
    );
    assert.match(source, /if \(module\.restartRequired\) return/);
    assert.match(
        source,
        /\["update", "force-update", "change-channel"\]\.includes\(action\)[\s\S]*module\.status === "enabled"/,
    );
    assert.match(
        source,
        /setModuleEnabled\(module\.id, false\)[\s\S]*installModule\([\s\S]*module,[\s\S]*token,[\s\S]*branch,[\s\S]*\)[\s\S]*enableModuleWithIntegrityCheck\(/,
    );
    assert.doesNotMatch(source, /class="theme-select" data-module-branch/);
    assert.match(source, /function selectedBranch/);
    assert.match(presentationSource, /function hasModuleUpdate/);
    assert.match(source, /module\.defaultBranch/);
    assert.match(presentationSource, /module\.installedCommit/);
    assert.match(source, /filterModules\(modules, \{/);
    assert.match(source, /categories: new Set\(\)/);
    assert.match(source, /formatTag,/);
    assert.match(filterSource, /formatTag\(item\)/);
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
    const apiSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/api.js"),
        "utf8",
    );
    const filters = createModuleFilters();
    assert.equal(filters.view, "all");
    assert.equal(filters.categories.size, 0);
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
    const presentationSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/presentation.js"),
        "utf8",
    );
    assert.match(source, /module\.releases/);
    assert.match(source, /ui\.app\.modules\.releases/);
    assert.match(source, /beginButtonLoading\(target\)/);
    assert.match(source, /pendingModuleActions\.set\(module\.uuid, action\)/);
    assert.match(presentationSource, /function moduleChangeDirection/);
    assert.match(source, /action = changeDirection/);
    assert.match(
        readFileSync(
            resolve(ROOT, "src/ui/app/modules/languages/en/strings.xml"),
            "utf8",
        ),
        /ui\.app\.modules\.downgrade_complete/,
    );
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
    const carouselSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/carousel.js"),
        "utf8",
    );
    assert.match(source, /data-screenshot-step="-1"/);
    assert.match(source, /data-screenshot-step="1"/);
    assert.match(carouselSource, /window\.setInterval[\s\S]*5000/);
    assert.match(carouselSource, /is-previous/);
    assert.match(carouselSource, /is-next/);
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

test("module refresh preserves its current view and redraws detail actions", () => {
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(marketplaceSource, /loadKnownModules\(true\)/);
    assert.match(
        marketplaceSource,
        /async function loadKnownModules\(restoreDetailRoute = false\)/,
    );
    assert.match(
        marketplaceSource,
        /selectedModule = selectedModuleUuid[\s\S]*refreshMarketplace\(\)/,
    );
    assert.match(
        marketplaceSource,
        /function refreshMarketplace\(\)[\s\S]*refreshDetailActions\(\)/,
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

test("modules page aborts direct-mount interactions before SPA remount", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /replaceMountScope\(pageMountController, signal\)/);
    assert.match(source, /bindInteractions\(root, mountSignal\)/);
    assert.match(source, /signal:\s*mountSignal/);
});

test("required module configuration distinguishes unset values from valid false values", () => {
    const definitions = [
        { key: "instanceUrl", type: "string", required: true },
        { key: "meetingPrefix", type: "string" },
        { key: "recording", type: "boolean", required: true },
        { key: "capacity", type: "number", required: true },
    ];
    assert.deepEqual(
        missingRequiredModulePreferenceKeys(definitions, {
            instanceUrl: " ",
            recording: false,
            capacity: Number.NaN,
        }),
        ["instanceUrl", "capacity"],
    );
    assert.deepEqual(
        missingRequiredModulePreferenceKeys(definitions, {
            instanceUrl: "https://meet.example.com",
            recording: false,
            capacity: 0,
        }),
        [],
    );
    assert.match(
        renderModulePreferenceField(
            {
                key: "instanceUrl",
                type: "string",
                label: "Instance URL",
                required: true,
            },
            "",
            "Information",
        ),
        / required>/,
    );
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(marketplaceSource, /action === "enable"[\s\S]*activateModule/);
    const inputs = {
        apiKey: { value: "secret-value" },
        enabled: { checked: false },
        limit: { value: "12" },
    };
    assert.deepEqual(
        readModulePreferenceValues(
            {
                elements: {
                    namedItem(key) {
                        return inputs[key];
                    },
                },
            },
            [
                { key: "apiKey", type: "string" },
                { key: "enabled", type: "boolean" },
                { key: "limit", type: "number" },
            ],
        ),
        { apiKey: "secret-value", enabled: false, limit: 12 },
    );
});

test("disabled modules defer required config checks when their owned route is not mounted", async () => {
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const module = {
        id: "jitsi-meet",
        ui: {
            preferences: [
                { key: "instanceUrl", type: "string", required: true },
            ],
        },
    };
    assert.equal(
        await assertRequiredModulePreferences(
            module,
            "Configuration required",
            () =>
                Promise.reject(
                    Object.assign(new Error("Route not found"), {
                        status: 404,
                    }),
                ),
        ),
        false,
    );
    await assert.rejects(
        () =>
            assertRequiredModulePreferences(
                module,
                "Configuration required",
                () => Promise.resolve({ instanceUrl: "" }),
            ),
        (error) => error.code === "module_config_required",
    );
    const activationSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/activation.js"),
        "utf8",
    );
    assert.match(
        activationSource,
        /configRouteAvailable[\s\S]*openModulePreferences[\s\S]*setModuleEnabled\(module\.id, false\)/,
    );
    assert.doesNotMatch(
        activationSource,
        /if \(!result \|\| configRouteAvailable\)/,
    );
    assert.match(modulePreferencesSource, /readModulePreferenceValues/);
    assert.match(
        marketplaceSource,
        /if \(wasDisabled\)[\s\S]*enableModuleWithIntegrityCheck[\s\S]*openModulePreferences[\s\S]*finally[\s\S]*setModuleEnabled\(module\.id, false\)/,
    );
});

test("module enablement presents and acknowledges SHASUM integrity risks", () => {
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const integritySource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/integrity.js"),
        "utf8",
    );
    const apiSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/api.js"),
        "utf8",
    );
    assert.match(marketplaceSource, /action === "enable"[\s\S]*activateModule/);
    assert.match(integritySource, /entry\.status === "missing_shasum"/);
    assert.match(integritySource, /entry\.status === "missing"/);
    assert.match(integritySource, /labels\.mismatch/);
    assert.match(integritySource, /variant: "cancel"/);
    assert.match(
        integritySource,
        /await setModuleEnabled\(moduleId, true\);[\s\S]*return true/,
    );
    assert.match(
        apiSource,
        /"x-cognis-module-integrity-risk":\s*`accepted:\$\{integrityAcknowledgementToken\}`/,
    );
});
