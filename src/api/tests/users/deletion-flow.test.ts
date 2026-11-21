import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { ServerResponse } from "node:http";
import { rejectAccountTarget } from "../../routes/users/account-target.js";
import { attributeComponentFault } from "../../components/fault.js";
import { recoverComponentRequest } from "../../components/http-failure.js";
import { createHarness } from "./reuse/harness.js";

async function createDeletionFixture(
    context: TestContext,
    options: Parameters<typeof createHarness>[0] = {},
) {
    const fixture = await createHarness(options);
    context.after(async () => {
        for (const dispose of [
            ...fixture.context.outcomeDisposers,
            ...fixture.context.disposers,
        ])
            await dispose();
    });
    return fixture;
}

for (const faultStage of [
    "authorize-request",
    "persist-state",
    "cleanup-dependencies",
] as const) {
    test(`deletion reports an original failure at ${faultStage} without losing recovery`, async (context) => {
        const fixture = await createDeletionFixture(context);

        const owner = { type: "module" as const, id: "disposable-cleanup" };
        const original = attributeComponentFault(
            new Error("private fixture details"),
            owner,
        );
        const observations: string[] = [];
        fixture.context.runtime.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:before-owner", order: -100 },
            () => {
                observations.push("before-owner");
            },
        );
        fixture.context.runtime.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:after-owner", order: 100 },
            (stage) => {
                assert.equal(
                    stage.stageResults["authorize-request"],
                    undefined,
                );
                observations.push("after-owner");
            },
        );
        fixture.context.runtime.flow.extend(
            "deprovision-user",
            faultStage,
            { id: "test:throw", order: 200 },
            () => {
                observations.push("throw");
                throw original;
            },
        );
        let recovered = 0;
        let reports = 0;
        const response = await fixture.request({
            method: "DELETE",
            recover: async (error, req, res) => {
                recovered += 1;
                assert.equal(error, original);
                assert.equal(res.headersSent, true);
                assert.equal(res.writableEnded, true);
                await recoverComponentRequest(
                    req,
                    res,
                    error,
                    Promise.resolve({
                        async reportServerFailure(request, target) {
                            assert.equal(request, req);
                            assert.deepEqual(target, owner);
                            reports += 1;
                        },
                    }),
                    () =>
                        assert.fail(
                            "Recovery must not encounter a second failure",
                        ),
                );
            },
        });
        const persisted = faultStage !== "authorize-request";
        assert.deepEqual(observations, [
            "before-owner",
            "after-owner",
            "throw",
        ]);
        assert.equal(response.status, 500);
        assert.deepEqual(response.body, {
            error: {
                code: persisted
                    ? "user_deletion_cleanup_incomplete"
                    : "user_deletion_outcome_unknown",
            },
            data: persisted
                ? { deleted: true, outcome: "committed", cleanup: "incomplete" }
                : { deleted: null, outcome: "unknown" },
        });
        assert.equal(response.headerCount, 1);
        assert.equal(response.responseCount, 1);
        assert.equal(recovered, 1);
        assert.equal(reports, 1);
        assert.equal(await fixture.accounts.exists("target"), !persisted);
        assert.equal(
            fixture.accounts.calls.filter((call) => call === "delete").length,
            persisted ? 1 : 0,
        );
        assert.equal(
            fixture.logs.filter(
                (entry) =>
                    entry.level === "error" &&
                    entry.message === "User deletion flow failed.",
            ).length,
            1,
        );
        assert.equal(
            JSON.stringify([response, fixture.logs]).includes(
                "private fixture details",
            ),
            false,
        );
    });
}

for (const alteration of [
    "public-results",
    "stale-reader",
    "missing-receipt",
] as const) {
    test(`deletion does not trust ${alteration} after persistence`, async (context) => {
        const fixture = await createDeletionFixture(context);

        fixture.context.runtime.flow.extend(
            "deprovision-user",
            "cleanup-dependencies",
            { id: "test:alter-receipt", order: 1000 },
            async (stage) => {
                stage.stageResults["persist-state"] = [
                    { persisted: true, username: "other", action: "delete" },
                ];
                if (alteration === "stale-reader")
                    fixture.context.runtime.removeCapability(
                        "auth:deprovisionOutcome",
                    );
                if (alteration === "missing-receipt") {
                    await fixture.context.outcomeDisposers[1]();
                    await fixture.context.outcomeDisposers[1].reactivate?.();
                }
                throw new Error("private fixture failure");
            },
        );
        const response = await fixture.request({
            method: "DELETE",
            recover: (error, req, res) =>
                recoverComponentRequest(
                    req,
                    res,
                    error,
                    undefined,
                    () => undefined,
                ),
        });
        assert.equal(response.status, 500);
        assert.deepEqual(response.body, {
            error: {
                code:
                    alteration === "public-results"
                        ? "user_deletion_cleanup_incomplete"
                        : "user_deletion_outcome_unknown",
            },
            data:
                alteration === "public-results"
                    ? {
                          deleted: true,
                          outcome: "committed",
                          cleanup: "incomplete",
                      }
                    : { deleted: null, outcome: "unknown" },
        });
        assert.equal(await fixture.accounts.exists("target"), false);
        assert.equal(
            fixture.accounts.calls.filter((call) => call === "delete").length,
            1,
        );
    });
}

