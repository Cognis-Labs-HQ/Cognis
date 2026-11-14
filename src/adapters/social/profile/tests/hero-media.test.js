import test from "node:test";
import assert from "node:assert/strict";
import { heroFixture, settle, deferred, profileFor } from "./hero-fixture.js";

const fileReads = (fixture) =>
    fixture.requests.filter((request) =>
        request.path.startsWith("/api/v1/files/"),
    ).length;
const imageUrls = (fixture) =>
    [fixture.image()?.src, fixture.banner()?.src].filter(Boolean);
const assertRevokedExactlyOnce = (fixture, urls) => {
    for (const url of urls)
        assert.equal(
            fixture.revoked.filter((value) => value === url).length,
            1,
            url,
        );
};
const assertCurrent = (fixture) => {
    for (const url of imageUrls(fixture))
        assert.equal(
            fixture.revoked.includes(url),
            false,
            `displayed revoked URL: ${url}`,
        );
};

test("repeated follower refresh preserves avatar/banner nodes and does not fetch media", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const avatar = fixture.image(),
        banner = fixture.banner(),
        reads = fileReads(fixture);
    for (let count = 1; count <= 3; count++) {
        fixture.setFollowers(
            Array.from({ length: count }, (_, index) => ({
                handle: `follower${index}`,
            })),
        );
        await fixture.poll();
        assert.equal(fixture.image(), avatar);
        assert.equal(fixture.banner(), banner);
        assert.equal(fileReads(fixture), reads);
    }
});

for (const status of [408, 425, 429, 500, 503])
    test(`same-key transient media ${status} retains exact nodes and URLs`, async (context) => {
        const fixture = await heroFixture(context);
        await fixture.mount();
        const avatar = fixture.image(),
            banner = fixture.banner(),
            urls = imageUrls(fixture);
        fixture.setMedia(async () => new Response("", { status }));
        await fixture.sync();
        assert.equal(fixture.image(), avatar);
        assert.equal(fixture.banner(), banner);
        assert.equal(
            fixture.revoked.some((url) => urls.includes(url)),
            false,
        );
        assertCurrent(fixture);
    });

test("transient same-key failure retries and later changed bytes replace each old URL once", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const oldUrls = imageUrls(fixture),
        before = fileReads(fixture);
    fixture.setMedia(async () => new Response("", { status: 503 }));
    await fixture.sync();
    fixture.setMedia(async (path) => new Response(`fresh:${path}`));
    await fixture.sync();
    assert.ok(fileReads(fixture) > before);
    for (const url of imageUrls(fixture))
        assert.ok((await fixture.blobs.get(url).text()).startsWith("fresh:"));
    assertRevokedExactlyOnce(fixture, oldUrls);
    assertCurrent(fixture);
});

for (const status of [401, 403, 404, 410])
    test(`authoritative media ${status} clears both slots and revokes only their URLs`, async (context) => {
        const fixture = await heroFixture(context);
        await fixture.mount();
        const oldUrls = imageUrls(fixture);
        fixture.setMedia(async () => new Response("", { status }));
        await fixture.sync();
        assert.equal(fixture.image(), null);
        assert.equal(fixture.banner(), null);
        assertRevokedExactlyOnce(fixture, oldUrls);
    });

test("changed avatar key with transient media failure never keeps old identity bytes", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const oldAvatar = fixture.image().src,
        oldBanner = fixture.banner();
    fixture.setProfile({ ...profileFor(), avatarKey: "learner/new-avatar" });
    fixture.setMedia(async () => new Response("", { status: 503 }));
    await fixture.sync();
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), oldBanner);
    assertRevokedExactlyOnce(fixture, [oldAvatar]);
});

test("null avatar key is authoritative without reading old avatar again", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const avatar = fixture.image().src,
        banner = fixture.banner(),
        before = fixture.requests.length;
    fixture.setProfile({ ...profileFor(), avatarKey: null });
    await fixture.sync();
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), banner);
    assert.equal(
        fixture.requests
            .slice(before)
            .some((request) => request.path.endsWith("/learner/avatar")),
        false,
    );
    assertRevokedExactlyOnce(fixture, [avatar]);
});

for (const kind of ["avatar", "banner"])
    test(`confirmed ${kind} deletion clears only that image slot`, async (context) => {
        const fixture = await heroFixture(context);
        await fixture.mount();
        const removed = kind === "avatar" ? fixture.image() : fixture.banner();
        const retained = kind === "avatar" ? fixture.banner() : fixture.image();
        fixture.document.querySelector(`.profile-${kind}-remove-btn`).click();
        await settle();
        assert.equal(
            kind === "avatar" ? fixture.image() : fixture.banner(),
            null,
        );
        assert.equal(
            kind === "avatar" ? fixture.banner() : fixture.image(),
            retained,
        );
        assertRevokedExactlyOnce(fixture, [removed.src]);
        assertCurrent(fixture);
    });

