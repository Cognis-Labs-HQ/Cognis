import test from "node:test";
import assert from "node:assert/strict";
import { versionModuleUiAssets } from "../../reuse/module-ui-assets.js";

test("module updates change browser import identities without versioning bundle directories or foreign assets", () => {
    const descriptor = {
        scriptUrl: "/static/modules/legal/app.js?v=development",
        stylesheets: ["/static/modules/legal/styles/legal.css"],
        stringsBaseUrl: "/static/modules/legal/languages",
        foreign: "/static/reuse/i18n.js",
    };
    const previous = versionModuleUiAssets(descriptor, "legal", "1.0.0");
    const updated = versionModuleUiAssets(descriptor, "legal", "1.0.1");
    assert.notEqual(previous.scriptUrl, updated.scriptUrl);
    assert.equal(
        updated.scriptUrl,
        "/static/modules/legal/app.js?v=development&revision=1.0.1",
    );
    assert.deepEqual(updated.stylesheets, [
        "/static/modules/legal/styles/legal.css?revision=1.0.1",
    ]);
    assert.equal(updated.stringsBaseUrl, descriptor.stringsBaseUrl);
    assert.equal(updated.foreign, descriptor.foreign);
});
