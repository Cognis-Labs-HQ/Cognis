import assert from "node:assert/strict";
import test from "node:test";
import { fixture, settleUntil } from "./fixture.js";

for (const contract of [
    { moduleVersion: undefined },
    { moduleVersion: 0 },
    { moduleVersion: 1, outputVersion: 0 },
    { moduleVersion: 1, wrongSignal: true },
    { moduleVersion: 1, missingRefresh: true },
]) {
    test(`actual Auth rejects an unsupported TFA lifecycle: ${JSON.stringify(contract)}`, async (context) => {
        context.mock.method(console, "error", () => {});
        const host = await fixture(context, {
            providerContract: contract,
            expectPrompt: false,
        });
        await settleUntil(() => host.state.notices.length > 0);
        assert.equal(host.resend(), null);
        assert.equal(host.resendRequests().length, 0);
        assert.equal(host.state.timers.size, 0);
        assert.equal(host.state.notices.at(-1).options.variant, "error");
        assert.equal(
            host.state.providerCalls.length,
            contract.moduleVersion === 1 ? 1 : 0,
        );
        for (const call of host.state.providerCalls)
            assert.equal(call.signal.aborted, true);
    });
}

for (const caller of [
    "no-version",
    "wrong-version",
    "no-signal",
    "fake-signal",
]) {
    test(`public TFA factory rejects ${caller} before creating resources`, async (context) => {
        context.mock.method(console, "error", () => {});
        const host = await fixture(context);
        const { createTfaLoginClient } =
            await import("/static/gateways/tfa/login-flow.js");
        const before = host.state.timers.size;
        const options = {
            root: host.root,
            signal: new host.window.AbortController().signal,
            lifecycleVersion: 1,
        };
        if (caller === "no-version") delete options.lifecycleVersion;
        if (caller === "wrong-version") options.lifecycleVersion = 0;
        if (caller === "no-signal") delete options.signal;
        if (caller === "fake-signal") options.signal = { aborted: false };
        await assert.rejects(
            createTfaLoginClient(options),
            /tfa_login_lifecycle_required/,
        );
        assert.equal(host.state.timers.size, before);
        assert.equal(host.resendRequests().length, 0);
    });
}

test("an explicitly compatible provider delegates the actual public client contract", async (context) => {
    const host = await fixture(context, {
        providerContract: { moduleVersion: 1 },
    });
    await host.advance(30_000);
    await host.click();
    assert.equal(host.resendRequests().length, 1);
    assert.equal(host.state.providerCalls[0].lifecycleVersion, 1);
    assert.equal(host.state.notices.at(-1).options.variant, "success");
    host.lifetime.abort();
    assert.equal(host.state.providerCalls[0].signal.aborted, true);
    assert.equal(host.state.timers.size, 0);
});

for (const locale of ["en", "de", "id", "ja"]) {
    test(`an incompatible login integration visibly fails in ${locale}`, async (context) => {
        const logs = [];
        context.mock.method(console, "error", (...args) => logs.push(args));
        const host = await fixture(context, {
            locale,
            providerContract: { moduleVersion: 0 },
            expectPrompt: false,
        });
        await settleUntil(() => host.state.notices.length > 0);
        const { createI18n } = await import("/static/reuse/i18n.js");
        const translator = await createI18n({
            componentStringBaseUrls: ["/static/gateways/auth/languages"],
        });
        assert.equal(
            host.state.notices.at(-1).text,
            translator.t("ui.app.login.error.generic"),
        );
        assert.equal(host.state.notices.at(-1).options.variant, "error");
        assert.ok(
            logs.some(
                (entry) => entry[1]?.code === "tfa_login_lifecycle_unsupported",
            ),
        );
        assert.equal(host.resendRequests().length, 0);
        assert.equal(host.resend(), null);
    });
}
