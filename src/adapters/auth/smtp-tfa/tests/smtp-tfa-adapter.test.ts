import test from "node:test";
import assert from "node:assert/strict";
import {
    createAdapter,
    SMTP_TFA_PREF_KEY,
    SmtpTfaAuthAdapter,
} from "../index.js";
import type { AuthAdapterContext } from "../../../../gateways/auth/gateway.js";

function createContext(
    capabilityMap: Map<string, unknown>,
): AuthAdapterContext {
    return {
        capabilities: {
            get(capabilityId) {
                return capabilityMap.get(capabilityId);
            },
        },
    };
}

test("smtp-tfa adapter exposes internal id and user-facing name", () => {
    const adapter = new SmtpTfaAuthAdapter();
    assert.equal(adapter.id, "smtp-tfa");
    assert.equal(adapter.name, "Email TFA");
});

test("smtp-tfa adapter registers itself as a tfa method via ctx capability", () => {
    const registeredMethods: Array<{
        id: string;
        name: string;
        settingsPath: string;
    }> = [];
    const capabilities = new Map<string, unknown>([
        [
            "auth:registerTfaMethod",
            (registration: {
                id: string;
                name: string;
                settingsPath: string;
            }) => registeredMethods.push(registration),
        ],
    ]);
    new SmtpTfaAuthAdapter(createContext(capabilities));
    assert.equal(registeredMethods.length, 1);
    assert.equal(registeredMethods[0].id, "smtp-tfa");
    assert.equal(registeredMethods[0].name, "Email TFA");
    assert.equal(
        registeredMethods[0].settingsPath,
        "/api/v1/auth/smtp-tfa/settings",
    );
});

test("smtp-tfa adapter writes account preference and requires verified SMTP setup", async () => {
    const preferenceWrites: Array<{
        accountId: string;
        key: string;
        value: string;
    }> = [];
    const capabilities = new Map<string, unknown>([
        [
            "preferences:store",
            {
                async get() {
                    return JSON.stringify({ enabled: false });
                },
                async set(accountId: string, key: string, value: string) {
                    preferenceWrites.push({ accountId, key, value });
                },
            },
        ],
        ["notify:canSendVerificationEmail", () => true],
        ["notify:hasVerifiedEmail", async () => true],
        ["notify:dispatch", async () => ({ dispatched: ["smtp"] })],
    ]);
    const adapter = new SmtpTfaAuthAdapter(createContext(capabilities));

    adapter.configure({ enforceForAll: true });
    assert.equal(await adapter.shouldRequireEmailTfa("alice"), true);

    await adapter.setEmailTfaEnabled("alice", true);
    assert.equal(preferenceWrites.length, 1);
    assert.equal(preferenceWrites[0].key, SMTP_TFA_PREF_KEY);
});

test("smtp-tfa adapter issues and validates login challenge codes", async () => {
    let dispatchedCode = "";
    const capabilities = new Map<string, unknown>([
        [
            "preferences:store",
            {
                async get() {
                    return JSON.stringify({ enabled: true });
                },
                async set() {
                    return;
                },
            },
        ],
        ["notify:canSendVerificationEmail", () => true],
        ["notify:hasVerifiedEmail", async () => true],
        [
            "notify:dispatch",
            async ({ body }: { body: string }) => {
                const match = body.match(/(\d{6})/);
                dispatchedCode = match?.[1] ?? "";
                return { dispatched: ["smtp"] };
            },
        ],
    ]);
    const adapter = createAdapter(
        createContext(capabilities),
    ) as SmtpTfaAuthAdapter;

    const challenge = await adapter.beginEmailTfaLoginChallenge({
        accountId: "alice",
        provider: "local",
        providerId: "local",
        role: "user",
        isFounder: false,
        displayName: "alice",
        userValidationMode: "none",
        requiredUserValidation: false,
    });
    assert.equal(typeof challenge.challengeId, "string");
    assert.equal(dispatchedCode.length, 6);

    const rejectedSession = await adapter.completeEmailTfaLoginChallenge(
        challenge.challengeId,
        "000000",
    );
    assert.equal(rejectedSession, null);

    const verifiedSession = await adapter.completeEmailTfaLoginChallenge(
        challenge.challengeId,
        dispatchedCode,
    );
    assert.equal(verifiedSession?.accountId, "alice");
});
