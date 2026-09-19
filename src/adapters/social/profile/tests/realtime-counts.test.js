import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const appSource = await readFile(
    new URL("../ui/app.js", import.meta.url),
    "utf8",
);
const followerPollerSource = await readFile(
    new URL("../ui/follower-poller.js", import.meta.url),
    "utf8",
);

test("profile page polls follower and following lists for real-time counts", () => {
    assert.match(followerPollerSource, /createAdaptivePoller/);
    assert.match(
        followerPollerSource,
        /loadConnections\(profileHandle, "followers"\)/,
    );
    assert.match(
        followerPollerSource,
        /loadConnections\(profileHandle, "following"\)/,
    );
    assert.match(
        appSource,
        /refreshProfileCards\(\[\s*"hero",[\s\S]*?followersChanged[\s\S]*?followingChanged[\s\S]*?"suggested",\s*\]\)/,
    );
    assert.match(
        appSource,
        /signal\?\.addEventListener\("abort", stopFollowerCountPoller/,
    );
    assert.match(
        followerPollerSource,
        /connectionKind === "followers" \? "follow"/,
    );
    assert.match(appSource, /if \(signal\?\.aborted\) return;/);
});

test("profile edits repaint profile cards from the mutation response", () => {
    assert.match(appSource, /const responseBody = await response\.json\(\)/);
    assert.match(appSource, /setState\(\{ profile: responseBody\.data \}\)/);
    assert.match(
        appSource,
        /refreshProfileCards\(\["hero", "social-links", "posts-new"\]\)/,
    );
});
