import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createLoginClientLoaders } from "../../ui/login-page/client-loaders.js";

const pending = {
    tfaRequired: true,
    loginUrl: "/login",
    loginAttemptId: "tfa_login_aaaaaaaaaaaaaaaaaaaaaaaa",
    methods: [{ id: "synthetic-email", challenge: { maxLength: 8 } }],
};
function deferred() {
    let resolve;
    const promise = new Promise((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}
function fixture(fetch) {
    const client = loadTestModule(
        new URL("../../ui/login-client.js", import.meta.url),
        {},
        { fetch, console },
    );
    const { createLoginContinuation } = loadTestModule(
        new URL("../../ui/login-page/continuation.js", import.meta.url),
        { "../login-client.js": client },
        { console },
    );
    const applied = [];
    const errors = [];
    const controller = new AbortController();
    let cancelled = 0;
    const continuation = createLoginContinuation({
        signal: controller.signal,
        apply: async (data) => applied.push(data),
        onError: (error) => errors.push(error),
        onCancelled: () => cancelled++,
    });
    return {
        client,
        continuation,
        controller,
        applied,
        errors,
        cancelled: () => cancelled,
    };
}
function reply(data = pending) {
    return { ok: true, json: async () => ({ data }) };
}

test("login continuation retrieves once without delivery, storage or URL state and can cancel", async () => {
    const requests = [];
    const host = fixture(async (url, options) => {
        requests.push({ url, options });
        return reply();
    });
    await host.continuation.resume();
    assert.equal(host.applied.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(host.applied[0])), pending);
    await host.continuation.cancel();
    assert.equal(host.cancelled(), 1);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, "/api/v1/auth/login-attempt");
    assert.equal(requests[0].options.cache, "no-store");
    assert.equal(requests[1].options.method, "DELETE");
    assert.deepEqual(JSON.parse(requests[1].options.body), {
        loginAttemptId: pending.loginAttemptId,
    });
});

for (const interruption of ["abort", "new-login", "new-resume"]) {
    test(`delayed continuation retrieval is ignored after ${interruption}`, async () => {
        const response = deferred();
        let calls = 0;
        const host = fixture(() =>
            ++calls === 1
                ? response.promise
                : reply({
                      ...pending,
                      loginAttemptId: "tfa_login_bbbbbbbbbbbbbbbbbbbbbbbb",
                  }),
        );
        const old = host.continuation.resume();
        if (interruption === "abort") host.controller.abort();
        if (interruption === "new-login") host.continuation.begin();
        if (interruption === "new-resume") await host.continuation.resume();
        response.resolve(reply());
        await old;
        assert.equal(
            host.applied.length,
            interruption === "new-resume" ? 1 : 0,
        );
        if (host.applied.length)
            assert.equal(
                host.applied[0].loginAttemptId,
                "tfa_login_bbbbbbbbbbbbbbbbbbbbbbbb",
            );
        assert.equal(host.errors.length, 0);
    });
}

test("failed continuation retrieval reports an error and retry preserves the issued descriptor", async () => {
    let calls = 0;
    const host = fixture(async () => {
        if (++calls === 1) throw new Error("synthetic-network-failure");
        return reply();
    });
    await host.continuation.resume();
    assert.equal(host.errors.length, 1);
    assert.equal(host.applied.length, 0);
    await host.continuation.resume();
    assert.equal(host.applied[0].methods[0].challenge.maxLength, 8);
});

test("cancellation suppresses duplicate requests, blocks old view access, and can retry a failure", async () => {
    const response = deferred();
    let calls = 0;
    const host = fixture(async (_url, options) => {
        if (options.method !== "DELETE") return reply();
        calls++;
        return calls === 1 ? response.promise : { ok: true };
    });
    await host.continuation.resume();
    const first = host.continuation.cancel();
    await host.continuation.cancel();
    await host.continuation.resume();
    assert.equal(host.continuation.isCancelling(), true);
    assert.equal(calls, 1);
    assert.equal(
        host.continuation.isAttemptCurrent(pending.loginAttemptId),
        false,
    );
    response.resolve({ ok: false });
    await first;
    assert.equal(host.errors.length, 1);
    assert.equal(
        host.continuation.isAttemptCurrent(pending.loginAttemptId),
        true,
    );
    await host.continuation.cancel();
    assert.equal(host.cancelled(), 1);
});

for (const invalid of [
    undefined,
    { ...pending, token: "unexpected" },
    { ...pending, methods: [] },
    { ...pending, loginUrl: "https://elsewhere.invalid" },
]) {
    test(`continuation rejects malformed server data ${JSON.stringify(invalid)}`, async () => {
        const host = fixture(async () => ({
            ok: true,
            json: async () => ({ data: invalid }),
        }));
        await host.continuation.resume();
        assert.equal(host.errors.length, 1);
        assert.equal(host.applied.length, 0);
    });
}

test("expired or consumed continuation returns to ordinary login without an error", async () => {
    const host = fixture(async () => reply(null));
    await host.continuation.resume();
    assert.equal(host.applied.length, 0);
    assert.equal(host.errors.length, 0);
});

test("scoped TFA client cannot mutate a superseded attempt after its asynchronous preparation", async () => {
    const preparation = deferred();
    const elements = new Map([["#login-tfa-fields", { rendered: null }]]);
    const form = {
        querySelector: (selector) => elements.get(selector) ?? null,
    };
    let attemptId = "first";
    const loaders = createLoginClientLoaders({
        root: { querySelector: () => form },
        i18n: {},
        getAttemptId: () => attemptId,
        isAttemptCurrent: (id) => id === attemptId,
        loadClient: async (_id, create) =>
            create({
                createTfaLoginClient: async ({ root }) => ({
                    async switchToTfaPrompt(data) {
                        await preparation.promise;
                        const fields = root.querySelector("#login-tfa-fields");
                        if (fields) fields.rendered = data.loginAttemptId;
                    },
                }),
            }),
    });
    const first = await loaders.loadTfaLoginClient();
    const oldRender = first.switchToTfaPrompt({ loginAttemptId: "first" });
    attemptId = "second";
    const second = await loaders.loadTfaLoginClient();
    preparation.resolve();
    await oldRender;
    assert.equal(elements.get("#login-tfa-fields").rendered, null);
    await second.switchToTfaPrompt({ loginAttemptId: "second" });
    assert.equal(elements.get("#login-tfa-fields").rendered, "second");
});

test("failed integration loading is evicted and repeated page renders receive their own query scope", async () => {
    let calls = 0;
    let form = { querySelector: () => "old-form" };
    const loaders = createLoginClientLoaders({
        root: { querySelector: () => form },
        i18n: {},
        loadClient: async (_id, create) => {
            if (++calls === 1) throw new Error("synthetic-import-failure");
            return create({ createTfaLoginClient: ({ root }) => root });
        },
    });
    await assert.rejects(loaders.loadTfaLoginClient());
    const oldClient = await loaders.loadTfaLoginClient();
    assert.equal(oldClient.querySelector("#control"), "old-form");
    form = { querySelector: () => "new-form" };
    const currentClient = await loaders.loadTfaLoginClient();
    assert.equal(oldClient.querySelector("#control"), null);
    assert.equal(currentClient.querySelector("#control"), "new-form");
});
