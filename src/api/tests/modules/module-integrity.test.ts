import assert from "node:assert/strict";
import test from "node:test";
import { isExcludedModuleIntegrityFile } from "../../reuse/module-integrity.js";

test("module integrity excludes generated installation metadata", () => {
    assert.equal(isExcludedModuleIntegrityFile(".cognis-install.json"), true);
    assert.equal(isExcludedModuleIntegrityFile("manifest.json"), true);
    assert.equal(isExcludedModuleIntegrityFile("ui/app.js"), false);
    assert.equal(
        isExcludedModuleIntegrityFile("nested/.cognis-install.json"),
        true,
    );
});