for (const change of ["token", "account"])
    test(`rendered ${change} change clears URLs on authentication/storage events`, async (context) => {
        const fixture = await heroFixture(context);
        await fixture.mount();
        const urls = imageUrls(fixture);
        fixture.host.changeAccount(
            change === "account" ? "other-account" : "learner",
            "replacement-token",
        );
        fixture.window.dispatchEvent(new fixture.window.Event("storage"));
        await fixture.host.ctx.runFlow("authenticate-session", {});
        await settle();
        assert.equal(fixture.image(), null);
        assert.equal(fixture.banner(), null);
        assertRevokedExactlyOnce(fixture, urls);
    });

for (const change of ["token", "account"])
    test(`pending ${change} change cannot publish old private media`, async (context) => {
        const fixture = await heroFixture(context),
            pending = deferred();
        fixture.setMedia((path) =>
            path.endsWith("/avatar")
                ? pending.promise
                : Promise.resolve(new Response(path)),
        );
        const mounting = fixture.mount();
        await settle();
        fixture.host.changeAccount(
            change === "account" ? "other-account" : "learner",
            "replacement-token",
        );
        pending.resolve(new Response("private-old-bytes"));
        await mounting;
        assert.equal(fixture.image(), null);
        assert.equal(fixture.banner(), null);
        assertRevokedExactlyOnce(fixture, [...fixture.blobs.keys()]);
    });

for (const abortOld of [true, false])
    test(`overlapping route media completion is ignored; old abort=${abortOld}`, async (context) => {
        const fixture = await heroFixture(context),
            pending = deferred();
        fixture.setProfile(profileFor("older"));
        fixture.setMedia((path) =>
            path.endsWith("older/avatar")
                ? pending.promise
                : Promise.resolve(new Response(path)),
        );
        fixture.window.history.replaceState(null, "", "/profile/older");
        const old = new fixture.window.AbortController();
        const earlier = fixture.app.mount(
            fixture.document.querySelector("#app"),
            { signal: old.signal },
        );
        await settle();
        if (abortOld) old.abort();
        fixture.setProfile(profileFor("newer"));
        await fixture.mount("/profile/newer");
        const avatar = fixture.image(),
            banner = fixture.banner();
        pending.resolve(new Response("older-avatar"));
        await earlier;
        old.abort();
        fixture.setFollowers([{ handle: "follower" }]);
        await fixture.poll();
        assert.equal(fixture.image(), avatar);
        assert.equal(fixture.banner(), banner);
        assert.equal(
            fixture.document.querySelector(".profile-hero-display-name")
                .textContent,
            "newer",
        );
        assertCurrent(fixture);
    });

test("late profile record read cannot overwrite newer page before media begins", async (context) => {
    const fixture = await heroFixture(context),
        pending = deferred();
    fixture.setOverride((path) =>
        path === "/api/v1/social/users/older/profile"
            ? pending.promise
            : undefined,
    );
    const earlier = fixture.mount("/profile/older");
    await settle();
    fixture.setProfile(profileFor("newer"));
    await fixture.mount("/profile/newer");
    const avatar = fixture.image(),
        banner = fixture.banner(),
        before = fixture.requests.length;
    pending.resolve(Response.json({ data: profileFor("older") }));
    await earlier;
    assert.equal(fixture.image(), avatar);
    assert.equal(fixture.banner(), banner);
    assert.equal(
        fixture.document.querySelector(".profile-hero-display-name")
            .textContent,
        "newer",
    );
    assert.equal(
        fixture.requests
            .slice(before)
            .some((request) => request.path.includes("older")),
        false,
    );
});

test("page abort releases every allocated object URL exactly once", async (context) => {
    const fixture = await heroFixture(context);
    const page = await fixture.mount();
    page.abort();
    page.abort();
    await settle();
    assertRevokedExactlyOnce(fixture, [...fixture.blobs.keys()]);
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), null);
});

test("old abort after same-root repeated mount cannot clear newer image ownership", async (context) => {
    const fixture = await heroFixture(context);
    const oldPage = await fixture.mount();
    const oldUrls = imageUrls(fixture);
    await fixture.mount();
    const avatar = fixture.image(),
        banner = fixture.banner();
    oldPage.abort();
    await settle();
    assert.equal(fixture.image(), avatar);
    assert.equal(fixture.banner(), banner);
    assertRevokedExactlyOnce(fixture, oldUrls);
    assertCurrent(fixture);
});

test("provider signal abort clears rendered media and stops old poll work", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const urls = imageUrls(fixture),
        before = fixture.requests.length;
    fixture.host.controller.abort();
    await settle();
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), null);
    assertRevokedExactlyOnce(fixture, urls);
    for (const poll of fixture.polls) assert.equal(poll.active, false);
    await fixture.poll();
    assert.equal(fixture.requests.length, before);
});
