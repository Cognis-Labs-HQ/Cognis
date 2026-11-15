import assert from "node:assert/strict";
import test from "node:test";
import type { ServerResponse } from "node:http";
import type { FlowApi, FlowRunResult } from "@cognis/core";
import { runUserDeletion } from "../../routes/users/deletion.js";
import { bindDeprovisionOutcome } from "../../routes/users/deprovision-outcome.js";
import { createHarness } from "./reuse/harness.js";

const completions: Array<{
    name: string;
    replace: (result: FlowRunResult) => unknown;
}> = [
    { name: "undefined", replace: () => undefined },
    { name: "null", replace: () => null },
    { name: "empty object", replace: () => ({}) },
    {
        name: "missing data",
        replace: (result) => ({
            flowId: result.flowId,
            stageResults: result.stageResults,
        }),
    },
    {
        name: "wrong flow",
        replace: (result) => ({ ...result, flowId: "another-flow" }),
    },
    {
        name: "copied results",
        replace: (result) => ({
            ...result,
            stageResults: { ...result.stageResults },
        }),
    },
    {
        name: "accessor result",
        replace: (result) => ({
            ...result,
            get stageResults() {
                return assert.fail(
                    "A malformed completion accessor must not execute",
                );
            },
        }),
    },
    {
        name: "invalid descriptor access",
        replace: (result) =>
            new Proxy(result, {
                ownKeys() {
                    throw new Error("private completion details");
                },
            }),
    },
];

for (const rejected of [false, true]) {
    for (const completion of completions) {
        test(`malformed completion ${completion.name} is unknown after ${rejected ? "refusal" : "deletion"}`, async (context) => {
            const fixture = await createHarness(
                rejected
                    ? {
                          policy: async () => ({
                              allowed: false,
                              status: 403,
                              code: "forbidden",
                          }),
                      }
                    : {},
            );
            context.after(async () => {
                for (const dispose of [
                    ...fixture.context.outcomeDisposers,
                    ...fixture.context.disposers,
                ])
                    await dispose();
            });
            const reader = bindDeprovisionOutcome(
                () => fixture.context.runtime,
            )!;
            let runs = 0;
            let receiptReads = 0;
            const flow: FlowApi = {
                ...fixture.context.flow,
                async run(...args: Parameters<FlowApi["run"]>) {
                    runs += 1;
                    const result = await fixture.context.flow.run(...args);
                    return completion.replace(result) as FlowRunResult;
                },
            };
            const input = Object.freeze({
                username: "target",
                action: "delete",
                actor: Object.freeze({
                    sub: "administrator",
                    role: "admin" as const,
                }),
                isAuthorizationCurrent: () => true,
            });
            let body: unknown;
            let responses = 0;
            const logs: unknown[] = [];
            const result = await runUserDeletion(
                flow,
                input,
                (original, results) => {
                    receiptReads += 1;
                    return reader(original, results);
                },
                {
                    writeHead(status: number) {
                        assert.equal(status, 500);
                    },
                    end(value: string) {
                        responses += 1;
                        body = JSON.parse(value);
                    },
                } as ServerResponse,
                (...entry) => {
                    logs.push(entry);
                },
            );
            assert.equal(result, undefined);
            assert.deepEqual(body, {
                error: { code: "user_deletion_outcome_unknown" },
                data: { deleted: null, outcome: "unknown" },
            });
            assert.equal(await fixture.accounts.exists("target"), rejected);
            assert.equal(
                fixture.accounts.calls.filter((call) => call === "delete")
                    .length,
                rejected ? 0 : 1,
            );
            assert.equal(runs, 1);
            assert.equal(receiptReads, 0);
            assert.equal(responses, 1);
            assert.equal(logs.length, 1);
            assert.doesNotMatch(
                JSON.stringify([body, logs]),
                /private completion details/,
            );
        });
    }
}
