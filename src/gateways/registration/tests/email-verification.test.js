import test from "node:test";
import assert from "node:assert/strict";
import { verifyRegistrationEmail } from "../ui/register/email-verification.js";

function fixture(overrides = {}) {
    const events = [];
    const input = {
        executeOnboarding: async () => {},
        email: "synthetic@example.test",
        operations: ["notify:email:add", "notify:email:verify"],
        required: true,
        prompt: async () => "123456",
        onInvalid: () => events.push("invalid"),
        loadClient: async () => ({
            addOnboardingEmail: async () => {
                events.push("add");
                return {};
            },
            verifyOnboardingEmail: async () => {
                events.push("verify");
            },
        }),
        ...overrides,
    };
    return { input, events };
}

test("registration verification retries invalid codes, then completes", async () => {
    let attempts = 0;
    const host = fixture({
        loadClient: async () => ({
            addOnboardingEmail: async () => ({}),
            verifyOnboardingEmail: async () => {
                attempts++;
                if (attempts === 1) throw { status: 422 };
            },
        }),
    });
    assert.equal(await verifyRegistrationEmail(host.input), true);
    assert.equal(attempts, 2);
    assert.deepEqual(host.events, ["invalid"]);
});

test("optional absent Notify does not import its client", async () => {
    const host = fixture({
        required: false,
        operations: [],
        loadClient: async () => assert.fail("absent provider imported"),
    });
    assert.equal(await verifyRegistrationEmail(host.input), true);
});

test("required absent Notify fails closed", async () => {
    const host = fixture({
        operations: [],
        loadClient: async () => assert.fail(),
    });
    await assert.rejects(
        verifyRegistrationEmail(host.input),
        /email_verification_unavailable/,
    );
});

test("registered unavailable delivery and delivery failure do not prompt for codes", async () => {
    for (const failure of [false, true]) {
        const host = fixture({
            prompt: async () => assert.fail(),
            loadClient: async () => ({
                addOnboardingEmail: async () => {
                    if (failure) return { verificationEmailFailed: true };
                    throw new Error("email_delivery_unavailable");
                },
            }),
        });
        await assert.rejects(
            verifyRegistrationEmail(host.input),
            /email_delivery/,
        );
    }
});

test("dismissed verification returns cancellation", async () => {
    const host = fixture({ prompt: async () => null });
    assert.equal(await verifyRegistrationEmail(host.input), false);
    assert.deepEqual(host.events, ["add"]);
});
