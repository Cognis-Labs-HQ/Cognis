import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("follow actions repaint before refreshing connection lists", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/profile-post-actions.js"),
        "utf8",
    );

    const immediateRefresh = source.indexOf("refreshProfileHero();");
    const connectionRefresh = source.indexOf(
        "const [followersResult, followingResult] =",
        immediateRefresh,
    );
    assert.ok(immediateRefresh >= 0);
    assert.ok(connectionRefresh > immediateRefresh);
    assert.match(source, /pendingFollowHandles\.has\(handle\)/);
    assert.match(source, /followButton\.disabled = true/);
    assert.ok(
        source.indexOf("refreshProfileCards([") < connectionRefresh,
        "social totals and cards should repaint before list requests settle",
    );
});

test("profile media and layout preferences load concurrently", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/app.js"),
        "utf8",
    );

    assert.match(
        source,
        /Promise\.all\(\[\s*loadImageAsBlob\(profile\?\.avatarKey\),\s*loadImageAsBlob\(profile\?\.bannerKey\),\s*loadBannerLayoutPreference\(profile\?\.accountId\),/m,
    );
});

test("banner height repaints before its preference request settles", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/app.js"),
        "utf8",
    );
    const heightChange = source.indexOf("bannerHeight = nextBannerHeight;");
    const immediateRefresh = source.indexOf(
        "refreshProfileHero();",
        heightChange,
    );
    const preferenceSave = source.indexOf(
        "await saveBannerLayoutPreference({",
        heightChange,
    );

    assert.ok(heightChange >= 0);
    assert.ok(immediateRefresh > heightChange);
    assert.ok(preferenceSave > immediateRefresh);
});
