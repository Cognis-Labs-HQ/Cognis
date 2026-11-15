import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { heroFixture, settle, deferred, profileFor } from "./hero-fixture.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("follow actions repaint before refreshing connection lists", async (context) => {
    const fixture = await heroFixture(context);
    fixture.setProfile(profileFor("other"));
    await fixture.mount("/profile/other");
    const pending = deferred();
    fixture.setOverride((path, options) =>
        options.method
            ? Response.json({ data: {} })
            : path.endsWith("/follow") || path.endsWith("/following")
              ? pending.promise
              : undefined,
    );
    const button = fixture.document.querySelector(".profile-hero-follow-btn");
    button.click();
    button.dispatchEvent(new fixture.window.Event("click"));
    await settle();
    assert.equal(button.disabled, true);
    assert.ok(
        fixture.document.querySelector(
            '.profile-hero-follow-btn[data-following="true"]',
        ),
    );
    assert.equal(
        fixture.requests.filter(({ method }) => method === "POST").length,
        1,
    );
    pending.resolve(Response.json({ data: [] }));
    await settle();
});

test("profile media and layout preferences load concurrently", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/app.js"),
        "utf8",
    );

    assert.match(
        source,
        /Promise\.all\(\[\s*media\.read\(profile\),\s*loadBannerLayoutPreference\(profile\?\.accountId\),/m,
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
