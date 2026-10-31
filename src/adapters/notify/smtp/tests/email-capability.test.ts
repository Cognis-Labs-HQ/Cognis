import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type BootstrapDisposer,
} from "@cognis/core";
import type { RegisterNotificationAction, SendEmailAction } from "@cognis/core";
import { SmtpNotificationSender } from "../notification-sender.js";
import { createMockSmtpServer, smtpSuccessHandler } from "./fixtures/server.js";

async function fixture(t: import("node:test").TestContext) {
    const server = await createMockSmtpServer(smtpSuccessHandler);
    t.after(() => server.close());
    const sender = new SmtpNotificationSender({
        host: server.host,
        port: server.port,
        from: "sender@example.test",
        secure: "none",
        authDisabled: true,
    });
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const cleanup: BootstrapDisposer[] = [];
    t.after(async () => {
        for (const dispose of cleanup.reverse()) await dispose();
    });
    const routes: Array<
        (req: never, res: never, url: URL) => Promise<boolean>
    > = [];
    const ctx = {
        capabilities,
        gateway: {
            isSenderEnabled: () => true,
            testSender: (
                _id: string,
                to: string,
                config: Record<string, unknown>,
            ) => sender.test!(to, config),
        },
        registerRoute: (route: (typeof routes)[number]) => routes.push(route),
        requireAuth: () => true,
        readJson: async () => ({ to: "admin@example.test" }),
    };
    await runBootstrapScope(
        root,
        "adapter:notify:smtp",
        () => sender.bootstrap(ctx as never),
        (dispose) => cleanup.push(dispose),
    );
    return {
        sender,
        root,
        capabilities,
        cleanup,
        routes,
        ctx,
        register: capabilities.require<RegisterNotificationAction>(
            "notify:registerSmtpPurpose",
        ),
        send: capabilities.require<SendEmailAction>("notify:sendEmail"),
    };
}

test("SMTP owns staged action registration and delivery for modules and adapters", async (t) => {
    const host = await fixture(t);
    const stages: string[] = [];
    for (const stage of ["validate", "render", "enqueue"])
        host.root.flow.extend(
            "smtp:sendEmail",
            stage,
            { id: `test:${stage}`, order: 100 },
            () => {
                stages.push(stage);
            },
        );
    let called = 0;
    const purpose = await runBootstrapScope(
        host.root,
        "module:example",
        () =>
            host.register("digest", (variables) => {
                called++;
                return {
                    subject: variables.subject,
                    body: variables.body,
                    actionUrl: "https://example.test/action",
                    actionLabel: "Continue",
                };
            }),
        (dispose) => host.cleanup.push(dispose),
    );
    assert.equal(purpose, "module:example:digest");
    const receipt = await host.send({
        purpose,
        recipientEmail: "person@example.test",
        variables: { subject: "Hello", body: "Body" },
    });
    assert.equal(called, 1);
    assert.deepEqual(stages, ["validate", "render", "enqueue"]);
    assert.equal(receipt.subject, "Hello");
    assert.equal(receipt.purpose, purpose);
    await host.sender.send({
        purpose,
        category: "test",
        recipientUsername: "person",
        recipientEmail: "second@example.test",
        subject: "Direct",
        body: "Body",
    });
    assert.equal(host.root.getCapability("notify:sendEmail"), host.send);
    assert.equal(
        host.root.isPublicCapability("notify:registerSmtpPurpose"),
        true,
    );
    await assert.rejects(
        host.register("late", () => ({ subject: "", body: "" })),
        /bootstrap_registration_closed/,
    );
    await assert.rejects(
        runBootstrapScope({}, "module:other", () =>
            host.register("wrongRoot", () => ({ subject: "", body: "" })),
        ),
        /bootstrap_registration_closed/,
    );
    await assert.rejects(
        runBootstrapScope(host.root, "module:other", () =>
            host.register("invalid", undefined as never),
        ),
        /smtp_purpose_invalid/,
    );
    await assert.rejects(
        host.send({
            purpose: "unknown",
            recipientEmail: "person@example.test",
            variables: {},
        }),
        /smtp_purpose_unregistered/,
    );
});

test("SMTP rejects action callbacks that finish after their owner is disabled and restores registration on activation", async (t) => {
    const host = await fixture(t);
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
        release = resolve;
    });
    const disposers: BootstrapDisposer[] = [];
    const purpose = await runBootstrapScope(
        host.root,
        "adapter:test:mail",
        () =>
            host.register("delayed", async () => {
                await ready;
                return { subject: "Late", body: "Body" };
            }),
        (dispose) => disposers.push(dispose),
    );
    const pending = host.send({
        purpose,
        recipientEmail: "person@example.test",
        variables: {},
    });
    await disposers[0]();
    await disposers[0].reactivate!();
    release();
    await assert.rejects(pending, /smtp_purpose_unregistered/);
    assert.equal(host.sender.listQueue().length, 0);
    host.cleanup.push(disposers[0]);
    const receipt = await host.send({
        purpose,
        recipientEmail: "person@example.test",
        variables: {},
    });
    assert.ok(receipt.notificationId);
});

test("SMTP adapter owns its authenticated test route", async (t) => {
    const host = await fixture(t);
    let status = 0;
    const response = {
        writeHead: (code: number) => {
            status = code;
        },
        end: () => {},
    };
    assert.equal(
        await host.routes[0](
            { method: "POST" } as never,
            response as never,
            new URL(
                "http://localhost/api/v1/gateways/notify/adapters/smtp/test",
            ),
        ),
        true,
    );
    assert.equal(status, 200);
    assert.equal(
        host.sender.listQueue()[0]?.purpose,
        "adapter:notify:smtp:test",
    );
    assert.equal(host.sender.listQueue()[0]?.status, "sent");
});
