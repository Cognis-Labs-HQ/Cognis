import test from "node:test";
import assert from "node:assert/strict";
import { createRegistrationCompletion } from "../ui/register/completion.js";

function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

function fixture(overrides = {}) {
    const events = [];
    const controller = new AbortController();
    const client = {
        execute: async (operation, input) => {
            events.push([operation, input]);
            return { accepted: true };
        },
        complete: async () => {
            events.push("revoke");
        },
    };
    const completion = createRegistrationCompletion({
        createAccount: async () => {
            events.push("create");
            return {
                verifyToken: "synthetic",
                onboardingOperations: [
                    "notify:email:add",
                    "notify:email:verify",
                ],
            };
        },
        createClient: () => client,
        verifyEmail: async () => {
            events.push("email");
            return true;
        },
        integrations: [],
        signal: controller.signal,
        reportCleanupError: (error) =>
            events.push(["cleanup-error", error.message]),
        ...overrides,
    });
    return { completion, events, controller, client };
}

const input = {
    account: { email: "synthetic@example.test" },
    values: { consent: "on" },
    invite: false,
};

for (const invite of [false, true]) {
    test(`${invite ? "invite" : "public"} completion revokes before success and preserves consent input`, async () => {
        let received;
        const integration = {
            descriptor: {
                onboardingOperations: ["terms-of-service:consent:record"],
            },
            i18n: {},
            module: {
                async completeRegistration(context) {
                    received = context;
                    await context.executeOnboarding(
                        "terms-of-service:consent:record",
                        { accepted: context.values.consent === "on" },
                    );
                },
            },
        };
        const host = fixture({ integrations: [integration] });
        assert.deepEqual(await host.completion.run({ ...input, invite }), {
            outcome: "completed",
        });
        assert.equal(received.values, input.values);
        assert.deepEqual(received.descriptor, integration.descriptor);
        assert.deepEqual(host.events, [
            "create",
            ...(!invite ? ["email"] : []),
            ["terms-of-service:consent:record", { accepted: true }],
            "revoke",
        ]);
    });
}

test("duplicate submissions do not create another account", async () => {
    const pending = deferred();
    const host = fixture({ createAccount: () => pending.promise });
    const first = host.completion.run(input);
    assert.deepEqual(await host.completion.run(input), { outcome: "busy" });
    pending.resolve({ verifyToken: "synthetic", onboardingOperations: [] });
    await first;
    assert.deepEqual(await host.completion.run(input), { outcome: "busy" });
});

test("disposal during account creation revokes the late credential and skips completion work", async () => {
    const pending = deferred();
    const host = fixture({ createAccount: () => pending.promise });
    const first = host.completion.run(input);
    host.controller.abort();
    pending.resolve({ verifyToken: "synthetic" });
    await assert.rejects(
        first,
        (error) =>
            error.code === "registration_cancelled" && error.accountCreated,
    );
    assert.deepEqual(host.events, ["revoke"]);
    assert.equal(host.completion.isCurrent(), false);
});

test("email cancellation revokes without invoking integrations", async () => {
    const host = fixture({
        verifyEmail: async () => false,
        integrations: [
            {
                descriptor: { onboardingOperations: [] },
                module: {
                    completeRegistration() {
                        assert.fail();
                    },
                },
            },
        ],
    });
    await assert.rejects(host.completion.run(input), {
        code: "registration_cancelled",
    });
    assert.deepEqual(host.events, ["create", "revoke"]);
});

test("integration failure revokes and preserves recovery state", async () => {
    const host = fixture({
        integrations: [
            {
                descriptor: { onboardingOperations: [] },
                module: {
                    completeRegistration() {
                        throw new Error("rejected");
                    },
                },
            },
        ],
    });
    await assert.rejects(
        host.completion.run(input),
        (error) => error.message === "rejected" && error.accountCreated,
    );
    assert.deepEqual(host.events, ["create", "email", "revoke"]);
});

test("only declared integration operations reach the client", async () => {
    const host = fixture({
        integrations: [
            {
                descriptor: { onboardingOperations: ["provider:allowed"] },
                module: {
                    completeRegistration({ executeOnboarding }) {
                        return executeOnboarding("provider:other", {});
                    },
                },
            },
        ],
    });
    await assert.rejects(
        host.completion.run(input),
        /registration_operation_not_declared/,
    );
    assert.deepEqual(host.events, ["create", "email", "revoke"]);
});

test("revocation failure cannot report successful registration", async () => {
    const host = fixture({
        createClient: () => ({
            execute() {},
            complete: async () => {
                throw new Error("revoke_failed");
            },
        }),
    });
    await assert.rejects(
        host.completion.run(input),
        (error) => error.message === "revoke_failed" && error.accountCreated,
    );
    assert.deepEqual(host.events, [
        "create",
        "email",
        ["cleanup-error", "revoke_failed"],
    ]);
});

