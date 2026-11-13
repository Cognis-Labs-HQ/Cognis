import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("api bootstrap grants owner scope to CLI token and default admin", () => {
    const source = readFileSync(resolve(ROOT, "src/api/main.ts"), "utf8");

    assert.match(
        source,
        /issueAccessToken\("system:cognis-cli", "owner", null\)/,
    );
    assert.match(source, /accountStore\.setFounder\("admin", true\)/);
    assert.match(source, /createProfile\("admin", "admin", "owner"\)/);
});
