import test from "node:test";
import assert from "node:assert/strict";
import { heroFixture, settle, profileFor } from "./hero-fixture.js";

for (const kind of ["avatar", "banner"])
    test(`old ${kind} delete control cannot target newly mounted profile`, async (context) => {
        const fixture = await heroFixture(context);
        await fixture.mount();
        const button = fixture.document.querySelector(
            `.profile-${kind}-remove-btn`,
        );
        fixture.setProfile(profileFor("newer"));
        await fixture.mount("/profile/newer");
        const before = fixture.requests.length,
            avatar = fixture.image(),
            banner = fixture.banner();
        button.click();
        await settle();
        assert.equal(
            fixture.requests
                .slice(before)
                .filter((request) => request.method === "DELETE").length,
            0,
        );
        assert.equal(fixture.image(), avatar);
        assert.equal(fixture.banner(), banner);
    });

test("old follow control cannot act on a newly mounted route", async (context) => {
    const fixture = await heroFixture(context);
    fixture.setProfile(profileFor("older"));
    await fixture.mount("/profile/older");
    const button = fixture.document.querySelector(".profile-hero-follow-btn");
    fixture.setProfile(profileFor("newer"));
    await fixture.mount("/profile/newer");
    const before = fixture.requests.length,
        avatar = fixture.image();
    button.click();
    await settle();
    assert.equal(
        fixture.requests
            .slice(before)
            .filter((request) => request.method === "POST").length,
        0,
    );
    assert.equal(fixture.image(), avatar);
});

test("old banner-layout control cannot write the newly mounted page preference", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    const radio = [
        ...fixture.document.querySelectorAll(".profile-banner-height-radio"),
    ].find((item) => item.value === "full");
    assert.ok(radio);
    fixture.setProfile(profileFor("newer"));
    await fixture.mount("/profile/newer");
    const before = fixture.requests.length,
        avatar = fixture.image(),
        banner = fixture.banner();
    radio.dispatchEvent(new fixture.window.Event("change"));
    await settle();
    assert.equal(
        fixture.requests
            .slice(before)
            .filter((request) => request.method === "PUT").length,
        0,
    );
    assert.equal(fixture.image(), avatar);
    assert.equal(fixture.banner(), banner);
});

test("a rerendered Sync control stays single-flight while hero media is pending", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    let release;
    const delayed = new Promise((resolve) => {
        release = resolve;
    });
    fixture.setMedia((path) => delayed.then(() => new Response(path)));
    const first = fixture.sync();
    await settle();
    const during = fixture.document.querySelector(".profile-provider-sync-btn");
    const second = fixture.sync();
    await settle();
    const count = fixture.stages.filter(
        (item) => item === "external:sync",
    ).length;
    release();
    await Promise.all([first, second]);
    assert.equal(count, 1);
    assert.ok(during.disabled || !during.isConnected);
});
