import test from "node:test";
import assert from "node:assert/strict";
import { environment, deferred, settings, policy } from "./fixtures/save.js";

for (const mode of ["cold", "mounted", "unmounted"]) {
    test(`shared Save does not write unchanged Security when ${mode}`, async () => {
        const fixture = await environment();
        if (mode !== "cold") await fixture.openSecurity();
        if (mode === "unmounted") fixture.hideSecurity();
        fixture.dirtyContribution();
        await fixture.save();
        assert.deepEqual(fixture.writes(), []);
        assert.equal(
            fixture.events.filter((event) => event.kind === "registration-save")
                .length,
            1,
        );
        assert.equal(fixture.slot.hidden, true);
    });
}

test("loaded Security saves only its dirty endpoint with unchanged values preserved", async () => {
    const fixture = await environment();
    await fixture.openSecurity();
    await fixture.edit("trusted-domains", "trusted.example, second.example");
    await fixture.save();
    assert.deepEqual(
        fixture.writes().map(({ body }) => body),
        [
            {
                ...settings,
                trustedDomains: ["trusted.example", "second.example"],
            },
        ],
    );
    assert.equal(
        fixture.events.some((event) => event.kind === "registration-save"),
        false,
    );
    assert.equal(fixture.section.isDirty(), false);
});

test("drafts survive detached controls, refresh and discard", async () => {
    const fixture = await environment();
    await fixture.openSecurity();
    await fixture.edit("policy-min-length", 24);
    fixture.hideSecurity();
    assert.equal(fixture.section.isDirty(), true);
    await fixture.openSecurity();
    assert.equal(fixture.fields.get("#security-policy-min-length").value, "24");
    fixture.hideSecurity();
    await fixture.save();
    assert.deepEqual(
        fixture.writes().map(({ body }) => body),
        [{ ...policy, minLength: 24 }],
    );
    await fixture.openSecurity();
    await fixture.edit("policy-min-length", 26);
    fixture.hideSecurity();
    fixture.section.discard();
    await fixture.openSecurity();
    assert.equal(fixture.fields.get("#security-policy-min-length").value, "24");
    assert.equal(fixture.section.isDirty(), false);
});

for (const endpoint of ["security", "password-policy"]) {
    for (const failure of ["http", "missing", "network"]) {
        test(`${endpoint} ${failure} read cannot produce default writes`, async () => {
            const fixture = await environment();
            fixture.intercept((request) => {
                if (!request.url.endsWith(endpoint)) return;
                if (failure === "network") throw new Error("offline");
                return { ok: failure !== "http", json: async () => ({}) };
            });
            await fixture.openSecurity();
            fixture.dirtyContribution();
            await fixture.save();
            assert.deepEqual(fixture.writes(), []);
            assert.equal(fixture.section.isDirty(), false);
            assert.ok(
                fixture.events.some(
                    (event) =>
                        event.kind === "toast" && event.variant === "error",
                ),
            );
            await assert.rejects(fixture.section.save(), /security_not_loaded/);
            fixture.intercept(undefined);
            await fixture.openSecurity();
            assert.equal(
                fixture.fields.get("#security-policy-min-length").value,
                "20",
            );
        });
    }
}

test("loading Security is coalesced and can complete after controls unmount", async () => {
    const fixture = await environment();
    const pending = deferred();
    fixture.intercept((request) =>
        request.url.endsWith("security") ? pending.promise : undefined,
    );
    const opened = fixture.openSecurity();
    const refreshed = fixture.section.refresh();
    fixture.hideSecurity();
    fixture.dirtyContribution();
    await fixture.save();
    assert.deepEqual(fixture.writes(), []);
    pending.resolve({ ok: true, json: async () => ({ data: settings }) });
    await Promise.all([opened, refreshed]);
    await fixture.openSecurity();
    assert.equal(
        fixture.requests.filter((request) => request.url.endsWith("security"))
            .length,
        1,
    );
    assert.equal(
        fixture.fields.get("#security-enforce-tfa-for-all-users").checked,
        true,
    );
});

