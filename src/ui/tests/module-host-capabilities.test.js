import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const sources = [
    "src/adapters/social/profile/index.ts",
    "src/adapters/social/messages/index.ts",
    "src/gateways/files/bootstrap.ts",
    "src/gateways/share/bootstrap/index.ts",
    "src/api/main.ts",
].map((path) => readFileSync(resolve(ROOT, path), "utf8"));
const providerCatalog = sources.join("\n");

test("UI capabilities share one global context across asset bundles", () => {
    const uiContext = readFileSync(
        resolve(ROOT, "src/ui/reuse/ui-ctx.js"),
        "utf8",
    );
    assert.match(uiContext, /Symbol\.for\("cognis\.uiCtx"\)/);
    assert.match(uiContext, /globalThis\[UI_CTX_KEY\]/);
    assert.match(uiContext, /"ui:reuse", createReuseResources\(\)/);
});

test("production builds expose every reusable module and stylesheet", () => {
    const buildScript = readFileSync(
        resolve(ROOT, "src/tooling/scripts/build-ui.mjs"),
        "utf8",
    );
    assert.match(buildScript, /src\/ui\/reuse\//);
    assert.match(buildScript, /src\/ui\/styles\/reuse\//);
});

for (const capability of [
    "ui:profileAvatarRenderer",
    "social:profileUiClient",
    "social:messagesUiClient",
    "files:uiClient",
    "share:uiClient",
    "ui:log",
    "ui:showToast",
    "ui:openErrorPopup",
    "ui:resourceLoader",
    "ui:reuse",
]) {
    test(`host registers the module UI capability ${capability}`, () => {
        assert.match(
            providerCatalog,
            new RegExp(capability.replace(":", "\\:")),
        );
    });
}

test("direct and routed module mounts await active UI providers", () => {
    const pageEntry = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-entry.js"),
        "utf8",
    );
    const router = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        pageEntry,
        /mountWithProviders[\s\S]*await ensureHostUiProviders\(\)[\s\S]*mount: mountWithProviders/,
    );
    assert.match(
        router,
        /await ensureHostUiProviders\(\);\s*mod = await loadWithSpaImportGuard\(\(\) => route\.load/,
    );
    assert.match(
        router,
        /runFlow\("authenticate-session"[\s\S]*await ensureHostUiProviders\(\)/,
    );
});

test("the host loader requests navbar and standalone capability providers", () => {
    const loader = readFileSync(
        resolve(ROOT, "src/ui/reuse/ui-provider-loader.js"),
        "utf8",
    );
    assert.match(loader, /\/api\/v1\/ui\/capability-providers/);
    assert.match(loader, /\/api\/v1\/ui\/navbar-plugins/);
    assert.match(loader, /!localStorage\.getItem\("cognis_access_token"\)/);
    assert.match(loader, /response\.status === 401/);
    assert.match(loader, /if \(force\) providersLoaded = false/);
    assert.match(
        loader,
        /"ui:ensureProvidersLoaded",\s*ensureUiProvidersLoaded/,
    );
    assert.match(
        loader,
        /"ui:ensureNavbarPluginsLoaded",\s*ensureNavbarPluginsLoaded/,
    );
});

test("the host resource loader validates and owns external scripts", () => {
    const loader = readFileSync(
        resolve(ROOT, "src/ui/reuse/resource-loader.js"),
        "utf8",
    );
    assert.match(loader, /RESOURCE_ID_PATTERN/);
    assert.match(loader, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
    assert.match(loader, /resources\.set\(normalizedId, resource\)/);
    assert.match(loader, /ui:resourceLoader/);
});

test("the files client is a standalone provider independent of navbar mount", () => {
    const filesBootstrap = readFileSync(
        resolve(ROOT, "src/gateways/files/bootstrap.ts"),
        "utf8",
    );
    assert.match(
        filesBootstrap,
        /registerCapabilityProvider\(\{[\s\S]*files:uiClient/,
    );
    assert.match(filesBootstrap, /registerStaticDir\("files", uiDir\)/);
    assert.doesNotMatch(filesBootstrap, /registerStaticDir\("gateways\/files"/);
    assert.doesNotMatch(
        filesBootstrap,
        /registerNavbarPlugin\(\{[\s\S]*files:uiClient/,
    );
});

test("the profile client is a standalone provider independent of navbar mount", () => {
    const profileBootstrap = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/index.ts"),
        "utf8",
    );
    assert.match(
        profileBootstrap,
        /registerCapabilityProvider\?\.\(\{[\s\S]*social:profileUiClient/,
    );
    assert.match(
        profileBootstrap,
        /registerNavbarPlugin\("\/static\/adapters\/social\/profile\/navbar\.js"\)/,
    );
});

test("navbar plugins mount after the shell and can recover pre-mount imports", () => {
    const messages = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/navbar.js"),
        "utf8",
    );
    const share = readFileSync(
        resolve(ROOT, "src/gateways/share/ui/navbar.js"),
        "utf8",
    );
    assert.match(
        messages,
        /function syncMessagesLink\(\)[\s\S]*document\.querySelector/,
    );
    assert.match(share, /cognis:navbar-refresh/);
});

test("SPA route cleanup preserves shell-owned stylesheets", () => {
    const pageStyles = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-styles.js"),
        "utf8",
    );
    assert.match(pageStyles, /const _managedPageStylesheets = new Set\(\)/);
    assert.doesNotMatch(
        pageStyles,
        /_managedPageStylesheets = new Set\(_initialPageStylesheets\)/,
    );
    assert.match(
        pageStyles,
        /destinationStylesheets\.forEach\(\(href\) => _managedPageStylesheets\.add\(href\)\)/,
    );
    assert.match(
        pageStyles,
        /link\[data-page-stylesheet=["']true["']\]\[href\]/,
        "direct-load route styles must join SPA stylesheet cleanup",
    );
    assert.match(
        pageStyles,
        /ensurePageStylesheet\(href, \{ routeOwned = false \} = \{\}\)/,
        "capability styles must remain mounted unless a route explicitly owns them",
    );
    assert.match(
        pageStyles,
        /ensurePageStylesheet\(href, \{ routeOwned: true \}\)/,
        "route bundles must explicitly opt into navigation cleanup",
    );
});
