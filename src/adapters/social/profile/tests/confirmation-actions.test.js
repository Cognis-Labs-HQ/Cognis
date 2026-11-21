import test from "node:test";
import assert from "node:assert/strict";
import { heroFixture, settle, deferred, profileFor } from "./hero-fixture.js";

const actions = [
    {
        name: "Delete",
        selector: ".post-delete-btn",
        path: "/api/v1/social/posts/post-1",
        method: "DELETE",
        own: true,
        danger: true,
    },
    {
        name: "Unfollow",
        selector: ".profile-hero-follow-btn",
        path: "/api/v1/social/users/other/follow",
        method: "DELETE",
        following: true,
        danger: true,
    },
    {
        name: "Block",
        selector: ".profile-hero-block-btn",
        path: "/api/v1/social/users/other/block",
        method: "POST",
        danger: true,
    },
    {
        name: "Unblock",
        selector: ".profile-hero-unblock-btn",
        path: "/api/v1/social/users/other/block",
        method: "DELETE",
        blocked: true,
        danger: false,
    },
];

async function setup(context, action) {
    const fixture = await heroFixture(context, { withPopup: true });
    fixture.setProfile({
        ...profileFor(action.own ? "learner" : "other"),
        avatarKey: null,
        bannerKey: null,
    });
    fixture.setOverride((path) => {
        if (path.endsWith("/relationship"))
            return Response.json({
                data: {
                    following: !!action.following,
                    blocked: !!action.blocked,
                },
            });
        if (path === "/api/v1/social/posts")
            return Response.json({
                data: [
                    {
                        id: "post-1",
                        content: "Fixture post",
                        createdAt: "2026-11-15T00:00:00Z",
                    },
                ],
            });
    });
    await fixture.mount(action.own ? "/profile" : "/profile/other");
    fixture.requests.length = 0;
    fixture.stages.length = 0;
    return fixture;
}

function activePopup(fixture) {
    return fixture.document.querySelector(".popup-overlay[data-popup-active]");
}

function clickAction(fixture, id) {
    const button = activePopup(fixture)?.querySelector(
        `[data-popup-action="${id}"]`,
    );
    assert.ok(button, `popup ${id} control`);
    button.click();
}

const writes = (fixture) =>
    fixture.requests.filter(({ method }) => method !== "GET");

for (const action of actions) {
    test(`${action.name} uses neutral Cancel and truthful intent; cancel and retained controls cannot write`, async (context) => {
        const fixture = await setup(context, action);
        const trigger = fixture.document.querySelector(action.selector);
        assert.ok(trigger, action.selector);
        trigger.click();
        trigger.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(
            fixture.document.querySelectorAll(
                ".popup-overlay[data-popup-active]",
            ).length,
            1,
        );
        const popup = activePopup(fixture);
        const cancel = popup.querySelector('[data-popup-action="cancel"]');
        const confirm = popup.querySelector('[data-popup-action="confirm"]');
        assert.equal(cancel.textContent.trim(), "Cancel");
        assert.ok(cancel.classList.contains("btn-neutral"));
        assert.equal(confirm.textContent.trim(), action.name);
        assert.ok(
            confirm.classList.contains(
                action.danger ? "btn-cancel" : "btn-neutral",
            ),
        );
        cancel.click();
        await settle();
        confirm.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(writes(fixture).length, 0);
        trigger.click();
        await settle();
        clickAction(fixture, "confirm");
        await settle();
        assert.deepEqual(writes(fixture), [
            { path: action.path, method: action.method },
        ]);
        for (const stage of ["before", "execute", "after"])
            assert.ok(
                fixture.stages.includes(`social:profile:request:${stage}`),
            );
        trigger.dispatchEvent(new fixture.window.Event("click"));
        confirm.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(writes(fixture).length, 1);
    });

    test(`${action.name} coalesces pending delivery and reports uncertain 500 without replay`, async (context) => {
        const fixture = await setup(context, action);
        const pending = deferred();
        fixture.setOverride((path, options) =>
            options.method === action.method && path === action.path
                ? pending.promise
                : undefined,
        );
        const trigger = fixture.document.querySelector(action.selector);
        trigger.click();
        await settle();
        clickAction(fixture, "confirm");
        await settle();
        trigger.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(writes(fixture).length, 1);
        pending.resolve(
            Response.json({ error: { code: "failed" } }, { status: 500 }),
        );
        await settle();
        assert.match(fixture.notices.at(-1).message, /could not be confirmed/);
        assert.equal(fixture.notices.at(-1).variant, "error");
        trigger.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(writes(fixture).length, 1);
        assert.equal(activePopup(fixture), null);
    });
}

