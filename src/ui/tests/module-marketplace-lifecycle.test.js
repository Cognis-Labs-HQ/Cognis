import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("module lifecycle actions are serialized without dropping queued work", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const pollingSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/polling.js"),
        "utf8",
    );

    assert.match(source, /createSerializedOperationQueue\(\)/);
    assert.match(pollingSource, /queue\.then\(operation, operation\)/);
    assert.match(
        source,
        /await queueModuleLifecycleAction\(\(\) =>\s*runLifecycleAction/,
    );
});

test("module refresh preserves its current view and redraws detail actions", () => {
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(marketplaceSource, /loadKnownModules\(true, mountSignal\)/);
    assert.match(
        marketplaceSource,
        /async function loadKnownModules\([\s\S]*restoreDetailRoute = false[\s\S]*signal = pageMountController\?\.signal/,
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
    assert.doesNotMatch(
        source,
        /mountSignal\.addEventListener\("abort", clearAuthenticatedModuleAssets/,
    );
});