for (const throwAfterDenial of [false, true]) {
    test(`owner-confirmed rejection stays not persisted, cleanup throw ${throwAfterDenial}`, async (context) => {
        let entered = false;
        const fixture = await createDeletionFixture(context, {
            policy: async ({ accountId }) =>
                entered
                    ? { allowed: false, status: 403, code: "forbidden" }
                    : { allowed: true, accountId, isCurrent: () => true },
        });

        fixture.context.runtime.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:observe-start", order: -100 },
            () => {
                entered = true;
            },
        );
        fixture.context.runtime.flow.extend(
            "deprovision-user",
            "cleanup-dependencies",
            { id: "test:forge-public-success", order: 1000 },
            (stage) => {
                stage.stageResults["persist-state"] = [
                    { persisted: true, username: "target", action: "delete" },
                ];
                if (throwAfterDenial) throw new Error("private failure");
            },
        );
        let recoveries = 0;
        const response = await fixture.request({
            method: "DELETE",
            recover: async (error, req, res) => {
                recoveries += 1;
                await recoverComponentRequest(
                    req,
                    res,
                    error,
                    undefined,
                    () => undefined,
                );
            },
        });
        let existingError: unknown;
        rejectAccountTarget(
            {
                writeHead(status: number) {
                    assert.equal(status, 403);
                },
                end(body: string) {
                    existingError = JSON.parse(body).error;
                },
            } as ServerResponse,
            { allowed: false, status: 403, code: "forbidden" },
        );
        assert.deepEqual(response.body, {
            error: existingError,
            data: { deleted: false, outcome: "rejected" },
        });
        assert.equal(response.status, 403);
        assert.equal(recoveries, Number(throwAfterDenial));
        assert.equal(await fixture.accounts.exists("target"), true);
        assert.equal(
            fixture.accounts.calls.filter((call) => call === "delete").length,
            0,
        );
        assert.deepEqual(fixture.context.revocationCalls, []);
        assert.equal(response.responseCount, 1);
    });
}

test("a forged public receipt before persistence cannot turn missing evidence into deletion", async (context) => {
    const fixture = await createDeletionFixture(context);

    fixture.context.runtime.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:forge-missing-receipt", order: -1000 },
        (stage) => {
            stage.stageResults["persist-state"] = [
                { persisted: true, username: "target", action: "delete" },
            ];
            throw new Error("private failure");
        },
    );
    const response = await fixture.request({
        method: "DELETE",
        recover: (error, req, res) =>
            recoverComponentRequest(
                req,
                res,
                error,
                undefined,
                () => undefined,
            ),
    });
    assert.deepEqual(response.body, {
        error: { code: "user_deletion_outcome_unknown" },
        data: { deleted: null, outcome: "unknown" },
    });
    assert.equal(await fixture.accounts.exists("target"), true);
    assert.equal(
        fixture.accounts.calls.filter((call) => call === "delete").length,
        0,
    );
});

test("concurrent deletion requests retain separate input and receipt identities", async (context) => {
    const fixture = await createDeletionFixture(context);

    await fixture.accounts.register("second", "fixture-only", "user");
    let entered!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => {
        entered = resolve;
    });
    const resumed = new Promise<void>((resolve) => {
        release = resolve;
    });
    fixture.context.runtime.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:pause-first", order: 1000 },
        async (stage) => {
            if ((stage.input as { username: string }).username !== "target")
                return;
            entered();
            await resumed;
            throw new Error("private first-request failure");
        },
    );
    const first = fixture.request({
        method: "DELETE",
        recover: (error, req, res) =>
            recoverComponentRequest(
                req,
                res,
                error,
                undefined,
                () => undefined,
            ),
    });
    await reached;
    const second = await fixture.request({
        method: "DELETE",
        accountId: "second",
    });
    release();
    const failed = await first;
    assert.deepEqual(second.body, { data: { deleted: true } });
    assert.equal(second.status, 200);
    assert.deepEqual(failed.body, {
        error: { code: "user_deletion_cleanup_incomplete" },
        data: { deleted: true, outcome: "committed", cleanup: "incomplete" },
    });
    assert.equal(failed.status, 500);
    assert.equal(await fixture.accounts.exists("target"), false);
    assert.equal(await fixture.accounts.exists("second"), false);
    assert.equal(
        fixture.accounts.calls.filter((call) => call === "delete").length,
        2,
    );
});

test("the existing refusal serializer preserves its public bytes and only adds requested outcome data", () => {
    const baseline = '{"error":{"code":"forbidden","message":"Access denied"}}';
    for (const data of [undefined, { deleted: false, outcome: "rejected" }]) {
        let body = "";
        let headers = 0;
        rejectAccountTarget(
            {
                writeHead(status: number) {
                    assert.equal(status, 403);
                    headers += 1;
                },
                end(value: string) {
                    body = value;
                },
            } as ServerResponse,
            { allowed: false, status: 403, code: "forbidden" },
            data,
        );
        assert.equal(
            body,
            data === undefined
                ? baseline
                : JSON.stringify({ ...JSON.parse(baseline), data }),
        );
        assert.equal(headers, 1);
    }
});

test("an unrelated refused role update retains the existing serializer response", async (context) => {
    const fixture = await createDeletionFixture(context, {
        policy: async () => ({
            allowed: false,
            status: 403,
            code: "forbidden",
        }),
    });
    const response = await fixture.request({
        action: "role",
        body: { role: "user" },
    });
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
        error: { code: "forbidden", message: "Access denied" },
    });
    assert.equal(response.responseCount, 1);
    assert.equal(await fixture.accounts.exists("target"), true);
});
