import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
    isExcludedModuleIntegrityFile,
    resolveModuleIntegrityFile,
} from "../../reuse/module-integrity.js";

test("module integrity excludes host-managed and conventional alias files", () => {
    assert.equal(isExcludedModuleIntegrityFile(".cognis-install.json"), true);
    assert.equal(isExcludedModuleIntegrityFile("manifest.json"), true);
    assert.equal(isExcludedModuleIntegrityFile("README.md"), true);
    assert.equal(isExcludedModuleIntegrityFile("./README.md"), true);
    assert.equal(isExcludedModuleIntegrityFile("CHANGELOG.md"), true);
    assert.equal(
        isExcludedModuleIntegrityFile("docs/changelog/1.2.3.en.md"),
        true,
    );
    assert.equal(isExcludedModuleIntegrityFile("ui/app.js"), false);
    assert.equal(
        isExcludedModuleIntegrityFile("nested/.cognis-install.json"),
        true,
    );
});

test("module integrity resolves safe file symlinks within a module", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-integrity-"));
    try {
        await mkdir(path.join(root, ".github"));
        const target = path.join(root, ".github/copilot-instructions.md");
        await writeFile(target, "# Instructions\n");
        await symlink(
            ".github/copilot-instructions.md",
            path.join(root, "AGENTS.md"),
        );
        assert.equal(
            await resolveModuleIntegrityFile(root, "AGENTS.md"),
            target,
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("module integrity rejects symlinks that escape the module", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-integrity-"));
    const external = `${root}-external`;
    try {
        await writeFile(external, "outside\n");
        await symlink(external, path.join(root, "AGENTS.md"));
        assert.equal(await resolveModuleIntegrityFile(root, "AGENTS.md"), null);
    } finally {
        await rm(root, { recursive: true, force: true });
        await rm(external, { force: true });
    }
});
