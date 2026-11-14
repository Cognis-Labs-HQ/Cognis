import test from "node:test";
import assert from "node:assert/strict";
import { mountRegistrationPage } from "./reuse/registration-page.js";

async function settleUntil(predicate) {
    for (let attempt = 0; attempt < 50 && !predicate(); attempt++)
        await new Promise((resolve) => setImmediate(resolve));
    assert.equal(predicate(), true);
}

test("actual register mount closes its verification popup and revokes on navigation", async () => {
    const host = await mountRegistrationPage();
    const running = host.form.handlers.submit({ preventDefault() {} });
    await settleUntil(() => host.popups.length === 1);
    assert.equal(host.popups[0].options.signal, host.controller.signal);
    host.controller.abort();
    await running;
    assert.equal(host.popups[0].closed, true);
    assert.equal(
        host.requests.filter((request) => request.url.endsWith("/complete"))
            .length,
        1,
    );
    assert.equal(host.timers.length, 0);
});

test("actual register mount blocks submission after declared field factory failure", async () => {
    const host = await mountRegistrationPage({ fieldFailure: true });
    await host.form.handlers.submit?.({ preventDefault() {} });
    assert.equal(
        host.requests.some(
            (request) => request.url === "/api/v1/auth/register",
        ),
        false,
    );
    assert.ok(
        host.toasts.some(
            ([message]) => message === "ui.app.register.error.generic",
        ),
    );
    host.controller.abort();
});

for (const descriptor of [
    { id: "consent", scriptUrl: "", onboardingOperations: ["consent:record"] },
    {
        id: "",
        scriptUrl: "synthetic:consent",
        onboardingOperations: ["consent:record"],
    },
    {
        id: "consent",
        scriptUrl: null,
        onboardingOperations: ["consent:record"],
    },
    {
        id: 42,
        scriptUrl: "synthetic:consent",
        onboardingOperations: ["consent:record"],
    },
]) {
    test(`actual configuration response with malformed declared provider blocks signup (${JSON.stringify(descriptor)})`, async () => {
        const host = await mountRegistrationPage({
            registrationDescriptors: [descriptor],
        });
        await host.form.handlers.submit?.({ preventDefault() {} });
        assert.equal(
            host.requests.some(
                (request) => request.url === "/api/v1/auth/register",
            ),
            false,
        );
        assert.ok(
            host.toasts.some(
                ([message]) => message === "ui.app.register.error.generic",
            ),
        );
        host.controller.abort();
    });
}
