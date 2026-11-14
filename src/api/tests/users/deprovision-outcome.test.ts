import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    runBootstrapScope,
    type CapabilityContracts,
} from "@cognis/core";
import {
    bindDeprovisionOutcome,
    type DeprovisionOutcomeReader,
} from "../../routes/users/deprovision-outcome.js";
import { allowTarget } from "./reuse/context.js";
import { createHarness } from "./reuse/harness.js";
import {
    issueAccessToken,
    verifyAccessToken,
    revokeAccessTokensForSubject,
} from "./reuse/sessions.js";

const success = Object.freeze({
    persisted: true,
    username: "target",
    action: "archive",
    revokedTokenCount: 1,
});
const unavailable = {
    persisted: false,
    status: 503,
    reason: "account_policy_unavailable",
};

test("later cleanup cannot replace a terminal founder denial with public success", async (context) => {
    context.after(() => {
        revokeAccessTokensForSubject("target");
    });
    const fixture = await createHarness({
        policy: async ({ accountId, allowFounder }) =>
            allowFounder === false
                ? {
                      allowed: false,
                      status: 403,
                      code: "protected_founder_account",
                  }
                : allowTarget(accountId),
    });
    const token = issueAccessToken("target", "user", 60);
    fixture.context.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:forge-success", order: 1000 },
        ({ stageResults }) => {
            stageResults["authorize-request"] = [{ authorized: true }];
            stageResults["persist-state"] = [success];
            stageResults["cleanup-dependencies"] = [
                { cleaned: true, revokedTokenCount: 999 },
            ];
        },
    );
    const response = await fixture.request({
        action: "disable",
        role: "owner",
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "protected_founder_account");
    assert.equal(response.responseCount, 1);
    assert.deepEqual(fixture.activity, []);
    assert.deepEqual(fixture.context.revocationCalls, []);
    assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
    assert.equal(verifyAccessToken(token)?.sub, "target");
});

for (const action of ["disable", ""]) {
    test(`${action || "delete"} uses the owner receipt and count despite forged public arrays`, async () => {
        const fixture = await createHarness();
        issueAccessToken("target", "user", 60);
        fixture.context.flow.extend(
            "deprovision-user",
            "cleanup-dependencies",
            { id: "test:forge-denial", order: 1000 },
            ({ stageResults }) => {
                stageResults["authorize-request"] = [
                    { authorized: false, reason: "private-payload" },
                ];
                stageResults["persist-state"] = [
                    {
                        persisted: false,
                        status: 403,
                        reason: "private-payload",
                    },
                ];
                stageResults["cleanup-dependencies"] = [
                    { cleaned: true, revokedTokenCount: 999 },
                ];
            },
        );
        const response = await fixture.request({
            action,
            method: action ? "POST" : "DELETE",
        });
        assert.equal(response.status, 200);
        assert.equal(response.responseCount, 1);
        assert.equal(fixture.logs.at(-1)?.meta?.revokedTokenCount, 1);
        assert.deepEqual(fixture.context.revocationCalls, ["target"]);
        assert.deepEqual(
            fixture.activity,
            action ? ["lifecycle:archived"] : [],
        );
        assert.equal(
            JSON.stringify(response).includes("private-payload"),
            false,
        );
        assert.equal(
            JSON.stringify(fixture.logs).includes("private-payload"),
            false,
        );
    });
}

test("receipts require exact input and invocation identity and do not reauthorize committed effects", async () => {
    const fixture = await createHarness();
    const pairs: Array<{ input: unknown; results: object }> = [];
    fixture.context.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:capture-receipt", order: 1000 },
        ({ input, stageResults }) => {
            pairs.push({ input, results: stageResults });
        },
    );
    const read = bindDeprovisionOutcome(() => fixture.context.runtime);
    assert.ok(read);
    await fixture.request({ action: "disable" });
    const first = pairs[0];
    const calls = fixture.context.policyCalls.length;
    assert.equal(read(first.input, first.results).persisted, true);
    assert.equal(read(first.input, first.results).persisted, true);
    assert.deepEqual(
        read({ ...(first.input as object) }, first.results),
        unavailable,
    );
    assert.deepEqual(read(first.input, { ...first.results }), unavailable);
    assert.equal(fixture.context.policyCalls.length, calls);
    await fixture.request({ action: "disable" });
    const second = pairs[1];
    assert.deepEqual(read(first.input, second.results), unavailable);
    assert.deepEqual(read(second.input, first.results), unavailable);
    assert.equal(read(second.input, second.results).persisted, true);
    const replay = await fixture.context.flow.run(
        "deprovision-user",
        first.input,
    );
    assert.deepEqual(read(first.input, first.results), unavailable);
    assert.equal(read(first.input, replay.stageResults).persisted, true);
});