for (const revoke of ["route", "account", "token", "provider", "provider-id"]) {
    test(`pending confirmation is inert after ${revoke} changes`, async (context) => {
        const fixture = await setup(context, actions[0]);
        fixture.document.querySelector(actions[0].selector).click();
        await settle();
        const confirm = activePopup(fixture).querySelector(
            '[data-popup-action="confirm"]',
        );
        if (revoke === "route") await fixture.mount("/profile/newer");
        if (revoke === "account") fixture.host.changeAccount("newer");
        if (revoke === "token")
            fixture.host.changeAccount("learner", "new-token");
        if (revoke === "provider") fixture.host.controller.abort();
        if (revoke === "provider-id") fixture.setProviderId("new-provider");
        confirm.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(writes(fixture).length, 0);
    });
}

test("rejected delivery permits an explicit confirmed retry", async (context) => {
    const fixture = await setup(context, actions[0]);
    fixture.setOverride((path, options) =>
        options.method === "DELETE"
            ? Response.json({ error: { code: "denied" } }, { status: 403 })
            : undefined,
    );
    fixture.document.querySelector(actions[0].selector).click();
    await settle();
    clickAction(fixture, "confirm");
    await settle();
    assert.match(fixture.notices.at(-1).message, /not completed/);
    fixture.setOverride(undefined);
    fixture.document.querySelector(actions[0].selector).click();
    await settle();
    clickAction(fixture, "confirm");
    await settle();
    assert.equal(writes(fixture).length, 2);
    assert.equal(fixture.document.querySelector(actions[0].selector), null);
});

for (const action of actions.slice(1, 3)) {
    test(`${action.name} preserves accepted relationship when actual connection refresh fails`, async (context) => {
        const fixture = await setup(context, action);
        fixture.setOverride((path, options) =>
            options.method
                ? Response.json({ data: {} })
                : Response.json(
                      { error: { code: "read_failed" } },
                      { status: 500 },
                  ),
        );
        fixture.document.querySelector(action.selector).click();
        await settle();
        clickAction(fixture, "confirm");
        await settle();
        assert.equal(writes(fixture).length, 1);
        assert.match(
            fixture.notices.at(-1).message,
            /accepted.*could not be refreshed/,
        );
        assert.ok(
            fixture.document.querySelector(
                action.name === "Block"
                    ? ".profile-hero-unblock-btn"
                    : '.profile-hero-follow-btn[data-following="false"]',
            ),
        );
    });
}

for (const failure of ["throw", "unreadable"]) {
    test(`${failure} after submission is uncertain and cannot be blindly retried`, async (context) => {
        const fixture = await setup(context, actions[0]);
        fixture.setOverride((_path, options) => {
            if (options.method !== "DELETE") return;
            if (failure === "throw") throw new TypeError("connection_lost");
            return new Response("not JSON");
        });
        const trigger = fixture.document.querySelector(actions[0].selector);
        trigger.click();
        await settle();
        clickAction(fixture, "confirm");
        await settle();
        assert.match(fixture.notices.at(-1).message, /could not be confirmed/);
        trigger.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(writes(fixture).length, 1);
        assert.equal(activePopup(fixture), null);
    });
}

test("offline policy rejection is known unsent and allows a fresh confirmation after recovery", async (context) => {
    const fixture = await setup(context, actions[0]);
    fixture.host.disconnect();
    const policy = fixture.host.ctx.capabilities.get("offline:accessPolicy");
    policy.allows = () => false;
    fixture.document.querySelector(actions[0].selector).click();
    await settle();
    clickAction(fixture, "confirm");
    await settle();
    assert.equal(writes(fixture).length, 0);
    assert.match(fixture.notices.at(-1).message, /not completed/);
    policy.allows = () => true;
    fixture.host.reconnect();
    fixture.document.querySelector(actions[0].selector).click();
    await settle();
    clickAction(fixture, "confirm");
    await settle();
    assert.equal(writes(fixture).length, 1);
});

