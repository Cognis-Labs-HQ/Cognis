import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROFILE_RENDER_SOURCE = readFileSync(
    resolve(import.meta.dirname, "../ui/profile-render.js"),
    "utf8",
);

test("post composer themes its visibility control", () => {
    assert.match(PROFILE_RENDER_SOURCE, /controlClassName: "theme-select"/);
});

test("post composer defaults visibility to the profile visibility", () => {
    assert.match(
        PROFILE_RENDER_SOURCE,
        /name: "visibility",[\s\S]*value: getDefaultPostVisibility\(profileVisibility\),/,
    );
    assert.match(
        PROFILE_RENDER_SOURCE,
        /profileVisibility === "hidden" \? "only_me" : profileVisibility/,
    );
});
