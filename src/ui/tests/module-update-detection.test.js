import test from "node:test";
import assert from "node:assert/strict";
import {
    hasModuleUpdate,
    moduleChangeDirection,
} from "../app/modules/presentation.js";

function installedModule(overrides = {}) {
    return {
        version: "1.0.0",
        installedVersion: "1.0.0",
        installedCommit: "old-commit",
        branches: [{ name: "main", version: "1.0.0", commit: "new-commit" }],
        releases: [],
        ...overrides,
    };
}

test("default-branch commits are offered as updates without a version bump", () => {
    const module = installedModule();

    assert.equal(hasModuleUpdate(module, "main"), true);
    assert.equal(moduleChangeDirection(module, "main"), "update");
});

test("default-branch version bumps are offered as upgrades", () => {
    const module = installedModule({
        branches: [{ name: "main", version: "1.1.0", commit: "new-commit" }],
    });

    assert.equal(hasModuleUpdate(module, "main"), true);
    assert.equal(moduleChangeDirection(module, "main"), "upgrade");
});

test("unchanged installed channels do not offer updates", () => {
    const module = installedModule({ installedCommit: "new-commit" });

    assert.equal(hasModuleUpdate(module, "main"), false);
    assert.equal(moduleChangeDirection(module, "main"), "none");
});
