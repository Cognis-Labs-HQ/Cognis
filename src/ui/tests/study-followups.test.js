import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("classes page redirects non-teachers back to dashboard", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/app.js"),
        "utf8",
    );
    assert.match(
        source,
        /if\s*\(!isTeacher\)\s*\{\s*navigateTo\("\/dashboard"\);/,
    );
});

test("study hub detects native library child component by descriptor id", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );
    assert.match(
        source,
        /hasLibraryModule[\s\S]*component\?\.id[\s\S]*===\s*"library"/,
    );
});
