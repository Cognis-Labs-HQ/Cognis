import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROFILE_APP_SOURCE = readFileSync(
    resolve(import.meta.dirname, "../ui/app.js"),
    "utf8",
);

test("profile editor disables private visibility choices for administrators", () => {
    assert.match(
        PROFILE_APP_SOURCE,
        /\[\s*"teacher",\s*"admin",\s*"owner",?\s*\]\.includes\(profile\?\.role\)/,
    );
    assert.match(PROFILE_APP_SOURCE, /disabled: isRestrictedForProfileRole/);
});
