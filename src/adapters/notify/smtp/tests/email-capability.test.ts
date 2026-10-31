import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore } from "@cognis/core";
import { bootstrapNotifyAdapter } from "../index.js";

test("SMTP sends a component-contributed email template generically", async () => {
    const capabilities = new CapabilityStore();
    capabilities.contribute(
        "notify:renderEmailTemplate",
        (templateId: string, variables: Record<string, string>) =>
            templateId === "example"
                ? {
                      subject: variables.subject,
                      body: variables.body,
                      actionUrl: "https://example.test/action",
                      actionLabel: "Continue",
                  }
                : null,
    );
    const envelopes: Array<Record<string, unknown>> = [];
    await bootstrapNotifyAdapter({
        capabilities,
        gateway: {
            isSenderEnabled: () => true,
            sendWithSender: async (
                _senderId: string,
                envelope: Record<string, unknown>,
            ) => {
                envelopes.push(envelope);
                return { sent: true, notificationId: "notification-1" };
            },
        },
        registerRoute: () => undefined,
        log: () => {},
    } as never);
    const sendEmail =
        capabilities.get<
            (input: {
                purpose: string;
                recipientEmail: string;
                templateId: string;
                variables: Record<string, string>;
            }) => Promise<unknown>
        >("notify:sendEmail");
    await sendEmail?.({
        purpose: "test:example",
        recipientEmail: "recipient@example.test",
        templateId: "example",
        variables: { subject: "Hello", body: "Body" },
    });
    assert.equal(envelopes[0]?.purpose, "test:example");
    assert.equal(envelopes[0]?.subject, "Hello");
    await assert.rejects(
        sendEmail!({
            recipientEmail: "recipient@example.test",
            templateId: "example",
            variables: {},
        } as never),
        /smtp_purpose_unregistered/,
    );
    assert.deepEqual(envelopes[0]?.metadata, {
        verifyUrl: "https://example.test/action",
        verifyButtonLabel: "Continue",
    });
});

test("SMTP adapter owns its authenticated test route", async () => {
    const capabilities = new CapabilityStore();
    let registeredRoute:
        ((req: never, res: never, url: URL) => Promise<boolean>) | undefined;
    const tested: Array<Record<string, unknown>> = [];
    await bootstrapNotifyAdapter({
        capabilities,
        testEmailPurpose: "test:admin",
        gateway: {
            sendTestEmail: async (
                senderId: string,
                purpose: string,
                recipientEmail: string,
                config: Record<string, unknown>,
            ) => tested.push({ senderId, recipientEmail, config, purpose }),
        },
        registerRoute: (route) => {
            registeredRoute = route as typeof registeredRoute;
        },
        requireAuth: () => true,
        readJson: async () => ({
            to: "admin@example.test",
            config: { host: "smtp.example.test" },
        }),
        log: () => undefined,
    } as never);
    let statusCode = 0;
    let responsePayload = "";
    const handled = await registeredRoute?.(
        {
            method: "POST",
        } as never,
        {
            writeHead(code: number) {
                statusCode = code;
            },
            end(payload: string) {
                responsePayload = payload;
            },
        } as never,
        new URL("http://localhost/api/v1/gateways/notify/adapters/smtp/test"),
    );
    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.deepEqual(JSON.parse(responsePayload), { data: { sent: true } });
    assert.deepEqual(tested, [
        {
            senderId: "smtp",
            purpose: "test:admin",
            recipientEmail: "admin@example.test",
            config: { host: "smtp.example.test" },
        },
    ]);
});
