import assert from "node:assert/strict";
import test from "node:test";
import { loadRegistrationConfig } from "../ui/login-client.js";

function configResponse(context, integrations) {
    context.mock.method(globalThis, "fetch", async () => ({
        ok: true,
        json: async () => ({
            data: { registrationsEnabled: true, integrations },
        }),
    }));
}

test("registration configuration preserves genuine absent and malformed field-only plugin independence", async (context) => {
    configResponse(context, [{ id: "optional", scriptUrl: "" }, null]);
    assert.deepEqual((await loadRegistrationConfig()).integrations, []);
});

test("registration configuration retains declared operations for loader validation", async (context) => {
    const descriptor = {
        id: "consent",
        scriptUrl: "synthetic:consent",
        onboardingOperations: null,
    };
    configResponse(context, [descriptor]);
    assert.deepEqual((await loadRegistrationConfig()).integrations, [
        descriptor,
    ]);
});

test("malformed integration collection cannot become an empty configuration", async (context) => {
    configResponse(context, {
        consent: { onboardingOperations: ["consent:record"] },
    });
    await assert.rejects(
        loadRegistrationConfig(),
        /registration_configuration_unavailable/,
    );
});
