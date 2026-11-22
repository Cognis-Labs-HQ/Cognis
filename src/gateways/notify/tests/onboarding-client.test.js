import test from "node:test";
import assert from "node:assert/strict";
import {
    addOnboardingEmail,
    verifyOnboardingEmail,
} from "../ui/onboarding-client.js";

test("email onboarding client uses declared operations and preserves owner errors", async () => {
    const calls = [];
    const execute = async (operation, input) => {
        calls.push({ operation, input });
        if (operation === "notify:email:verify")
            throw Object.assign(new Error("invalid_code"), {
                status: 422,
                code: "invalid_code",
            });
        return { added: true, pendingVerification: true };
    };
    assert.deepEqual(await addOnboardingEmail(execute, "a@example.com"), {
        added: true,
        pendingVerification: true,
    });
    await assert.rejects(
        verifyOnboardingEmail(execute, "a@example.com", "123456"),
        { status: 422, code: "invalid_code" },
    );
    assert.deepEqual(calls, [
        { operation: "notify:email:add", input: { email: "a@example.com" } },
        {
            operation: "notify:email:verify",
            input: { email: "a@example.com", code: "123456" },
        },
    ]);
});
