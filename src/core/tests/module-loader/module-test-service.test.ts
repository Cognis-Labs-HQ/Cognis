import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ModuleTestService, discoverTestFiles } from "../../index.js";

async function createModule(testBody: string) {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-module-tests-"));
    const moduleRoot = path.join(root, "checkout-by-uuid");
    await mkdir(path.join(moduleRoot, "tests"), { recursive: true });
    await writeFile(
        path.join(moduleRoot, "manifest.json"),
        JSON.stringify({ id: "example-module" }),
    );
    await writeFile(path.join(moduleRoot, "tests", "module.test.js"), testBody);
    return { root, moduleRoot };
}

test("module tests discover standard JavaScript and TypeScript test files", async () => {
    const { moduleRoot } = await createModule("export {};\n");
    await writeFile(
        path.join(moduleRoot, "tests", "more.test.ts"),
        "export {};\n",
    );
    assert.deepEqual(
        (await discoverTestFiles(moduleRoot)).map((file) =>
            path.basename(file),
        ),
        ["module.test.js", "more.test.ts"],
    );
});

test("module enable tests pass only when every supplied test passes", async () => {
    const passing = await createModule(
        'import test from "node:test";\nimport assert from "node:assert/strict";\ntest("passes", () => assert.equal(1, 1));\n',
    );
    await new ModuleTestService([passing.root]).run("example-module");

    const failing = await createModule(
        'import test from "node:test";\nimport assert from "node:assert/strict";\ntest("fails", () => assert.equal(1, 2));\n',
    );
    await assert.rejects(
        new ModuleTestService([failing.root]).run("example-module"),
        /module_tests_failed:example-module/,
    );
});
