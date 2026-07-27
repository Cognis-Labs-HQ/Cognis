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
            dispatch: async (envelope: Record<string, unknown>) => {
                envelopes.push(envelope);
                return { dispatched: ["smtp"] };
            },
        },
        log: () => {},
    } as never);
    const sendEmail =
        capabilities.get<
            (input: {
                recipientEmail: string;
                templateId: string;
                variables: Record<string, string>;
            }) => Promise<unknown>
        >("notify:sendEmail");
    await sendEmail?.({
        recipientEmail: "recipient@example.test",
        templateId: "example",
        variables: { subject: "Hello", body: "Body" },
    });
    assert.equal(envelopes[0]?.subject, "Hello");
    assert.deepEqual(envelopes[0]?.metadata, {
        verifyUrl: "https://example.test/action",
        verifyButtonLabel: "Continue",
    });
});
