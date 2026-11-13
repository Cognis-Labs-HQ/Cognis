import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { discoverTestFiles } from "../../core/index.js";
import { pathLayoutIssues } from "../scripts/path-layout.mjs";

// These names are data for the policy, not checked-in fixture directories.
test("path policy rejects replicated fixture trees and repeated test subjects", () => {
    assert.equal(
        pathLayoutIssues([
            "src/tooling/tests/fixtures/build/src/ui/public/index.html",
            "src/tooling/tests/ui-build/ui-build-entrypoints.test.js",
            "src/tooling/tests/ui-build-styles.test.js",
        ]).length,
        3,
    );
});

test("path policy preserves meaningful fixture contracts and subject groups", () => {
    assert.deepEqual(
        pathLayoutIssues([
            "src/tooling/tests/ui-build/entrypoints.test.js",
            "src/tooling/tests/ui-build/fixtures/index.html",
            "src/api/tests/bootstrap/fixtures/db/postgres/sql/init/001_fixture.sql",
            "src/library/tests/fixtures/external-pack/content/characters/characters.json",
            "src/ui/tests/browser-language-detection.test.js",
        ]),
        [],
    );
});

test("repository fixtures and grouped tests use concise paths", async () => {
    const files = (
        await readdir("src", { recursive: true, withFileTypes: true })
    )
        .filter((entry) => entry.isFile())
        .map((entry) =>
            `${entry.parentPath}/${entry.name}`.replaceAll("\\", "/"),
        );
    assert.deepEqual(pathLayoutIssues(files), []);
});

test("test discovery includes subject directories without executing fixture assets", async () => {
    const files = await discoverTestFiles("src/tooling/tests");
    assert.ok(files.includes("src/tooling/tests/ui-build/entrypoints.test.js"));
    assert.ok(files.every((file) => /\.test\.[cm]?[jt]s$/.test(file)));
});
