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
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../../../..");
const fixtures = path.join(import.meta.dirname, "fixtures");
const layout = JSON.parse(
    readFileSync(path.join(fixtures, "layout.json"), "utf8"),
);
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

function files(directory, excludeGenerated = true) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (
            entry.name === "node_modules" ||
            (excludeGenerated && entry.name === "dist")
        )
            return [];
        const location = path.join(directory, entry.name);
        return entry.isDirectory()
            ? files(location, excludeGenerated)
            : [location];
    });
}

function check(directory, args = []) {
    assert.ok(
        npm,
        "Run through npm test or provide npm_execpath to npm-cli.js",
    );
    const result = spawnSync(
        process.execPath,
        [npm, "run", "typecheck", "--", "--pretty", "false", ...args],
        {
            cwd: directory,
            encoding: "utf8",
            timeout: 60_000,
            maxBuffer: 16 * 1024 * 1024,
        },
    );
    assert.ifError(result.error);
    assert.equal(result.signal, null, result.stderr);
    return { status: result.status, output: result.stdout + result.stderr };
}

function assertInventory(directory) {
    const expected = files(path.join(directory, "src"))
        .filter((file) => /\.(?:ts|tsx|mts|cts)$/.test(file))
        .sort();
    assert.ok(expected.length > 0, "Source inventory must not be empty");
    const result = check(directory, ["--listFilesOnly"]);
    assert.equal(result.status, 0, result.output);
    const actual = result.output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(
            (line) =>
                path.isAbsolute(line) &&
                line.startsWith(path.join(directory, "src") + path.sep) &&
                /\.(?:ts|tsx|mts|cts)$/.test(line),
        )
        .sort();
    assert.deepEqual(
        actual,
        expected,
        "The normal checker must cover every production and test TypeScript source",
    );
    return expected;
}

function copyFixture(directory, source, destination) {
    const target = path.join(directory, destination);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(fixtures, source), target);
}

function repository(context) {
    const directory = mkdtempSync(path.join(tmpdir(), "cognis-typecheck-"));
    context.after(() => rmSync(directory, { recursive: true, force: true }));
    for (const filename of [
        "package.json",
        "tsconfig.json",
        "tsconfig.base.json",
    ]) {
        copyFileSync(path.join(root, filename), path.join(directory, filename));
    }
    symlinkSync(
        path.join(root, "node_modules"),
        path.join(directory, "node_modules"),
        "junction",
    );
    for (const [source, destinations] of Object.entries(layout)) {
        for (const destination of destinations)
            copyFixture(directory, source, destination);
    }
    return directory;
}

test("normal checker includes every repository TypeScript source and test", () => {
    assertInventory(root);
});

test("normal checker accepts complete clean fixtures without emitting artifacts", (context) => {
    const directory = repository(context);
    assertInventory(directory);
    const before = files(directory, false).sort();
    for (let run = 0; run < 2; run += 1) {
        const result = check(directory);
        assert.equal(result.status, 0, result.output);
        assert.deepEqual(
            files(directory, false).sort(),
            before,
            "Checking must not emit or generate files",
        );
    }
});

for (const [source, target] of [
    ["production-error.ts.txt", "src/adapters/study/example/index.ts"],
    ["test-error.ts.txt", "src/adapters/study/example/tests/index.test.ts"],
]) {
    test(`normal checker rejects an independently broken ${target}`, (context) => {
        const directory = repository(context);
        copyFixture(directory, source, target);
        const result = check(directory);
        assert.notEqual(result.status, 0, result.output);
        assert.ok(
            result.output.includes(`${target}(1,14): error TS2322`),
            result.output,
        );
        copyFixture(directory, "clean.ts.txt", target);
        const restored = check(directory);
        assert.equal(restored.status, 0, restored.output);
    });
}
