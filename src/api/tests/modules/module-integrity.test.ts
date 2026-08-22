import assert from "node:assert/strict";
import test from "node:test";
import { isExcludedModuleIntegrityFile } from "../../reuse/module-integrity.js";

test("module integrity excludes host-managed and conventional alias files", () => {
    assert.equal(isExcludedModuleIntegrityFile(".cognis-install.json"), true);
    assert.equal(isExcludedModuleIntegrityFile("manifest.json"), true);
    assert.equal(isExcludedModuleIntegrityFile("README.md"), true);
    assert.equal(isExcludedModuleIntegrityFile("./README.md"), true);
    assert.equal(isExcludedModuleIntegrityFile("ui/app.js"), false);
    assert.equal(
        isExcludedModuleIntegrityFile("nested/.cognis-install.json"),
        true,
    );
});