test("deletedAccount exposes only a matching committed deletion", async () => {
    const fixture = await createHarness();
    let originalInput: unknown;
    let results: object = {};
    fixture.context.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:observe-deletion", order: 1000 },
        ({ input, stageResults }) => {
            originalInput = input;
            results = stageResults;
        },
    );
    await fixture.request({ method: "DELETE" });
    const api = fixture.context.runtime
        .requireCapability<CapabilityContracts>("system:contracts")
        .resolve<DeprovisionOutcomeReader>("auth:deprovisionOutcome", 1);
    assert.equal(api.deletedAccount(originalInput, results), "target");
    assert.equal(
        api.deletedAccount({ ...(originalInput as object) }, results),
        undefined,
    );
    assert.equal(api.deletedAccount(originalInput, { ...results }), undefined);
});

const malformed: unknown[] = [
    undefined,
    null,
    [],
    {},
    { persisted: "true", username: "target", action: "archive" },
    { persisted: true, username: "", action: "archive" },
    { persisted: true, username: " target ", action: "archive" },
    { persisted: true, username: "target", action: "enable" },
    {
        persisted: true,
        username: "target",
        action: "archive",
        revokedTokenCount: -1,
    },
    {
        persisted: true,
        username: "target",
        action: "archive",
        revokedTokenCount: 0.5,
    },
    {
        persisted: true,
        username: "target",
        action: "archive",
        revokedTokenCount: "1",
    },
    {
        persisted: true,
        username: "target",
        action: "archive",
        revokedTokenCount: NaN,
    },
    { persisted: false, status: "403", reason: "forbidden" },
    { persisted: false, status: 404, reason: "protected_founder_account" },
    { persisted: false, status: 403, reason: "private-payload" },
    {
        persisted: true,
        username: "target",
        action: "archive",
        raw: "private-payload",
    },
    {
        persisted: true,
        get username() {
            throw new Error("private-payload");
        },
        action: "archive",
    },
];
for (const [index, value] of malformed.entries()) {
    test(`malformed owner receipt ${index + 1} fails closed without reflecting its payload`, async () => {
        const fixture = await createHarness();
        const original =
            fixture.context.runtime.requireCapability<DeprovisionOutcomeReader>(
                "auth:deprovisionOutcome",
            );
        fixture.context.runtime.contributePublicCapability(
            "auth:deprovisionOutcome",
            {
                read: (input: unknown, results: object) =>
                    original.read(input, results) === undefined
                        ? undefined
                        : value,
                deletedAccount: () => undefined,
            },
        );
        const response = await fixture.request({ action: "disable" });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.equal(response.responseCount, 1);
        assert.deepEqual(fixture.activity, []);
        assert.equal(
            JSON.stringify(response).includes("private-payload"),
            false,
        );
        assert.equal(
            JSON.stringify(fixture.logs).includes("private-payload"),
            false,
        );
    });
}

for (const action of ["delete", "disable"] as const) {
    test(`a valid receipt for another ${action === "delete" ? "action" : "account"} cannot authorize archive`, async () => {
        const fixture = await createHarness();
        const original =
            fixture.context.runtime.requireCapability<DeprovisionOutcomeReader>(
                "auth:deprovisionOutcome",
            );
        fixture.context.runtime.contributePublicCapability(
            "auth:deprovisionOutcome",
            {
                read: (input: unknown, results: object) =>
                    original.read(input, results) === undefined
                        ? undefined
                        : {
                              persisted: true,
                              username:
                                  action === "delete" ? "target" : "other",
                              action:
                                  action === "delete" ? "delete" : "archive",
                          },
                deletedAccount: () => undefined,
            },
        );
        const response = await fixture.request({ action: "disable" });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.deepEqual(fixture.activity, []);
    });
}

