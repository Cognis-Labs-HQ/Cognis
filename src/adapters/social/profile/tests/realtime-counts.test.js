import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const appSource = await readFile(
    new URL("../ui/app.js", import.meta.url),
    "utf8",
);

test("profile page polls follower and following lists for real-time counts", () => {
    assert.match(appSource, /createAdaptivePoller/);
    assert.match(appSource, /loadSocialConnectionList\(profileHandle, "followers"\)/);
    assert.match(appSource, /loadSocialConnectionList\(profileHandle, "following"\)/);
    assert.match(appSource, /refreshPage\(\)/);
    assert.match(
        appSource,
        /signal\?\.addEventListener\("abort", stopFollowerCountPoller/,
    );
});
