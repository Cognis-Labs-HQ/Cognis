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

for (const capability of [
    "ui:profileAvatarRenderer",
    "social:profileUiClient",
    "social:messagesUiClient",
    "files:uiClient",
    "share:uiClient",
    "ui:log",
    "ui:showToast",
    "ui:openErrorPopup",
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
        /await ensureHostUiProviders\(\);\s*mod = await route\.load/,
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
    assert.doesNotMatch(
        loader,
        /!localStorage\.getItem\("cognis_access_token"\)/,
    );
    assert.match(loader, /response\.status === 401/);
    assert.match(
        loader,
        /"ui:ensureNavbarPluginsLoaded",\s*ensureNavbarPluginsLoaded/,
    );
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
    assert.doesNotMatch(
        filesBootstrap,
        /registerNavbarPlugin\(\{[\s\S]*files:uiClient/,
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