const changes: Array<{
    name: string;
    change(
        fixture: Awaited<ReturnType<typeof createHarness>>,
    ): void | Promise<void>;
}> = [
    {
        name: "provider replacement",
        change: ({ context }) => {
            context.runtime.contributePublicCapability(
                "auth:deprovisionOutcome",
                { read: () => success, deletedAccount: () => undefined },
            );
        },
    },
    {
        name: "provider removal",
        change: ({ context }) => {
            context.runtime.removeCapability("auth:deprovisionOutcome");
        },
    },
    {
        name: "declaration disposal",
        change: async ({ context }) => {
            await context.outcomeDisposers[0]();
        },
    },
    {
        name: "owner generation change",
        change: async ({ context }) => {
            await context.outcomeDisposers[1]();
            await context.outcomeDisposers[1].reactivate?.();
        },
    },
    {
        name: "registry replacement",
        change: ({ context }) => {
            context.runtime.contributePublicCapability("system:contracts", {});
        },
    },
    {
        name: "root replacement",
        change: ({ context }) => {
            const replacement = createCtx();
            context.getCapability = <T>() => replacement as T;
        },
    },
];
for (const change of changes) {
    test(`a bound receipt reader rejects ${change.name} during the flow`, async () => {
        const fixture = await createHarness();
        fixture.context.flow.extend(
            "deprovision-user",
            "cleanup-dependencies",
            { id: "test:replace-reader", order: 1000 },
            async () => {
                await change.change(fixture);
            },
        );
        const response = await fixture.request({ action: "disable" });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.equal(response.responseCount, 1);
        assert.deepEqual(fixture.activity, []);
    });
}

for (const value of [
    undefined,
    {},
    { read: () => success },
    {
        read: () => {
            throw new Error("private-payload");
        },
        deletedAccount: () => undefined,
    },
    { read: async () => success, deletedAccount: () => undefined },
    {
        read: async () => {
            throw new Error("private-payload");
        },
        deletedAccount: () => undefined,
    },
]) {
    test("unavailable or malformed outcome reader prevents deprovision from starting", async () => {
        const fixture = await createHarness();
        let started = false;
        fixture.context.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:observe-start", order: 1000 },
            () => {
                started = true;
            },
        );
        fixture.context.runtime.contributePublicCapability(
            "auth:deprovisionOutcome",
            value,
        );
        const response = await fixture.request({ action: "disable" });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.equal(response.responseCount, 1);
        assert.deepEqual(fixture.activity, []);
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.context.revocationCalls, []);
        assert.equal(started, false);
    });
}

test("a missing root and mutation during preflight or receipt reading are rejected", async () => {
    assert.equal(
        bindDeprovisionOutcome(() => undefined),
        undefined,
    );
    for (const mutateOnCall of [1, 2]) {
        const fixture = await createHarness();
        let calls = 0;
        fixture.context.runtime.contributePublicCapability(
            "auth:deprovisionOutcome",
            {
                read: () => {
                    calls += 1;
                    if (calls === mutateOnCall) {
                        fixture.context.runtime.removeCapability(
                            "auth:deprovisionOutcome",
                        );
                        return success;
                    }
                    return undefined;
                },
                deletedAccount: () => undefined,
            },
        );
        const read = bindDeprovisionOutcome(() => fixture.context.runtime);
        if (mutateOnCall === 1) assert.equal(read, undefined);
        else {
            assert.ok(read);
            assert.deepEqual(read({}, {}), unavailable);
        }
    }
});

test("an incompatible outcome provider version cannot authorize archive", async () => {
    const fixture = await createHarness();
    let started = false;
    fixture.context.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:observe-start", order: 1000 },
        () => {
            started = true;
        },
    );
    await fixture.context.outcomeDisposers[0]();
    await runBootstrapScope(
        fixture.context.runtime,
        "gateway:auth",
        async () => {
            fixture.context.runtime
                .requireCapability<CapabilityContracts>("system:contracts")
                .define("auth:deprovisionOutcome", {
                    version: 2,
                    kind: "object",
                    description: "Incompatible test outcome reader.",
                    members: { read: "function", deletedAccount: "function" },
                });
        },
    );
    const response = await fixture.request({ action: "disable" });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "account_policy_unavailable");
    assert.equal(response.responseCount, 1);
    assert.deepEqual(fixture.activity, []);
    assert.deepEqual(fixture.accounts.calls, []);
    assert.deepEqual(fixture.context.revocationCalls, []);
    assert.equal(started, false);
});
