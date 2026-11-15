import assert from "node:assert/strict";
import test from "node:test";
import {
    challenge,
    deferred,
    fixture,
    observeStorageListeners,
    prompt,
    settle,
} from "./fixture.js";

for (const ending of ["abort", "cancel", "remount", "rerender"]) {
    for (const outcome of ["success", "network"]) {
        test(`${ending} releases pending resend before late ${outcome}`, async (context) => {
            const host = await fixture(context);
            const listeners = observeStorageListeners(context, host.window);
            await host.advance(30_000);
            const pending = deferred();
            host.state.respond = () => pending.promise;
            await host.click();
            assert.equal(listeners.size, 1);
            const oldLink = host.resend();
            if (ending === "abort") host.lifetime.abort();
            if (ending === "cancel")
                host.root.querySelector("#login-tfa-cancel").click();
            if (ending === "remount")
                await host.reopen(
                    prompt(0, { loginAttemptId: "next-attempt" }),
                    {
                        abortPrevious: false,
                    },
                );
            if (ending === "rerender") await host.state.render();
            await settle();
            assert.equal(
                listeners.size,
                0,
                "Disposed UI has no storage observer while transport is unresolved",
            );
            const noticeCount = host.state.notices.length;
            const label = host.resend().textContent;
            oldLink.click();
            await settle();
            assert.equal(host.resendRequests().length, 1);
            if (outcome === "success")
                pending.resolve(
                    Response.json({ data: { challenge: challenge(90_000) } }),
                );
            else
                pending.reject(new TypeError("Synthetic network interruption"));
            await settle();
            assert.equal(listeners.size, 0);
            assert.equal(host.state.notices.length, noticeCount);
            assert.equal(host.resend().textContent, label);
            if (ending === "remount" || ending === "rerender") {
                host.state.respond = () =>
                    Response.json({ data: { challenge: challenge(60_000) } });
                await host.click();
                assert.equal(host.resendRequests().length, 2);
                assert.equal(host.state.notices.length, noticeCount + 1);
            }
        });
    }
}

test("repeated mounts release abandoned pending observers without cancelling dispatched requests", async (context) => {
    const host = await fixture(context, { initialPrompt: prompt(0) });
    const listeners = observeStorageListeners(context, host.window);
    const unresolved = [];
    for (let index = 0; index < 3; index++) {
        const pending = deferred();
        unresolved.push(pending);
        host.state.respond = () => pending.promise;
        await host.click();
        assert.equal(listeners.size, 1);
        await host.reopen(prompt(0, { loginAttemptId: `attempt-${index}` }), {
            abortPrevious: false,
        });
        assert.equal(listeners.size, 0);
    }
    const current = deferred();
    host.state.respond = () => current.promise;
    await host.click();
    assert.equal(listeners.size, 1);
    const noticeCount = host.state.notices.length;
    for (const pending of unresolved) {
        pending.resolve(
            Response.json({ data: { challenge: challenge(30_000) } }),
        );
        await settle();
        assert.equal(
            listeners.size,
            1,
            "Old settlement cannot remove the current listener",
        );
        assert.equal(host.state.notices.length, noticeCount);
    }
    current.resolve(Response.json({ data: { challenge: challenge(30_000) } }));
    await settle();
    assert.equal(listeners.size, 0);
    assert.equal(host.state.notices.length, noticeCount + 1);
    assert.equal(host.resendRequests().length, 4);
});

test("failed cancellation preserves the active resend until success or owner disposal", async (context) => {
    context.mock.method(console, "error", () => {});
    const host = await fixture(context, { initialPrompt: prompt(0) });
    const listeners = observeStorageListeners(context, host.window);
    const pending = deferred();
    const cancellation = deferred();
    host.state.respond = () => pending.promise;
    host.state.cancelResponse = () => cancellation.promise;
    await host.click();
    host.root.querySelector("#login-tfa-cancel").click();
    await settle();
    assert.equal(
        listeners.size,
        1,
        "A pending cancel is not successful disposal",
    );
    cancellation.resolve(
        Response.json({ error: { code: "unavailable" } }, { status: 503 }),
    );
    await settle();
    assert.equal(listeners.size, 1);
    assert.equal(host.resend().getAttribute("aria-disabled"), "true");
    const noticeCount = host.state.notices.length;
    await host.click();
    assert.equal(host.resendRequests().length, 1);
    pending.resolve(Response.json({ data: { challenge: challenge(30_000) } }));
    await settle();
    assert.equal(listeners.size, 0);
    assert.equal(host.state.notices.length, noticeCount + 1);
    await host.advance(30_000);
    const nextPending = deferred();
    host.state.respond = () => nextPending.promise;
    await host.click();
    assert.equal(listeners.size, 1);
    host.state.cancelResponse = () => Response.json({ data: {} });
    host.root.querySelector("#login-tfa-cancel").click();
    await settle();
    assert.equal(listeners.size, 0);
    nextPending.resolve(
        Response.json({ data: { challenge: challenge(60_000) } }),
    );
    await settle();
    assert.equal(host.resendRequests().length, 2);
});

