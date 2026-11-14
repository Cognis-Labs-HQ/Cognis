import assert from "node:assert/strict";
import test from "node:test";
import type { ApplyEnforcementPolicy } from "../bootstrap/enforcement-policy.js";
import { createSessionFixture } from "./reuse/session-fixture.js";

for (const entry of ["policy", "setter", "route"]) {
    test(`${entry} revokes every restricted credential while preserving normal sessions`, async () => {
        const fixture = await createSessionFixture();
        await fixture.store.setEnforceAllUsers(true);
        const sessions = new Map([
            ["admin-pending", { subject: "admin", pending: true }],
            ["user-pending", { subject: "user", pending: true }],
            ["admin-normal", { subject: "admin", pending: false }],
        ]);
        let calls = 0;
        fixture.capabilities.contribute(
            "auth:revokeSetupPendingAccessTokens",
            () => {
                calls += 1;
                let removed = 0;
                for (const [token, session] of sessions) {
                    if (session.pending) {
                        sessions.delete(token);
                        removed += 1;
                    }
                }
                return removed;
            },
        );
        const change = async () => {
            if (entry === "policy") {
                return fixture.capabilities.require<ApplyEnforcementPolicy>(
                    "tfa:applyEnforcementPolicy",
                )({ required: false });
            }
            if (entry === "setter") {
                return fixture.capabilities.require<
                    (required: boolean) => Promise<void>
                >("tfa:setEnforceAllUsers")(false);
            }
            const result = await fixture.request(
                "/api/v1/tfa/enforcement",
                { enforceAllUsers: false },
                "PUT",
            );
            assert.equal(result.status, 200);
        };
        await change();
        assert.equal(await fixture.store.getEnforceAllUsers(), false);
        assert.deepEqual([...sessions.keys()], ["admin-normal"]);
        await change();
        assert.equal(calls, 2);
        assert.deepEqual([...sessions.keys()], ["admin-normal"]);
    });
}

for (const failure of ["missing", "revoke", "read", "write", "disabled"]) {
    test(`policy ${failure} failure cannot report success`, async () => {
        const fixture = await createSessionFixture();
        await fixture.store.setEnforceAllUsers(true);
        let writes = 0;
        const set = fixture.store.setEnforceAllUsers;
        fixture.store.setEnforceAllUsers = async (required) => {
            if (failure === "write") throw new Error("private details");
            writes += 1;
            await set(required);
        };
        if (failure !== "missing")
            fixture.capabilities.contribute(
                "auth:revokeSetupPendingAccessTokens",
                () => {
                    if (failure === "revoke")
                        throw new Error("private token store details");
                    return 1;
                },
            );
        if (failure === "read")
            fixture.store.getEnforceAllUsers = async () => {
                throw new Error("private read details");
            };
        if (failure === "disabled")
            await fixture.gatewayRegistry.disable("tfa");
        const apply = fixture.capabilities.require<ApplyEnforcementPolicy>(
            "tfa:applyEnforcementPolicy",
        );
        await assert.rejects(
            apply({ required: false }),
            /tfa_policy_unavailable/,
        );
        assert.equal(writes, 0);
        assert.doesNotMatch(JSON.stringify(fixture.state.logs), /private/);
    });
}

test("enforcement route reports unavailable cleanup without changing policy", async () => {
    const fixture = await createSessionFixture();
    await fixture.store.setEnforceAllUsers(true);
    const result = await fixture.request(
        "/api/v1/tfa/enforcement",
        { enforceAllUsers: false },
        "PUT",
    );
    assert.equal(result.status, 503);
    assert.equal(await fixture.store.getEnforceAllUsers(), true);
});

test("revocation during setup verification prevents session refresh", async () => {
    const fixture = await createSessionFixture();
    const setup = await fixture.gateway.beginMethodSetup({
        accountId: "alice",
        displayName: "Alice",
        methodId: "totp",
    });
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    fixture.adapter.verifySetup = async () => {
        entered.resolve();
        await release.promise;
        return { verified: true, state: {} };
    };
    const pending = fixture.request("/api/v1/tfa/methods/totp/setup/verify", {
        setupId: setup.setupId,
        verification: { code: "123456" },
    });
    await entered.promise;
    fixture.capabilities.contribute(
        "auth:revokeSetupPendingAccessTokens",
        () => {
            fixture.capabilities.contribute("auth:getAuthClaims", () => null);
            return 1;
        },
    );
    await fixture.capabilities.require<ApplyEnforcementPolicy>(
        "tfa:applyEnforcementPolicy",
    )({ required: false });
    release.resolve();
    assert.equal((await pending).status, 503);
    assert.equal(fixture.state.commits, 0);
});

