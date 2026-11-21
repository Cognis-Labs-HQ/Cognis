import test from "node:test";
import assert from "node:assert/strict";
import { heroFixture, settle, deferred, profileFor } from "./hero-fixture.js";

for (const status of [408, 429, 503])
    test(`retryable profile record ${status} retains same-owner hero`, async (context) => {
        const fixture = await heroFixture(context);
        await fixture.mount();
        const avatar = fixture.image(),
            banner = fixture.banner();
        fixture.setOverride((path) =>
            path === "/api/v1/social/profile"
                ? Promise.resolve(new Response("", { status }))
                : undefined,
        );
        await fixture.sync();
        assert.equal(fixture.image(), avatar);
        assert.equal(fixture.banner(), banner);
        assert.equal(fixture.revoked.includes(avatar.src), false);
        assert.equal(fixture.revoked.includes(banner.src), false);
    });

for (const status of [401, 403, 404, 410])
    test(`authoritative profile record ${status} clears retained media`, async (context) => {
        const fixture = await heroFixture(context);
        await fixture.mount();
        const urls = [fixture.image().src, fixture.banner().src];
        fixture.setOverride((path) =>
            path === "/api/v1/social/profile"
                ? Promise.resolve(new Response("", { status }))
                : undefined,
        );
        await fixture.sync();
        assert.equal(fixture.image(), null);
        assert.equal(fixture.banner(), null);
        for (const url of urls)
            assert.equal(
                fixture.revoked.filter((value) => value === url).length,
                1,
            );
    });

test("null profile record clears retained hero media", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    fixture.setProfile(null);
    await fixture.sync();
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), null);
});

test("invalid profile JSON retains authorized same-owner hero and can retry", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const avatar = fixture.image(),
        banner = fixture.banner();
    fixture.setOverride((path) =>
        path === "/api/v1/social/profile"
            ? Promise.resolve(new Response("not-json"))
            : undefined,
    );
    await fixture.sync();
    assert.equal(fixture.image(), avatar);
    assert.equal(fixture.banner(), banner);
    fixture.setOverride(undefined);
    await fixture.sync();
    assert.ok(fixture.image());
});

for (const kind of ["avatar", "banner"])
    test(`late ${kind} DELETE completion never clears a newer route`, async (context) => {
        const fixture = await heroFixture(context),
            pending = deferred();
        await fixture.mount();
        fixture.setOverride((path, options) =>
            path.endsWith(`/profile/${kind}`) && options.method === "DELETE"
                ? pending.promise
                : undefined,
        );
        fixture.document.querySelector(`.profile-${kind}-remove-btn`).click();
        await settle();
        fixture.setProfile(profileFor("newer"));
        await fixture.mount("/profile/newer");
        const avatar = fixture.image(),
            banner = fixture.banner();
        pending.resolve(
            Response.json({ data: { ...profileFor(), [`${kind}Key`]: null } }),
        );
        await settle();
        assert.equal(fixture.image(), avatar);
        assert.equal(fixture.banner(), banner);
        assert.equal(fixture.revoked.includes(avatar.src), false);
        assert.equal(fixture.revoked.includes(banner.src), false);
    });

test("late external synchronization never starts old own-profile reads on newer route", async (context) => {
    const fixture = await heroFixture(context),
        pending = deferred();
    await fixture.mount();
    fixture.setSyncWork(() => pending.promise);
    fixture.document.querySelector(".profile-provider-sync-btn").click();
    await settle();
    fixture.setProfile(profileFor("newer"));
    await fixture.mount("/profile/newer");
    const avatar = fixture.image(),
        banner = fixture.banner(),
        before = fixture.requests.length;
    pending.resolve();
    await settle();
    assert.equal(fixture.image(), avatar);
    assert.equal(fixture.banner(), banner);
    assert.equal(fixture.requests.length, before);
    assert.equal(fixture.revoked.includes(avatar.src), false);
    assert.equal(
        fixture.notices.some((notice) => notice.variant === "success"),
        false,
    );
});

test("repeated sync clicks while pending perform only one synchronization", async (context) => {
    const fixture = await heroFixture(context),
        pending = deferred();
    await fixture.mount();
    fixture.setSyncWork(() => pending.promise);
    const button = fixture.document.querySelector(".profile-provider-sync-btn");
    button.click();
    button.click();
    button.click();
    await settle();
    assert.equal(
        fixture.stages.filter((value) => value === "external:sync").length,
        1,
    );
    pending.resolve();
    await settle();
});

test("late follower poll cannot apply older connection results to a newer route", async (context) => {
    const fixture = await heroFixture(context),
        pending = deferred();
    await fixture.mount();
    fixture.setOverride((path) =>
        path === "/api/v1/social/users/learner/follow"
            ? pending.promise
            : undefined,
    );
    const polling = fixture.poll();
    await settle();
    fixture.setProfile(profileFor("newer"));
    fixture.setFollowers([{ handle: "newer-follower" }]);
    await fixture.mount("/profile/newer");
    const before = fixture.document.querySelector(
        '[data-composer-element="followers"]',
    ).innerHTML;
    const avatar = fixture.image();
    pending.resolve(Response.json({ data: [{ handle: "obsolete-follower" }] }));
    await polling;
    assert.equal(fixture.image(), avatar);
    assert.equal(
        fixture.document.querySelector('[data-composer-element="followers"]')
            .innerHTML,
        before,
    );
});

test("provider identity changes invalidate rendered hero media", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const urls = [fixture.image().src, fixture.banner().src];
    fixture.setProviderId("different-provider");
    fixture.window.dispatchEvent(new fixture.window.Event("storage"));
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), null);
    for (const url of urls)
        assert.equal(
            fixture.revoked.filter((value) => value === url).length,
            1,
        );
});

test("strict hero translations propagate instead of reporting synchronization success", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    fixture.setTranslationFailure("ui.app.profile.change_avatar");
    await assert.rejects(
        fixture.sync(),
        (error) => error.code === "missing_translation",
    );
    assert.equal(
        fixture.notices.some((notice) => notice.variant === "success"),
        false,
    );
    fixture.setTranslationFailure(null);
});

test("a different profile identity cannot reuse colliding media keys on failure", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const urls = [fixture.image().src, fixture.banner().src];
    fixture.setProfile({
        ...profileFor("different"),
        avatarKey: "learner/avatar",
        bannerKey: "learner/banner",
    });
    fixture.setMedia(async () => new Response("", { status: 503 }));
    await fixture.sync();
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), null);
    for (const url of urls)
        assert.equal(
            fixture.revoked.filter((value) => value === url).length,
            1,
        );
});

test("an invalid profile record cannot authorize absence of previously loaded media", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const avatar = fixture.image(),
        banner = fixture.banner();
    fixture.setProfile({ accountId: "learner", handle: "learner" });
    await fixture.sync();
    assert.equal(fixture.image(), avatar);
    assert.equal(fixture.banner(), banner);
    assert.equal(fixture.notices.at(-1).variant, "error");
});

test("a pending synchronization record cannot restore an acknowledged newer deletion", async (context) => {
    const fixture = await heroFixture(context),
        pending = deferred();
    await fixture.mount();
    fixture.setOverride((path) =>
        path === "/api/v1/social/profile" ? pending.promise : undefined,
    );
    const synchronization = fixture.sync();
    await settle();
    fixture.document.querySelector(".profile-avatar-remove-btn").click();
    await settle();
    assert.equal(fixture.image(), null);
    pending.resolve(Response.json({ data: profileFor() }));
    await synchronization;
    assert.equal(fixture.image(), null);
    assert.ok(fixture.banner());
});
