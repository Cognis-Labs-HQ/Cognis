import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("login required-email setup checks verified primary email using primary field from API", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(source, /entry\.primary && entry\.verified/);
});