test("page abort immediately releases the active cooldown timer", async (context) => {
    const host = await fixture(context);
    assert.equal(host.state.timers.size, 1);
    host.lifetime.abort();
    assert.equal(host.state.timers.size, 0);
});

for (const outcome of ["success", "http", "network", "relative-limit"]) {
    test(`settled ${outcome} resend is reconciled after Cancel fails`, async (context) => {
        context.mock.method(console, "error", () => {});
        const host = await fixture(context);
        await host.advance(30_000);
        const resend = deferred();
        const cancellation = deferred();
        host.state.respond = () => resend.promise;
        host.state.cancelResponse = () => cancellation.promise;
        await host.click();
        host.root.querySelector("#login-tfa-cancel").click();
        await settle();
        if (outcome === "success")
            resend.resolve(
                Response.json({ data: { challenge: challenge(90_000) } }),
            );
        if (outcome === "http")
            resend.resolve(
                Response.json(
                    { error: { code: "tfa_unavailable" } },
                    { status: 503 },
                ),
            );
        if (outcome === "network")
            resend.reject(new TypeError("Synthetic network failure"));
        if (outcome === "relative-limit")
            resend.resolve(
                Response.json(
                    { error: { code: "rate_limited", retryAfterSeconds: 20 } },
                    { status: 429 },
                ),
            );
        await settle();
        await host.advance(30_000);
        cancellation.resolve(
            Response.json(
                { error: { code: "tfa_unavailable" } },
                { status: 503 },
            ),
        );
        await settle();
        if (outcome === "success") {
            assert.equal(host.resend().textContent, "Resend code in 30s");
            assert.equal(host.state.notices.at(-2).options.variant, "success");
        } else {
            assert.equal(host.resend().getAttribute("aria-disabled"), "false");
            assert.equal(host.state.notices.at(-2).options.variant, "error");
        }
        await host.advance(30_000);
        assert.equal(host.resend().getAttribute("aria-disabled"), "false");
        assert.equal(host.resend().getAttribute("aria-busy"), "false");
        host.state.respond = () =>
            Response.json({ data: { challenge: challenge(120_000) } });
        await host.click();
        assert.equal(host.resendRequests().length, 2);
    });
}

for (const replacement of ["page", "session", "same-tab", "provider"]) {
    test(`failed Cancel cannot reconcile a stale ${replacement} prompt`, async (context) => {
        context.mock.method(console, "error", () => {});
        const host = await fixture(context);
        await host.advance(30_000);
        const resend = deferred();
        const cancellation = deferred();
        host.state.respond = () => resend.promise;
        host.state.cancelResponse = () => cancellation.promise;
        await host.click();
        host.root.querySelector("#login-tfa-cancel").click();
        await settle();
        if (replacement === "page") host.lifetime.abort();
        if (replacement === "session" || replacement === "same-tab") {
            const { persistLoginSession } =
                await import("/static/gateways/auth/login-client.js");
            persistLoginSession({
                accountId: "replacement-account",
                token: "replacement-token",
            });
            if (replacement === "session")
                host.window.dispatchEvent(
                    new host.window.StorageEvent("storage", {
                        key: "cognis_account",
                        oldValue: null,
                        newValue: "replacement-account",
                    }),
                );
        }
        if (replacement === "provider")
            await host.reopen(
                prompt(0, {
                    loginAttemptId: "replacement-attempt",
                    methods: [
                        {
                            id: "replacement-method",
                            name: "Synthetic method",
                            loginUi: { supportsResend: true },
                        },
                    ],
                }),
                { abortPrevious: false },
            );
        const notices = host.state.notices.length;
        const label = host.resend().textContent;
        resend.resolve(
            Response.json({ data: { challenge: challenge(90_000) } }),
        );
        await settle();
        cancellation.resolve(
            Response.json(
                { error: { code: "tfa_unavailable" } },
                { status: 503 },
            ),
        );
        await settle();
        assert.equal(host.state.notices.length, notices);
        assert.equal(host.resend().textContent, label);
        if (replacement === "provider") {
            host.state.respond = () =>
                Response.json({ data: { challenge: challenge(90_000) } });
            await host.click();
            assert.equal(
                host.resendRequests().at(-1).body.methodId,
                "replacement-method",
            );
            assert.equal(host.resendRequests().length, 2);
        } else {
            await host.click();
            assert.equal(host.resendRequests().length, 1);
        }
    });
}
