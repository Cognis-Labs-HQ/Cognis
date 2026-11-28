import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { consoleLoggingViolations } from "../../reuse/logging/console.js";

const root = process.cwd();
test("application diagnostics use the logging gateway instead of native console access", () => {
    assert.deepEqual(
        consoleLoggingViolations(
            root,
            process.env.COGNIS_EXTERNAL_MODULES_ROOT,
        ),
        [],
        "Native console access belongs to logging output/init only. Use ui:log, browser diagnostics, or the injected server log function.",
    );
});

test("new components and external modules cannot acquire a logging-owner exception", (testContext) => {
    const directory = mkdtempSync(
        resolve(tmpdir(), "cognis-console-boundary-"),
    );
    testContext.after(() =>
        rmSync(directory, { recursive: true, force: true }),
    );
    const paths = [
        "src/gateways/example/ui/index.js",
        "src/adapters/example/console/ui/console.js",
        "src/gateways/logging/ui/admin-section.js",
        "external-modules/example/ui/index.js",
        "src/gateways/logging/ui/console.js",
        "src/tooling/scripts/report.js",
        "src/gateways/example/tests/fixture.js",
    ];
    for (const name of paths) {
        const destination = resolve(directory, name);
        mkdirSync(dirname(destination), { recursive: true });
        copyFileSync(
            new URL("./fixtures/direct.js", import.meta.url),
            destination,
        );
    }
    assert.deepEqual(
        consoleLoggingViolations(directory).sort(),
        [...paths.slice(0, 4), paths[5]].map((name) => `${name}:1`).sort(),
    );
});

test("the initialization exception cannot authorize route handlers or inline browser logging", (testContext) => {
    const directory = mkdtempSync(resolve(tmpdir(), "cognis-console-init-"));
    testContext.after(() =>
        rmSync(directory, { recursive: true, force: true }),
    );
    for (const [name, fixture] of [
        ["src/gateways/logging/bootstrap.ts", "init.js"],
        ["src/ui/public/pages/example.html", "inline.html.txt"],
    ]) {
        const destination = resolve(directory, name);
        mkdirSync(dirname(destination), { recursive: true });
        copyFileSync(
            new URL(`./fixtures/${fixture}`, import.meta.url),
            destination,
        );
    }
    assert.deepEqual(consoleLoggingViolations(directory).sort(), [
        "src/gateways/logging/bootstrap.ts:5",
        "src/ui/public/pages/example.html:2",
        "src/ui/public/pages/example.html:3",
    ]);
});

test("browser-accepted script end tags cannot bypass source inspection", (testContext) => {
    const directory = mkdtempSync(resolve(tmpdir(), "cognis-console-script-"));
    testContext.after(() =>
        rmSync(directory, { recursive: true, force: true }),
    );
    const destination = resolve(directory, "src/ui/public/pages/example.html");
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(
        new URL("./fixtures/script-endings.html.txt", import.meta.url),
        destination,
    );
    assert.deepEqual(
        consoleLoggingViolations(directory),
        [1, 3, 4, 5, 7].map(
            (line) => `src/ui/public/pages/example.html:${line}`,
        ),
    );
});
