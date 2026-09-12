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

test("external modules may address only their own API namespace", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    await writeFile(
        path.join(moduleRoot, "api-client.js"),
        'export const configUrl = "/api/v1/modules/example-module/config";\n',
    );
    await new ModuleTestService([root]).run("example-module");

    await writeFile(
        path.join(moduleRoot, "api-client.js"),
        'export const configUrl = "/api/v1/modules/another-module/config";\n',
    );
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /internal_url:\/api\/v1\/modules\/another-module\/config/,
    );
});

test("restricted API validation does not activate unrelated UI sources", async () => {
    const { moduleRoot } = await createModule("export {};\n");
    await mkdir(path.join(moduleRoot, "api"));
    await mkdir(path.join(moduleRoot, "ui"));
    await writeFile(
        path.join(moduleRoot, "api", "index.js"),
        'export const configUrl = "/api/v1/modules/example-module/config";\n',
    );
    await writeFile(
        path.join(moduleRoot, "ui", "app.js"),
        'import "/static/reuse/ui-ctx.js";\n',
    );
    await validateModuleBoundaries(moduleRoot, {
        moduleId: "example-module",
        sourceRoot: path.join(moduleRoot, "api"),
    });
    await assert.rejects(
        validateModuleBoundaries(moduleRoot, { moduleId: "example-module" }),
        /internal_import:\/static\/reuse\/ui-ctx\.js/,
    );
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

test("external module activation rejects CommonJS requires into Cognis internals", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    await writeFile(
        path.join(moduleRoot, "bootstrap.cjs"),
        'const core = require("@cognis/core");\nmodule.exports = core;\n',
    );
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /internal_import:@cognis\/core/,
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

test("external module activation rejects dotted symlink directories", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    const externalDirectory = path.join(root, "external-directory");
    await mkdir(externalDirectory);
    await writeFile(
        path.join(externalDirectory, "bootstrap.js"),
        "export const unsafe = true;\n",
    );
    await symlink(
        externalDirectory,
        path.join(moduleRoot, "vendor.bundle"),
        "dir",
    );
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /module_boundary_violation[\s\S]*vendor\.bundle:symlink/,
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

test("external module activation rejects protected class attribute selectors", async () => {
    const { root, moduleRoot } = await createModule("export {};\n");
    await writeFile(
        path.join(moduleRoot, "module.css"),
        '[class~="widget-card"] { display: none; }\n',
    );
    await assert.rejects(
        new ModuleTestService([root]).run("example-module"),
        /protected_style_class:widget-card/,
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
