import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROFILE_APP_SOURCE = readFileSync(
    resolve(import.meta.dirname, "../ui/app.js"),
    "utf8",
);
const PROFILE_RENDER_SOURCE = readFileSync(
    resolve(import.meta.dirname, "../ui/profile-render.js"),
    "utf8",
);

test("profile editor disables private visibility choices for administrators", () => {
    assert.match(
        PROFILE_APP_SOURCE,
        /\[\s*"teacher",\s*"admin",\s*"owner",?\s*\]\.includes\(profile\?\.role\)/,
    );
    assert.match(PROFILE_APP_SOURCE, /disabled: isRestrictedForProfileRole/);
});

test("profile block button uses the cancel button style", () => {
    assert.match(PROFILE_RENDER_SOURCE, /profile-hero-block-btn btn-cancel/);
});
