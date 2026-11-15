import assert from "node:assert/strict";
import test from "node:test";
import { challenge, deferred, fixture, prompt, settle } from "./fixture.js";

for (const [status, code] of [
    [401, "tfa_attempt_expired"],
    [503, "tfa_unavailable"],
]) {
    test(`second DOM click reports ${status} after its first resend cooldown disappears`, async (context) => {
        const host = await fixture(context);
        await host.advance(30_000);
        await host.click();
        assert.equal(host.resendRequests().length, 1);
        await host.advance(30_000);
        const action = host.resend();
        assert.equal(action.getAttribute("aria-disabled"), "false");
        assert.equal(
            action.classList.contains("auth-text-action--disabled"),
            false,
        );
        assert.equal(action.hasAttribute("disabled"), false);
        assert.equal(action.textContent, "Resend code");
        let clickEvents = 0;
        action.addEventListener("click", () => clickEvents++);
        const noticesBefore = host.state.notices.length;
        host.state.respond = () =>
            Response.json({ error: { code, message: code } }, { status });
        await host.click();
        assert.equal(clickEvents, 1);
        assert.equal(host.resendRequests().length, 2);
        assert.equal(host.resend(), action);
        assert.equal(action.textContent, "Resend code");
        assert.equal(action.getAttribute("aria-disabled"), "false");
        assert.equal(
            host.state.notices.length,
            noticesBefore + 1,
            "A rejected resend must visibly explain why no new countdown appears",
        );
        assert.equal(host.state.notices.at(-1).options.variant, "error");
    });
}

test("the second normal DOM click retains its handler and starts a successful new cooldown", async (context) => {
    const host = await fixture(context);
    await host.advance(30_000);
    await host.click();
    await host.advance(30_000);
    const action = host.resend();
    let clickEvents = 0;
    action.addEventListener("click", () => clickEvents++);
    const noticesBefore = host.state.notices.length;
    host.state.respond = () =>
        Response.json({ data: { challenge: challenge(90_000) } });
    await host.click();
    assert.equal(clickEvents, 1);
    assert.equal(host.resendRequests().length, 2);
    assert.equal(host.resend(), action);
    assert.equal(host.state.notices.length, noticesBefore + 1);
    assert.equal(host.state.notices.at(-1).options.variant, "success");
    assert.equal(action.getAttribute("aria-disabled"), "true");
    assert.equal(action.textContent, "Resend code in 30s");
    await host.advance(30_000);
    assert.equal(action.getAttribute("aria-disabled"), "false");
});

for (const challengeData of [
    {},
    { retryAfterSeconds: 20 },
    { message: "private-provider-detail" },
]) {
    test(`a valid challenge without delivery receipt has neutral feedback: ${JSON.stringify(challengeData)}`, async (context) => {
        const host = await fixture(context);
        await host.advance(30_000);
        await host.click();
        await host.advance(30_000);
        const noticesBefore = host.state.notices.length;
        host.state.respond = () =>
            Response.json({ data: { challenge: challengeData } });
        await host.click();
        assert.equal(host.resendRequests().length, 2);
        assert.equal(host.state.notices.length, noticesBefore + 1);
        assert.equal(host.state.notices.at(-1).options.variant, "info");
        assert.equal(
            host.state.notices.at(-1).text,
            "The verification method responded, but did not confirm delivery.",
        );
        assert.equal(
            host.resend().getAttribute("aria-disabled"),
            String(Boolean(challengeData.retryAfterSeconds)),
        );
        await host.advance(20_000);
        assert.equal(host.resend().getAttribute("aria-disabled"), "false");
        assert.equal(host.resendRequests().length, 2);
    });
}

for (const body of [
    null,
    {},
    { data: {} },
    { data: { challenge: [] } },
    { data: { challenge: "private-provider-detail" } },
]) {
    test(`malformed successful envelope retains issued constraints and reports uncertainty: ${JSON.stringify(body)}`, async (context) => {
        const logs = [];
        context.mock.method(console, "error", (...args) => logs.push(args));
        const host = await fixture(context);
        await host.advance(30_000);
        await host.click();
        await host.advance(30_000);
        const noticesBefore = host.state.notices.length;
        host.state.respond = () => Response.json(body);
        await host.click();
        assert.equal(host.resendRequests().length, 2);
        assert.equal(host.state.notices.length, noticesBefore + 1);
        assert.equal(host.state.notices.at(-1).options.variant, "error");
        assert.equal(
            host.state.notices.at(-1).text,
            "The resend result could not be confirmed. Check for a code before trying again.",
        );
        assert.equal(host.root.querySelector("#login-tfa-code").maxLength, 6);
        assert.equal(host.resend().getAttribute("aria-disabled"), "false");
        assert.equal(logs.length, 1);
        assert.deepEqual(logs[0][1], {
            component: "tfa",
            operation: "resendLoginChallenge",
            status: 200,
            errorName: "InvalidChallengeResponse",
        });
        assert.equal(
            JSON.stringify(logs).includes("private-provider-detail"),
            false,
        );
        assert.equal(JSON.stringify(logs).includes("synthetic-attempt"), false);
    });
}

for (const [body, status] of [
    [{ error: { code: "tfa_attempt_expired" } }, 401],
    [{ data: { challenge: {} } }, 200],
    [{ data: null }, 200],
]) {
    test(`an obsolete second resend cannot show feedback on a reopened attempt: ${JSON.stringify(body)}`, async (context) => {
        const host = await fixture(context);
        await host.advance(30_000);
        await host.click();
        await host.advance(30_000);
        const response = deferred();
        host.state.respond = () => response.promise;
        await host.click();
        host.root.querySelector("#login-tfa-cancel").click();
        await settle();
        await host.reopen(
            prompt(60_000, { loginAttemptId: "new-synthetic-attempt" }),
        );
        const noticesBefore = host.state.notices.length;
        response.resolve(Response.json(body, { status }));
        await settle();
        assert.equal(host.state.notices.length, noticesBefore);
        assert.equal(host.resend().getAttribute("aria-disabled"), "false");
        assert.equal(host.resendRequests().length, 2);
    });
}

test("an unsettled second resend has visible and accessible pending feedback without a new deadline", async (context) => {
    const host = await fixture(context);
    await host.advance(30_000);
    await host.click();
    await host.advance(30_000);
    const pending = deferred();
    host.state.respond = () => pending.promise;
    const before = host.state.notices.length;
    await host.click();
    assert.equal(host.resend().textContent, "Requesting code…");
    assert.equal(host.resend().getAttribute("aria-busy"), "true");
    await host.advance(90_000);
    assert.equal(host.resend().textContent, "Requesting code…");
    assert.equal(host.resend().getAttribute("aria-disabled"), "true");
    await host.click();
    assert.equal(host.resendRequests().length, 2);
    assert.equal(host.state.notices.length, before);
    pending.resolve(Response.json({ data: { challenge: {} } }));
    await settle();
    assert.equal(host.resend().getAttribute("aria-busy"), "false");
    assert.equal(host.resend().textContent, "Resend code");
    assert.equal(host.resend().getAttribute("aria-disabled"), "false");
    assert.equal(host.state.notices.at(-1).options.variant, "info");
});