test("policy writes invalidate older assessments and block new issuance until persistence completes", async () => {
    const fixture = await createSessionFixture();
    await fixture.store.setEnforceAllUsers(true);
    const readEntered = Promise.withResolvers<void>();
    const readRelease = Promise.withResolvers<void>();
    const originalStatus = fixture.gateway.getUserStatus.bind(fixture.gateway);
    fixture.gateway.getUserStatus = async (accountId) => {
        const status = await originalStatus(accountId);
        readEntered.resolve();
        await readRelease.promise;
        return status;
    };
    const oldAssessment = fixture.assess();
    await readEntered.promise;
    const writeEntered = Promise.withResolvers<void>();
    const writeRelease = Promise.withResolvers<void>();
    const originalSet = fixture.store.setEnforceAllUsers;
    fixture.store.setEnforceAllUsers = async (required) => {
        writeEntered.resolve();
        await writeRelease.promise;
        await originalSet(required);
    };
    fixture.capabilities.contribute(
        "auth:revokeSetupPendingAccessTokens",
        () => 0,
    );
    const change = fixture.capabilities.require<ApplyEnforcementPolicy>(
        "tfa:applyEnforcementPolicy",
    )({ required: false });
    await writeEntered.promise;
    assert.equal((await fixture.assess()).outcome, "tfa_unavailable");
    readRelease.resolve();
    assert.equal((await oldAssessment).outcome, "tfa_unavailable");
    assert.equal(fixture.state.issued.length, 0);
    writeRelease.resolve();
    await change;
    assert.equal((await fixture.assess()).outcome, "assured");
});

for (const value of ["false", null, 0, undefined]) {
    test(`enforcement route rejects invalid boolean ${String(value)}`, async () => {
        const fixture = await createSessionFixture();
        await fixture.store.setEnforceAllUsers(true);
        const result = await fixture.request(
            "/api/v1/tfa/enforcement",
            { enforceAllUsers: value },
            "PUT",
        );
        assert.equal(result.status, 400);
        assert.equal(await fixture.store.getEnforceAllUsers(), true);
    });
}

test("completed assurance is invalidated by a policy change", async () => {
    const fixture = await createSessionFixture();
    const assessed = await fixture.assess();
    assert.equal(assessed.outcome, "assured");
    const isCurrent = assessed.isAssuranceCurrent;
    assert.equal(typeof isCurrent, "function");
    if (typeof isCurrent !== "function") throw new Error("missing assurance");
    assert.equal(isCurrent(), true);
    await fixture.capabilities.require<ApplyEnforcementPolicy>(
        "tfa:applyEnforcementPolicy",
    )({ required: true });
    assert.equal(isCurrent(), false);
    assert.equal(await fixture.store.getEnforceAllUsers(), true);
});

test("revoked setup credentials cannot start or finish setup or obtain refresh", async () => {
    const fixture = await createSessionFixture();
    const setup = await fixture.gateway.beginMethodSetup({
        accountId: "alice",
        displayName: "Alice",
        methodId: "totp",
    });
    fixture.capabilities.contribute(
        "auth:revokeSetupPendingAccessTokens",
        () => {
            fixture.state.authenticated = false;
            return 1;
        },
    );
    await fixture.capabilities.require<ApplyEnforcementPolicy>(
        "tfa:applyEnforcementPolicy",
    )({ required: false });
    assert.equal(
        (await fixture.request("/api/v1/tfa/methods/totp/setup/begin", {}))
            .status,
        401,
    );
    assert.equal(
        (
            await fixture.request("/api/v1/tfa/methods/totp/setup/verify", {
                setupId: setup.setupId,
                verification: { code: "123456" },
            })
        ).status,
        401,
    );
    assert.equal(fixture.state.commits, 0);
});

test("raw policy flow cannot bypass serialized owner authority", async () => {
    const fixture = await createSessionFixture();
    await fixture.store.setEnforceAllUsers(true);
    let revoked = 0;
    fixture.capabilities.contribute(
        "auth:revokeSetupPendingAccessTokens",
        () => {
            revoked += 1;
            return 1;
        },
    );
    await assert.rejects(
        fixture.root.flow.run("tfa:applyEnforcementPolicy", {
            required: false,
            revision: 0,
        }),
        /tfa_policy_unavailable/,
    );
    assert.equal(revoked, 0);
    assert.equal(await fixture.store.getEnforceAllUsers(), true);
});

test("captured policy operation cannot be replayed during or after execution", async () => {
    const fixture = await createSessionFixture();
    await fixture.store.setEnforceAllUsers(true);
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const read = fixture.store.getEnforceAllUsers;
    fixture.store.getEnforceAllUsers = async () => {
        started.resolve();
        await release.promise;
        return read();
    };
    let captured: unknown;
    let capturedData: Record<string, unknown> = {};
    fixture.root.flow.extend(
        "tfa:applyEnforcementPolicy",
        "readPolicy",
        { id: "test:capturePolicy", order: -100 },
        ({ input, data }) => {
            captured = input;
            capturedData = data;
        },
    );
    let revoked = 0;
    fixture.capabilities.contribute(
        "auth:revokeSetupPendingAccessTokens",
        () => {
            revoked += 1;
            return 1;
        },
    );
    const apply = fixture.capabilities.require<ApplyEnforcementPolicy>(
        "tfa:applyEnforcementPolicy",
    );
    const pending = apply({ required: false });
    await started.promise;
    await assert.rejects(
        fixture.root.flow.run("tfa:applyEnforcementPolicy", captured, {
            data: capturedData,
        }),
        /tfa_policy_unavailable/,
    );
    assert.equal(revoked, 0);
    release.resolve();
    await pending;
    assert.equal(revoked, 1);
    await assert.rejects(
        fixture.root.flow.run("tfa:applyEnforcementPolicy", captured, {
            data: capturedData,
        }),
        /tfa_policy_unavailable/,
    );
    assert.equal(revoked, 1);
    assert.equal(await read(), false);
});
