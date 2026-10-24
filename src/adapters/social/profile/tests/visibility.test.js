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
const PROFILE_SYNC_SOURCE = readFileSync(
    resolve(import.meta.dirname, "../ui/provider-sync.js"),
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

test("profile synchronization uses the destructive button style", () => {
    assert.match(PROFILE_RENDER_SOURCE, /profile-provider-sync-btn btn-cancel/);
});

test("profile synchronization is routed through a provider-aware registry", () => {
    assert.match(PROFILE_SYNC_SOURCE, /auth:externalProfileSync/);
    assert.match(PROFILE_SYNC_SOURCE, /registry\?\.supports\(providerId\)/);
    assert.doesNotMatch(PROFILE_SYNC_SOURCE, /auth:syncExternalProfile/);
});

test("profile synchronization revokes replaced profile blob URLs", () => {
    assert.match(
        PROFILE_APP_SOURCE,
        /applyProfile: async \(\) => \{[\s\S]*?revokeProfileBlobUrls\(\);[\s\S]*?loadImageAsBlob/,
    );
});
