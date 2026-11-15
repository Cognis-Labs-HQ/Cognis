import assert from "node:assert/strict";
import test from "node:test";
import { challenge, deferred, fixture, prompt, settle } from "./fixture.js";

for (const deliveryStatus of ["queued", "sent"]) {
    for (const interruption of [
        "method-switch",
        "failed-cancel",
        "stale-session",
    ]) {
        test(`one ${deliveryStatus} receipt survives ${interruption} without duplicate feedback`, async (context) => {
            context.mock.method(console, "error", () => {});
            const host = await fixture(context, {
                initialPrompt: prompt(0, {
                    methods: [
                        {
                            id: "email",
                            name: "Email",
                            loginUi: { supportsResend: true },
                            challenge: { maxLength: 6 },
                        },
                        {
                            id: "other",
                            name: "Other",
                            loginUi: { supportsResend: false },
                            challenge: { maxLength: 8 },
                        },
                    ],
                }),
            });
            const tabs = host.root.querySelectorAll("#login-tfa-method-nav a");
            const receipts = () =>
                host.state.notices.filter(
                    (notice) => notice.options.variant === "success",
                );
            assert.equal(receipts().length, 0);
            const pending = deferred();
            host.state.respond = () => pending.promise;
            await host.click();
            tabs[1].click();
            await settle();
            let cancellation;
            if (interruption !== "method-switch") {
                cancellation = deferred();
                host.state.cancelResponse = () => cancellation.promise;
                host.root.querySelector("#login-tfa-cancel").click();
                await settle();
            }
            if (interruption === "stale-session") {
                const { persistLoginSession } =
                    await import("/static/gateways/auth/login-client.js");
                persistLoginSession({
                    accountId: "replacement-account",
                    token: "replacement-token",
                });
                host.window.dispatchEvent(
                    new host.window.StorageEvent("storage", {
                        key: "cognis_account",
                        oldValue: null,
                        newValue: "replacement-account",
                    }),
                );
            }
            pending.resolve(
                Response.json({
                    data: { challenge: challenge(30_000, { deliveryStatus }) },
                }),
            );
            await settle();
            assert.equal(
                receipts().length,
                0,
                "An inactive method does not show its receipt early",
            );
            cancellation?.resolve(
                Response.json(
                    { error: { code: "tfa_unavailable" } },
                    { status: 503 },
                ),
            );
            await settle();
            assert.equal(receipts().length, 0);
            for (let index = 0; index < 3; index++) {
                tabs[0].click();
                await settle();
                assert.equal(
                    receipts().length,
                    interruption === "stale-session" ? 0 : 1,
                );
                assert.equal(host.resendRequests().length, 1);
                tabs[1].click();
                await settle();
            }
            tabs[0].click();
            await settle();
            if (interruption === "stale-session") {
                assert.equal(host.state.notices.length, 0);
                await host.click();
                assert.equal(host.resendRequests().length, 1);
                return;
            }
            assert.equal(host.resend().textContent, "Resend code in 30s");
            assert.equal(
                host.root.querySelector("#login-tfa-code").maxLength,
                6,
            );
            await host.advance(30_000);
            host.state.respond = () =>
                Response.json({
                    data: { challenge: challenge(60_000, { deliveryStatus }) },
                });
            await host.click();
            assert.equal(host.resendRequests().length, 2);
            assert.equal(
                receipts().length,
                2,
                "A later explicit resend retains its own receipt",
            );
            tabs[1].click();
            tabs[0].click();
            await settle();
            assert.equal(receipts().length, 2);
        });
    }
}
