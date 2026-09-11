import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
    ModuleTestService,
    discoverTestFiles,
    validateModuleBoundaries,
} from "../../index.js";

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

test("external modules may extend Cognis only through supplied ctx capabilities", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    await mkdir(path.join(moduleRoot, "ui"));
    await writeFile(
        path.join(moduleRoot, "local.js"),
        "export const id = 1;\n",
    );
    await writeFile(
        path.join(moduleRoot, "ui", "bootstrap.js"),
        'import { id } from "../local.js";\nexport function bootstrap(ctx) { ctx.capabilities.contribute("module:example", { id }); }\n',
    );
    await writeFile(
        path.join(moduleRoot, "ui", "module.css"),
        ".example-module-detail { font-size: 1.25rem; }\n",
    );
    await validateModuleBoundaries(moduleRoot);
    await new ModuleTestService([root]).run("example-module");
});

test("external module activation rejects imports and URLs into Cognis internals", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        'import { apiFetch } from "/static/reuse/api-client.js";\nexport const load = () => apiFetch("/api/v1/users");\n',
    );
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /module_boundary_violation[\s\S]*internal_import[\s\S]*internal_url/,
    );
});

test("external module activation rejects symlinked sources", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    const externalSource = path.join(root, "external.js");
    await writeFile(externalSource, "export const unsafe = true;\n");
    await symlink(externalSource, path.join(moduleRoot, "bootstrap.js"));
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /module_boundary_violation[\s\S]*symlink/,
    );
});

test("external module activation rejects protected core and reuse CSS", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    await writeFile(
        path.join(moduleRoot, "module.css"),
        ".module-card { display: grid; }\n.widget-card { width: 100%; }\n",
    );
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /module_boundary_violation[\s\S]*protected_style_class/,
    );
});

test("external module activation rejects font sizes detached from user preferences", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    await writeFile(
        path.join(moduleRoot, "module.css"),
        ".module-detail { font-size: 24px; }\n.module-note { font-size: 0.9rem; }\n",
    );
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /module_boundary_violation[\s\S]*absolute_font_size:font-size: 24px/,
    );
});
