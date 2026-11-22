import test from "node:test";
import assert from "node:assert/strict";
import {
    createOnboardingClient,
    registerPublicAccount,
} from "../../ui/onboarding-client.js";

const response = (status, data) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
});

test("onboarding client sends explicit operation and completion without ordinary auth state", async () => {
    const requests = [];
    const controller = new AbortController();
    const client = createOnboardingClient("synthetic", {
        signal: controller.signal,
        fetchImpl: async (path, options) => {
            requests.push({ path, options });
            return response(path.endsWith("complete") ? 204 : 200, {
                data: { done: true },
            });
        },
    });
    assert.deepEqual(
        await client.execute("provider:operation", { value: true }),
        { done: true },
    );
    controller.abort();
    await client.complete();
    assert.equal(requests[0].options.signal, controller.signal);
    assert.deepEqual(JSON.parse(requests[0].options.body), {
        operation: "provider:operation",
        input: { value: true },
    });
    assert.equal(requests[1].options.keepalive, true);
    assert.equal(requests[1].options.signal, undefined);
    assert.equal(requests[1].options.headers.authorization, "Bearer synthetic");
    await assert.rejects(
        client.execute("provider:operation", {}),
        /onboarding_closed/,
    );
    await client.complete();
    assert.equal(requests.length, 2);
});

test("onboarding owner status and code survive transport errors", async () => {
    const client = createOnboardingClient("synthetic", {
        fetchImpl: async () =>
            response(422, { error: { code: "invalid_code" } }),
    });
    await assert.rejects(
        client.execute("notify:email:verify", {}),
        (error) => error.status === 422 && error.code === "invalid_code",
    );
});

test("completion coalesces concurrent callers and denies stale operation results", async () => {
    let resolveOperation;
    let resolveCompletion;
    const operation = new Promise((done) => {
        resolveOperation = done;
    });
    const completion = new Promise((done) => {
        resolveCompletion = done;
    });
    let completions = 0;
    const client = createOnboardingClient("synthetic", {
        fetchImpl: (path) => {
            if (path.endsWith("complete")) {
                completions++;
                return completion;
            }
            return operation;
        },
    });
    const pending = client.execute("provider:operation", {});
    const first = client.complete();
    const second = client.complete();
    assert.equal(first, second);
    resolveOperation(response(200, { data: "stale" }));
    await assert.rejects(pending, /onboarding_closed/);
    resolveCompletion(response(204));
    await first;
    assert.equal(completions, 1);
});

test("public registration preserves account-created issuance failure", async () => {
    await assert.rejects(
        registerPublicAccount({}, async () =>
            response(503, {
                error: { code: "onboarding_unavailable" },
                data: { accountCreated: true },
            }),
        ),
        (error) =>
            error.accountCreated && error.code === "onboarding_unavailable",
    );
});

test("failed completion can be retried without reopening operations", async () => {
    let attempts = 0;
    const client = createOnboardingClient("synthetic", {
        fetchImpl: async () => {
            attempts++;
            return response(attempts === 1 ? 503 : 204, {
                error: { code: "onboarding_unavailable" },
            });
        },
    });
    await assert.rejects(client.complete(), { code: "onboarding_unavailable" });
    await assert.rejects(
        client.execute("provider:allowed", {}),
        /onboarding_closed/,
    );
    await client.complete();
    assert.equal(attempts, 2);
});
