import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { DeprovisionOutcomeReader } from "../../routes/users/deprovision-outcome.js";
import { recoverComponentRequest } from "../../components/http-failure.js";
import { createHarness } from "./reuse/harness.js";

async function fixtureFor(
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

for (const scenario of [
    "owner-unavailable",
    "expired-lease",
    "missing-receipt",
    "invalid-receipt",
    "stale-after-commit",
]) {
    for (const throws of [false, true]) {
        test(`unavailable deletion evidence stays unknown: ${scenario}, thrown ${throws}`, async (context) => {
            let entered = false;
            let current = true;
            const fixture = await fixtureFor(context, {
                policy: async ({ accountId }) =>
                    scenario === "owner-unavailable" && entered
                        ? {
                              allowed: false,
                              status: 503,
                              code: "account_policy_unavailable",
                          }
                        : {
                              allowed: true,
                              accountId,
                              isCurrent: () => current,
                          },
            });
            fixture.context.flow.extend(
                "deprovision-user",
                "authorize-request",
                { id: "test:observe-unavailable", order: 1000 },
                () => {
                    entered = true;
                    if (scenario === "expired-lease") current = false;
                },
            );
            if (scenario === "missing-receipt")
                fixture.context.runtime.removeFlowStageHook(
                    "deprovision-user",
                    "persist-state",
                    "test:apply-deprovision",
                );
            if (scenario === "invalid-receipt") {
                const reader =
                    fixture.context.runtime.requireCapability<DeprovisionOutcomeReader>(
                        "auth:deprovisionOutcome",
                    );
                fixture.context.runtime.contributePublicCapability(
                    "auth:deprovisionOutcome",
                    {
                        read(input: unknown, results: object) {
                            return reader.read(input, results)
                                ? {
                                      persisted: false,
                                      reason: "private invalid receipt",
                                  }
                                : undefined;
                        },
                        deletedAccount: reader.deletedAccount,
                    },
                );
            }
            if (scenario === "stale-after-commit")
                fixture.context.flow.extend(
                    "deprovision-user",
                    "cleanup-dependencies",
                    { id: "test:expire-receipt", order: 1000 },
                    () => {
                        fixture.context.runtime.removeCapability(
                            "auth:deprovisionOutcome",
                        );
                    },
                );
            const original = new Error("private unavailable fixture failure");
            if (throws)
                fixture.context.flow.extend(
                    "deprovision-user",
                    "cleanup-dependencies",
                    { id: "test:throw-unavailable", order: 2000 },
                    () => {
                        throw original;
                    },
                );
            let recoveries = 0;
            const response = await fixture.request({
                method: "DELETE",
                recover: async (error, req, res) => {
                    recoveries += 1;
                    assert.equal(error, original);
                    await recoverComponentRequest(
                        req,
                        res,
                        error,
                        undefined,
                        () => assert.fail("Unexpected recovery failure"),
                    );
                },
            });
            assert.equal(response.status, throws ? 500 : 503);
            assert.deepEqual(response.body, {
                error: throws
                    ? { code: "user_deletion_outcome_unknown" }
                    : {
                          code: "account_policy_unavailable",
                          message: "account_policy_unavailable",
                      },
                data: { deleted: null, outcome: "unknown" },
            });
            assert.equal(response.headerCount, 1);
            assert.equal(response.responseCount, 1);
            assert.equal(recoveries, Number(throws));
            const committed = scenario === "stale-after-commit";
            assert.equal(await fixture.accounts.exists("target"), !committed);
            assert.equal(
                fixture.accounts.calls.filter((call) => call === "delete")
                    .length,
                Number(committed),
            );
            assert.deepEqual(
                fixture.context.revocationCalls,
                committed ? ["target"] : [],
            );
            assert.equal(
                fixture.logs.filter((entry) => entry.level === "error").length,
                1,
            );
            assert.doesNotMatch(
                JSON.stringify([response, fixture.logs]),
                /private/,
            );
        });
    }
}

for (const status of [401, 403, 503]) {
    test(`pre-flow denial ${status} retains its response without outcome data`, async (context) => {
        const fixture = await fixtureFor(context);
        let entered = false;
        fixture.context.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:preflow-denial" },
            () => {
                entered = true;
            },
        );
        if (status === 401) {
            const requireAuth = fixture.context.requireAuth;
            fixture.context.requireAuth = (req, res, role) => {
                req.headers.authorization = "";
                return requireAuth(req, res, role);
            };
        }
        if (status === 503)
            fixture.context.runtime.removeCapability("auth:deprovisionOutcome");
        const response = await fixture.request({
            method: "DELETE",
            role: status === 403 ? "user" : "admin",
        });
        assert.equal(response.status, status);
        assert.deepEqual(response.body, {
            error:
                status === 503
                    ? {
                          code: "account_policy_unavailable",
                          message: "account_policy_unavailable",
                      }
                    : { code: status === 401 ? "unauthorized" : "forbidden" },
        });
        assert.equal(response.responseCount, 1);
        assert.equal(entered, false);
        assert.equal(await fixture.accounts.exists("target"), true);
        assert.equal(
            fixture.accounts.calls.filter((call) => call === "delete").length,
            0,
        );
        assert.deepEqual(fixture.context.revocationCalls, []);
    });
}
