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
    assert.match(pageEntry, /await ensureHostUiProviders\(\)/);
    assert.match(
        router,
        /await ensureHostUiProviders\(\);\s*mod = await route\.load/,
    );
});
