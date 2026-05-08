import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("profile dropdown places Users under Administration", () => {
    const template = readFileSync(
        resolve(ROOT, "src/ui/public/templates/dashboard-layout.html"),
        "utf8",
    );
    const adminIndex = template.indexOf('href="/administration"');
    const usersIndex = template.indexOf('href="/users"');

    assert.notEqual(adminIndex, -1);
    assert.notEqual(usersIndex, -1);
    assert.ok(usersIndex > adminIndex);
});