test("offline accepted deletion queues once and removes its post without a failed refresh", async (context) => {
    const fixture = await setup(context, actions[0]);
    fixture.host.disconnect();
    const trigger = fixture.document.querySelector(actions[0].selector);
    trigger.click();
    await settle();
    clickAction(fixture, "confirm");
    await settle();
    assert.equal(writes(fixture).length, 0);
    assert.equal(
        (await fixture.host.outbox.pending("social.profile")).length,
        1,
    );
    assert.equal(fixture.document.querySelector(actions[0].selector), null);
    trigger.dispatchEvent(new fixture.window.Event("click"));
    await settle();
    assert.equal(
        (await fixture.host.outbox.pending("social.profile")).length,
        1,
    );
});

test("old accepted deletion and refresh cannot repaint a newer mount", async (context) => {
    const fixture = await setup(context, actions[0]);
    const pending = deferred();
    fixture.setOverride((_path, options) =>
        options.method === "DELETE" ? pending.promise : undefined,
    );
    fixture.document.querySelector(actions[0].selector).click();
    await settle();
    clickAction(fixture, "confirm");
    await settle();
    fixture.setProfile(profileFor("newer"));
    await fixture.mount("/profile/newer");
    const hero = fixture.document.querySelector(".profile-hero");
    const count = fixture.notices.length;
    pending.resolve(Response.json({ data: {} }));
    await settle();
    assert.equal(fixture.document.querySelector(".profile-hero"), hero);
    assert.equal(fixture.notices.length, count);
});

test("a suggested contact is followed, never unfollowed using the viewed profile relationship", async (context) => {
    const fixture = await heroFixture(context, { withPopup: true });
    fixture.setProfile(profileFor("other"));
    fixture.setFollowers([{ handle: "suggested", displayName: "Suggested" }]);
    fixture.setOverride((path) =>
        path.endsWith("/relationship")
            ? Response.json({ data: { following: true } })
            : undefined,
    );
    await fixture.mount("/profile/other");
    fixture.requests.length = 0;
    const trigger = fixture.document.querySelector(
        '.profile-follow-btn[data-handle="suggested"]',
    );
    trigger.click();
    trigger.dispatchEvent(new fixture.window.Event("click"));
    await settle();
    assert.deepEqual(writes(fixture), [
        { path: "/api/v1/social/users/suggested/follow", method: "POST" },
    ]);
    assert.ok(
        fixture.document.querySelector(
            '.profile-hero-follow-btn[data-following="true"]',
        ),
    );
    assert.equal(activePopup(fixture), null);
    trigger.dispatchEvent(new fixture.window.Event("click"));
    await settle();
    assert.equal(writes(fixture).length, 1);
});

for (const action of actions) {
    test(`${action.name} cannot reuse an obsolete connected control after accepted repaint failure`, async (context) => {
        const fixture = await setup(context, action);
        fixture.setRefreshFailure(new Error("synthetic_render_failure"));
        const trigger = fixture.document.querySelector(action.selector);
        trigger.click();
        await settle();
        clickAction(fixture, "confirm");
        await settle();
        assert.equal(trigger.isConnected, true);
        assert.match(
            fixture.notices.at(-1).message,
            /accepted.*could not be refreshed/,
        );
        trigger.dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(writes(fixture).length, 1);
        assert.equal(activePopup(fixture), null);
    });
}

for (const boundary of ["before", "pending"]) {
    for (const revoke of ["route", "provider"]) {
        test(`${revoke} invalidation during ${boundary} cannot queue an obsolete post deletion`, async (context) => {
            const fixture = await setup(context, actions[0]);
            const entered = Promise.withResolvers();
            const release = Promise.withResolvers();
            if (boundary === "before") {
                fixture.host.ctx.extendFlow(
                    "social:profile:request",
                    "before",
                    { id: "hold-delete" },
                    async ({ input }) => {
                        if (input.options.method !== "DELETE") return;
                        entered.resolve();
                        await release.promise;
                    },
                );
            } else {
                const original = fixture.host.outbox.pending;
                let held = false;
                fixture.host.outbox.pending = async (...args) => {
                    if (!held) {
                        held = true;
                        entered.resolve();
                        await release.promise;
                    }
                    return original(...args);
                };
            }
            fixture.document.querySelector(actions[0].selector).click();
            await settle();
            clickAction(fixture, "confirm");
            await entered.promise;
            if (revoke === "route") await fixture.mount("/profile/newer");
            else {
                fixture.setProviderId("new-provider");
                fixture.window.dispatchEvent(
                    new fixture.window.Event("storage"),
                );
            }
            fixture.host.disconnect();
            release.resolve();
            await settle();
            assert.equal(writes(fixture).length, 0);
            assert.equal(
                (await fixture.host.outbox.pending("social.profile")).length,
                0,
            );
        });
    }
}