test("account-created issuance failure prevents duplicate creation and reports login recovery", async () => {
    const host = fixture({
        createAccount: async () => {
            const error = new Error("onboarding_unavailable");
            error.accountCreated = true;
            throw error;
        },
    });
    await assert.rejects(
        host.completion.run(input),
        (error) => error.accountCreated,
    );
    assert.deepEqual(await host.completion.run(input), { outcome: "busy" });
});

test("captured integration callback is closed after completion", async () => {
    let captured;
    const host = fixture({
        integrations: [
            {
                descriptor: { onboardingOperations: ["provider:allowed"] },
                module: {
                    completeRegistration({ executeOnboarding }) {
                        captured = executeOnboarding;
                    },
                },
            },
        ],
    });
    await host.completion.run(input);
    await assert.rejects(captured("provider:allowed", {}), /onboarding_closed/);
    assert.deepEqual(host.events, ["create", "email", "revoke"]);
});

test("disposal during integration work revokes and prevents later integration effects", async () => {
    const waiting = deferred();
    const host = fixture({
        integrations: [
            {
                descriptor: { onboardingOperations: ["provider:allowed"] },
                module: {
                    async completeRegistration({ executeOnboarding }) {
                        await waiting.promise;
                        return executeOnboarding("provider:allowed", {});
                    },
                },
            },
        ],
    });
    const pending = host.completion.run(input);
    await new Promise((resolve) => setImmediate(resolve));
    host.completion.dispose();
    waiting.resolve();
    await assert.rejects(pending, { code: "registration_cancelled" });
    assert.ok(host.events.includes("revoke"));
    assert.ok(host.events.every((event) => !Array.isArray(event)));
});

test("mutating provider descriptor cannot widen its captured operation executor", async () => {
    const descriptor = { onboardingOperations: ["provider:allowed"] };
    const host = fixture({
        integrations: [
            {
                descriptor,
                module: {
                    async completeRegistration({ executeOnboarding }) {
                        descriptor.onboardingOperations.push("provider:other");
                        await assert.rejects(
                            executeOnboarding("provider:other", {}),
                            /registration_operation_not_declared/,
                        );
                        await executeOnboarding("provider:allowed", {});
                    },
                },
            },
        ],
    });
    await host.completion.run(input);
    assert.deepEqual(host.events, [
        "create",
        "email",
        ["provider:allowed", {}],
        "revoke",
    ]);
});

for (const callback of [undefined, null, false, "callback"]) {
    test(`coordinator rejects declared noncallable completion before account creation (${String(callback)})`, async () => {
        const host = fixture({
            integrations: [
                {
                    descriptor: { onboardingOperations: ["consent:record"] },
                    module: { completeRegistration: callback },
                },
            ],
        });
        await assert.rejects(
            host.completion.run(input),
            /registration_completion_unavailable/,
        );
        assert.deepEqual(host.events, []);
    });
}

test("a field factory cannot widen the declaration captured by the actual loader", async () => {
    const { loadRegistrationIntegrations } =
        await import("../ui/register/integrations.js");
    const descriptor = {
        id: "consent",
        scriptUrl: "consent.js",
        onboardingOperations: ["consent:record"],
    };
    const loaded = await loadRegistrationIntegrations({
        descriptors: [descriptor],
        loadModule: async () => ({
            createRegistrationField({ descriptor: received }) {
                assert.throws(
                    () => received.onboardingOperations.push("foreign:record"),
                    TypeError,
                );
                descriptor.onboardingOperations.push("foreign:record");
            },
            completeRegistration({ executeOnboarding }) {
                return executeOnboarding("foreign:record", {});
            },
        }),
        loadI18n: async () => ({}),
        onError: () => assert.fail(),
    });
    const integration = loaded.integrations[0];
    integration.module.createRegistrationField({
        descriptor: integration.descriptor,
    });
    const host = fixture({ integrations: loaded.integrations });
    await assert.rejects(
        host.completion.run(input),
        /registration_operation_not_declared/,
    );
    assert.deepEqual(host.events, ["create", "email", "revoke"]);
});

test("one completion cannot widen another integration's captured scope", async () => {
    const secondDescriptor = { onboardingOperations: ["second:record"] };
    const host = fixture({
        integrations: [
            {
                descriptor: { onboardingOperations: [] },
                module: {
                    completeRegistration() {
                        secondDescriptor.onboardingOperations.push(
                            "foreign:record",
                        );
                    },
                },
            },
            {
                descriptor: secondDescriptor,
                module: {
                    completeRegistration({ executeOnboarding }) {
                        return executeOnboarding("foreign:record", {});
                    },
                },
            },
        ],
    });
    await assert.rejects(
        host.completion.run(input),
        /registration_operation_not_declared/,
    );
    assert.deepEqual(host.events, ["create", "email", "revoke"]);
});
