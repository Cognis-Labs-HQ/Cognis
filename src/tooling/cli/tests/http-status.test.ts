import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest, ApiRequestError } from "../http.ts";
import { deleteUserAccount, UserDeletionError } from "../user-deletion.ts";

for (const status of [200, 201, 202, 207]) {
    for (const expectedStatus of [undefined, 200]) {
        test(`public transport status ${status}, expected ${expectedStatus ?? "any success"}`, async (context) => {
            const originalFetch = globalThis.fetch;
            context.after(() => {
                globalThis.fetch = originalFetch;
            });
            let requests = 0;
            const body = { data: { fixture: true } };
            globalThis.fetch = async () => {
                requests += 1;
                return Response.json(body, { status });
            };
            const execute = () =>
                apiRequest("https://cli-audit.invalid", "/fixture/status", {
                    expectedStatus,
                });
            if (expectedStatus === undefined || status === expectedStatus)
                assert.deepEqual(await execute(), body);
            else
                await assert.rejects(execute, (error: unknown) => {
                    assert.ok(error instanceof ApiRequestError);
                    assert.equal(error.status, status);
                    assert.deepEqual(error.payload, body);
                    return true;
                });
            assert.equal(requests, 1);
        });
    }
    test(`deletion accepts only status 200, actual ${status}`, async (context) => {
        const originalFetch = globalThis.fetch;
        context.after(() => {
            globalThis.fetch = originalFetch;
        });
        let requests = 0;
        const body = { data: { deleted: true } };
        globalThis.fetch = async () => {
            requests += 1;
            return Response.json(body, { status });
        };
        const execute = () =>
            deleteUserAccount(
                "https://cli-audit.invalid",
                "target",
                "fixture-only",
            );
        if (status === 200) assert.deepEqual(await execute(), body);
        else
            await assert.rejects(execute, (error: unknown) => {
                assert.ok(error instanceof UserDeletionError);
                assert.equal(error.outcome, "unknown");
                assert.ok(error.cause instanceof ApiRequestError);
                assert.equal(error.cause.status, status);
                return true;
            });
        assert.equal(requests, 1);
    });
}

for (const expectedStatus of [undefined, 200]) {
    for (const status of [200, 202, 400]) {
        test(`progress transport status ${status}, expected ${expectedStatus ?? "any success"}`, async (context) => {
            const originalFetch = globalThis.fetch;
            context.after(() => {
                globalThis.fetch = originalFetch;
            });
            let requests = 0;
            const progress = { type: "progress", message: "fixture progress" };
            const body =
                JSON.stringify(progress) +
                "\n" +
                JSON.stringify({ type: "result", payload: { done: true } }) +
                "\n";
            globalThis.fetch = async () => {
                requests += 1;
                return new Response(body, {
                    status,
                    headers: { "content-type": "application/x-ndjson" },
                });
            };
            const events: unknown[] = [];
            const execute = () =>
                apiRequest("https://cli-audit.invalid", "/fixture/progress", {
                    expectedStatus,
                    reportProgress: (event) => {
                        events.push(event);
                    },
                });
            if (
                status < 400 &&
                (expectedStatus === undefined || status === expectedStatus)
            ) {
                assert.deepEqual(await execute(), { done: true });
                assert.deepEqual(events, [progress]);
            } else {
                await assert.rejects(execute, (error: unknown) => {
                    assert.ok(error instanceof ApiRequestError);
                    assert.equal(error.status, status);
                    assert.equal(error.payload, body);
                    return true;
                });
                assert.deepEqual(events, []);
            }
            assert.equal(requests, 1);
        });
    }
}
