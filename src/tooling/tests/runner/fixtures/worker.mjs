import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("worker receives its own empty writable token store", () => {
    const filename = process.env.COGNIS_ACCESS_TOKEN_STORE_PATH;
    assert.ok(filename);
    assert.equal(existsSync(filename), false);
    assert.equal(
        path.dirname(path.dirname(filename)),
        process.env.COGNIS_TEST_TOKEN_DIRECTORY,
    );
    writeFileSync(filename, "synthetic-worker-token");
    console.log(
        `TOKEN_WORKER ${JSON.stringify({ filename, pid: process.pid })}`,
    );
    assert.notEqual(process.env.COGNIS_TEST_FORCE_FAILURE, "true");
});

test("test cases can deliberately override their token store after bootstrap", () => {
    const automatic = process.env.COGNIS_ACCESS_TOKEN_STORE_PATH;
    assert.ok(automatic);
    const deliberate = path.join(
        path.dirname(automatic),
        "deliberate-store.json",
    );
    process.env.COGNIS_ACCESS_TOKEN_STORE_PATH = deliberate;
    writeFileSync(
        process.env.COGNIS_ACCESS_TOKEN_STORE_PATH,
        "deliberate synthetic store",
    );
    assert.equal(existsSync(deliberate), true);
    assert.equal(process.env.COGNIS_ACCESS_TOKEN_STORE_PATH, deliberate);
    process.env.COGNIS_ACCESS_TOKEN_STORE_PATH = automatic;
});
