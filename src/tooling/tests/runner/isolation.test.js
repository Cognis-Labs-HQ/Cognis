import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../../../..");
const npm = [
    process.env.npm_execpath,
    path.resolve(
        path.dirname(process.execPath),
        "../lib/node_modules/npm/bin/npm-cli.js",
    ),
    path.resolve(
        path.dirname(process.execPath),
        "node_modules/npm/bin/npm-cli.js",
    ),
].find((candidate) => candidate && existsSync(candidate));

for (const failing of [false, true]) {
    test(`standard runner isolates workers and cleans up after ${failing ? "failure" : "success"}`, () => {
        assert.ok(npm, "Run through npm test or provide npm_execpath");
        const directory = mkdtempSync(
            path.join(tmpdir(), "cognis-runner-fixture-"),
        );
        try {
            const scripts = path.join(directory, "src/tooling/scripts");
            mkdirSync(scripts, { recursive: true });
            const temporary = path.join(directory, "temporary");
            mkdirSync(temporary);
            const target = path.join(directory, "production-token-store.json");
            writeFileSync(target, "untouched production sentinel");
            symlinkSync(
                path.join(root, "node_modules"),
                path.join(directory, "node_modules"),
            );
            symlinkSync(
                path.join(root, "src/core"),
                path.join(directory, "src/core"),
            );
            for (const filename of ["run-tests.ts", "test-environment.mjs"]) {
                copyFileSync(
                    path.join(root, "src/tooling/scripts", filename),
                    path.join(scripts, filename),
                );
            }
            const fixtures = path.join(import.meta.dirname, "fixtures");
            copyFileSync(
                path.join(fixtures, "package.json"),
                path.join(directory, "package.json"),
            );
            for (const filename of ["first.test.mjs", "second.test.mjs"]) {
                copyFileSync(
                    path.join(fixtures, "worker.mjs"),
                    path.join(directory, "src", filename),
                );
            }
            const result = spawnSync(
                process.execPath,
                [npm, "run", "ci:test"],
                {
                    cwd: directory,
                    env: {
                        ...process.env,
                        NODE_TEST_CONTEXT: undefined,
                        TMPDIR: temporary,
                        COGNIS_ACCESS_TOKEN_STORE_PATH: target,
                        COGNIS_TEST_TOKEN_DIRECTORY: target,
                        COGNIS_TEST_FORCE_FAILURE: String(failing),
                        COGNIS_EXTERNAL_MODULES_ROOT: path.join(
                            directory,
                            "absent-modules",
                        ),
                        TSX_TSCONFIG_PATH: path.join(root, "tsconfig.json"),
                    },
                    encoding: "utf8",
                    timeout: 30000,
                },
            );
            assert.ifError(result.error);
            assert.equal(result.signal, null);
            const output = result.stdout + result.stderr;
            assert.equal(result.status, failing ? 1 : 0, output);
            const workers = [
                ...output.matchAll(/TOKEN_WORKER (\{[^\n]+\})/g),
            ].map((match) => JSON.parse(match[1]));
            assert.equal(workers.length, 2, output);
            assert.equal(
                new Set(workers.map((worker) => worker.filename)).size,
                2,
            );
            assert.equal(new Set(workers.map((worker) => worker.pid)).size, 2);
            for (const worker of workers)
                assert.equal(existsSync(worker.filename), false);
            assert.deepEqual(
                readdirSync(temporary).filter((name) =>
                    name.startsWith("cognis-test-tokens-"),
                ),
                [],
            );
            assert.equal(
                readFileSync(target, "utf8"),
                "untouched production sentinel",
            );
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
}