test("partial endpoint failure preserves pending policy and retries only the failed write", async () => {
    const fixture = await environment();
    await fixture.openSecurity();
    await fixture.edit("login-session-timeout", 45);
    await fixture.edit("policy-min-length", 24);
    fixture.intercept((request) =>
        request.method === "PUT" && request.url.includes("password-policy")
            ? { ok: false }
            : undefined,
    );
    fixture.dirtyContribution();
    await fixture.save();
    assert.equal(fixture.slot.hidden, false);
    assert.equal(fixture.section.isDirty(), true);
    assert.ok(
        fixture.events.some(
            (event) => event.kind === "toast" && event.variant === "error",
        ),
    );
    assert.equal(
        fixture.events.some((event) => event.kind === "registration-save"),
        false,
    );
    fixture.hideSecurity();
    fixture.intercept(undefined);
    await fixture.save();
    assert.deepEqual(
        fixture.writes().map(({ url }) => url),
        [
            "/api/v1/system/security",
            "/api/v1/auth/password-policy",
            "/api/v1/auth/password-policy",
        ],
    );
    assert.equal(fixture.slot.hidden, true);
});

test("contribution failure preserves pending edits without repeating successful Security writes", async () => {
    const fixture = await environment();
    await fixture.openSecurity();
    await fixture.edit("policy-min-length", 24);
    fixture.dirtyContribution();
    fixture.contributionFails(true);
    await fixture.save();
    assert.equal(fixture.slot.hidden, false);
    assert.equal(fixture.section.isDirty(), false);
    fixture.contributionFails(false);
    await fixture.save();
    assert.equal(fixture.writes().length, 1);
    assert.equal(fixture.slot.hidden, true);
});

test("edits and repeated clicks during Save keep newer draft dirty", async () => {
    const fixture = await environment();
    await fixture.openSecurity();
    await fixture.edit("policy-min-length", 24);
    const pending = deferred();
    const started = deferred();
    fixture.intercept((request) => {
        if (request.method === "PUT") {
            started.resolve();
            return pending.promise;
        }
    });
    const saving = fixture.save();
    await started.promise;
    await fixture.edit("policy-min-length", 26);
    await fixture.save();
    assert.equal(fixture.writes().length, 1);
    pending.resolve({ ok: true });
    await saving;
    assert.equal(fixture.slot.hidden, false);
    assert.equal(fixture.section.isDirty(), true);
    fixture.hideSecurity();
    fixture.intercept(undefined);
    await fixture.save();
    assert.deepEqual(
        fixture.writes().map(({ body }) => body.minLength),
        [24, 26],
    );
    assert.equal(fixture.slot.hidden, true);
});

test("repeated refresh replaces listeners and preserves draft controls", async () => {
    const fixture = await environment();
    await fixture.openSecurity();
    await fixture.edit("login-session-timeout-unit", "never", "change");
    await fixture.section.refresh();
    await fixture.section.refresh();
    const control = fixture.fields.get("#security-login-session-timeout-unit");
    assert.equal(control.value, "never");
    assert.equal(
        control.handlers.get("change").filter(({ signal }) => !signal.aborted)
            .length,
        1,
    );
    assert.equal(
        fixture.fields.get("#security-login-session-timeout").hidden,
        true,
    );
    await fixture.save();
    assert.deepEqual(
        fixture.writes().map(({ body }) => body),
        [{ ...settings, loginSessionTimeoutMinutes: 0 }],
    );
});

test("page disposal prevents an outstanding read from binding a stale view", async () => {
    const fixture = await environment();
    const pending = deferred();
    fixture.intercept((request) =>
        request.url.endsWith("security") ? pending.promise : undefined,
    );
    const opened = fixture.openSecurity();
    fixture.abort();
    pending.resolve({ ok: true, json: async () => ({ data: settings }) });
    await opened;
    assert.equal(fixture.fields.get("#security-trusted-domains").value, "");
    assert.equal(
        fixture.events.some((event) => event.kind === "toast"),
        false,
    );
    assert.deepEqual(fixture.writes(), []);
});
