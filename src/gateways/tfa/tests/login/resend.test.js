import assert from "node:assert/strict";
import test from "node:test";
import { challenge, deferred, fixture, prompt, settle } from "./fixture.js";

for (const resume of [true, false]) {
    test(`real login permits consecutive cooldown resends with resume=${resume}`, async (context) => {
        const host = await fixture(context, { resume });
        assertAvailable(host, false);
        await host.click();
        assert.equal(host.resendRequests().length, 0);
        await host.advance(29_999);
        assertAvailable(host, false);
        await host.advance(1);
        assertAvailable(host, true);
        for (let cycle = 1; cycle <= 3; cycle++) {
            await host.click();
            assert.equal(host.resendRequests().length, cycle);
            assertAvailable(host, false);
            await host.advance(30_000);
            assertAvailable(host, true);
            assert.equal(host.resendRequests().length, cycle);
        }
    });
}

function assertAvailable(host, available) {
    assert.equal(
        host.resend().getAttribute("aria-disabled"),
        String(!available),
    );
    assert.equal(
        host.resend().classList.contains("auth-text-action--disabled"),
        !available,
    );
    assert.equal(host.resend().hidden, false);
}

for (const deadline of [-1000, 0]) {
    test(`resuming an absolute deadline ${deadline} does not restart relative cooldown`, async (context) => {
        const host = await fixture(context, {
            initialPrompt: prompt(deadline),
        });
        assertAvailable(host, true);
        assert.equal(host.resendRequests().length, 0);
        await host.click();
        assert.equal(host.resendRequests().length, 1);
        assertAvailable(host, false);
        await host.advance(30_000);
        assertAvailable(host, true);
    });
}

test("a pending resend stays locked past its old deadline and suppresses repeated clicks", async (context) => {
    const host = await fixture(context);
    await host.advance(30_000);
    const gate = deferred();
    host.state.respond = () => gate.promise;
    await host.click();
    await host.advance(90_000);
    await host.click();
    assert.equal(host.resendRequests().length, 1);
    assertAvailable(host, false);
    gate.resolve(
        Response.json({
            data: { challenge: challenge(host.state.clock + 30_000) },
        }),
    );
    await settle();
    await host.advance(29_999);
    assertAvailable(host, false);
    await host.advance(1);
    assertAvailable(host, true);
});

for (const details of [false, true]) {
    test(`server 429 deadline is respected when nested=${details}`, async (context) => {
        const host = await fixture(context);
        await host.advance(30_000);
        host.state.respond = () =>
            Response.json(
                {
                    error: {
                        code: "rate_limited",
                        ...(details
                            ? {
                                  details: {
                                      resendAvailableAt: new Date(
                                          50_000,
                                      ).toISOString(),
                                      retryAfterSeconds: 20,
                                  },
                              }
                            : {
                                  resendAvailableAt: new Date(
                                      50_000,
                                  ).toISOString(),
                                  retryAfterSeconds: 20,
                              }),
                    },
                },
                { status: 429 },
            );
        await host.click();
        assertAvailable(host, false);
        await host.advance(19_999);
        await host.click();
        assert.equal(host.resendRequests().length, 1);
        assertAvailable(host, false);
        await host.advance(1);
        assertAvailable(host, true);
        host.state.respond = () =>
            Response.json({ data: { challenge: challenge(80_000) } });
        await host.click();
        assert.equal(host.resendRequests().length, 2);
        await host.advance(30_000);
        assertAvailable(host, true);
    });
}

test("a delayed 429 response with an elapsed deadline does not restart the old relative wait", async (context) => {
    const host = await fixture(context);
    await host.advance(30_000);
    const gate = deferred();
    host.state.respond = () => gate.promise;
    await host.click();
    await host.advance(30_000);
    gate.resolve(
        Response.json(
            {
                error: {
                    code: "rate_limited",
                    retryAfterSeconds: 20,
                    resendAvailableAt: new Date(50_000).toISOString(),
                },
            },
            { status: 429 },
        ),
    );
    await settle();
    assertAvailable(host, true);
    assert.equal(host.resendRequests().length, 1);
});

for (const failure of ["http", "network", "invalid-json"]) {
    test(`${failure} resend failure permits an explicit retry`, async (context) => {
        const errors = [];
        context.mock.method(console, "error", (...args) => errors.push(args));
        const host = await fixture(context);
        await host.advance(30_000);
        host.state.respond = () => {
            if (failure === "network")
                throw new TypeError("Synthetic disconnected network");
            if (failure === "invalid-json")
                return new Response("unavailable", { status: 503 });
            return Response.json(
                { error: { code: "service_unavailable" } },
                { status: 503 },
            );
        };
        await host.click();
        assertAvailable(host, true);
        if (failure === "network") {
            assert.equal(errors.length, 1);
            assert.equal(host.state.notices.at(-1).options.variant, "error");
        }
        host.state.respond = () =>
            Response.json({ data: { challenge: challenge(60_000) } });
        await host.click();
        assert.equal(host.resendRequests().length, 2);
        await host.advance(30_000);
        assertAvailable(host, true);
    });
}

test("cancelling a pending resend and reopening does not let the old completion lock the new attempt", async (context) => {
    const host = await fixture(context);
    await host.advance(30_000);
    const oldResend = deferred();
    host.state.respond = () => oldResend.promise;
    await host.click();
    host.root.querySelector("#login-tfa-cancel").click();
    await settle();
    assert.equal(
        host.requests.filter((entry) => entry.method === "DELETE").length,
        1,
    );
    for (const diagnostic of host.navigationDiagnostics)
        assert.match(diagnostic.message, /navigation/);
    assert.equal(host.window.location.pathname, "/login");
    await host.reopen(
        prompt(30_000, { loginAttemptId: "new-synthetic-attempt" }),
    );
    assertAvailable(host, true);
    oldResend.resolve(
        Response.json({ data: { challenge: challenge(120_000) } }),
    );
    await settle();
    assertAvailable(host, true);
    host.state.respond = () =>
        Response.json({ data: { challenge: challenge(60_000) } });
    await host.click();
    assert.deepEqual(host.resendRequests().at(-1).body, {
        loginAttemptId: "new-synthetic-attempt",
        methodId: "email",
    });
    await host.advance(30_000);
    assertAvailable(host, true);
});

test("failed cancellation does not permanently disable the surviving attempt", async (context) => {
    const errors = [];
    context.mock.method(console, "error", (...args) => errors.push(args));
    const host = await fixture(context);
    host.state.cancelResponse = () =>
        Response.json({ error: {} }, { status: 503 });
    host.root.querySelector("#login-tfa-cancel").click();
    await settle();
    assert.equal(errors.length, 1);
    assert.equal(host.state.notices.at(-1).options.variant, "error");
    await host.advance(30_000);
    assertAvailable(host, true);
    await host.click();
    assert.equal(host.resendRequests().length, 1);
    await host.advance(30_000);
    assertAvailable(host, true);
});
