import assert from "node:assert/strict";
import test from "node:test";
import {
    challenge,
    deferred,
    fixture,
    observeStorageListeners,
    settle,
} from "./fixture.js";

for (const transition of [
    "account",
    "token",
    "same-tab",
    "account-roundtrip",
    "unrelated",
]) {
    test(`pending second resend respects ${transition} session ownership`, async (context) => {
        const host = await fixture(context);
        const { persistLoginSession } =
            await import("/static/gateways/auth/login-client.js");
        await host.advance(30_000);
        await host.click();
        await host.advance(30_000);
        const pending = deferred();
        host.state.respond = () => pending.promise;
        await host.click();
        const noticesBefore = host.state.notices.length;
        if (transition === "unrelated") {
            host.window.localStorage.setItem(
                "cognis_display_name",
                "Updated label",
            );
            host.window.dispatchEvent(
                new host.window.StorageEvent("storage", {
                    key: "cognis_display_name",
                    oldValue: null,
                    newValue: "Updated label",
                }),
            );
        } else {
            persistLoginSession({
                accountId:
                    transition === "token" ? "" : "another-synthetic-account",
                token: "another-synthetic-token",
            });
            if (transition === "token")
                host.window.localStorage.removeItem("cognis_account");
            if (transition !== "same-tab") {
                host.window.dispatchEvent(
                    new host.window.StorageEvent("storage", {
                        key:
                            transition === "token"
                                ? "cognis_access_token"
                                : "cognis_account",
                        oldValue: null,
                        newValue: "another-synthetic-value",
                    }),
                );
            }
            if (transition === "account-roundtrip") {
                host.window.localStorage.removeItem("cognis_account");
                host.window.localStorage.removeItem("cognis_access_token");
                host.window.dispatchEvent(
                    new host.window.StorageEvent("storage", {
                        key: "cognis_account",
                        oldValue: "another-synthetic-account",
                        newValue: null,
                    }),
                );
            }
        }
        pending.resolve(
            Response.json(
                { error: { code: "tfa_attempt_expired" } },
                { status: 401 },
            ),
        );
        await settle();
        assert.equal(
            host.state.notices.length,
            noticesBefore + (transition === "unrelated" ? 1 : 0),
        );
        host.state.respond = () =>
            Response.json({
                data: { challenge: challenge(host.state.clock + 30_000) },
            });
        await host.click();
        assert.equal(
            host.resendRequests().length,
            transition === "unrelated" ? 3 : 2,
        );
    });
}

test("a changed session cannot submit an idle former prompt", async (context) => {
    const host = await fixture(context);
    await host.advance(30_000);
    const { persistLoginSession } =
        await import("/static/gateways/auth/login-client.js");
    persistLoginSession({
        accountId: "another-synthetic-account",
        token: "another-synthetic-token",
    });
    await host.click();
    assert.equal(host.resendRequests().length, 0);
});

for (const outcome of ["success", "network", "session-change"]) {
    test(`pending storage observation is released after ${outcome}`, async (context) => {
        const logs = [];
        context.mock.method(console, "error", (...args) => logs.push(args));
        const host = await fixture(context);
        await host.advance(30_000);
        const listeners = observeStorageListeners(context, host.window);
        const pending = deferred();
        host.state.respond = () => pending.promise;
        await host.click();
        assert.equal(listeners.size, 1);
        if (outcome === "session-change") {
            const { persistLoginSession } =
                await import("/static/gateways/auth/login-client.js");
            persistLoginSession({
                accountId: "another-synthetic-account",
                token: "another-synthetic-token",
            });
            host.window.dispatchEvent(
                new host.window.StorageEvent("storage", {
                    key: "cognis_account",
                    oldValue: null,
                    newValue: "another-synthetic-account",
                }),
            );
            assert.equal(listeners.size, 0);
            pending.reject(new TypeError("Synthetic network interruption"));
        } else if (outcome === "network") {
            pending.reject(new TypeError("Synthetic network interruption"));
        } else {
            pending.resolve(
                Response.json({ data: { challenge: challenge(60_000) } }),
            );
        }
        await settle();
        assert.equal(listeners.size, 0);
        assert.equal(logs.length, outcome === "network" ? 1 : 0);
    });
}
