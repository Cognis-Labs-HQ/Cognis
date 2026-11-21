import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type BootstrapDisposer,
    type CapabilityContracts,
} from "@cognis/core";

import type {
    RegisterNotificationAction,
    SendEmailAction,
} from "../contracts/action-delivery.js";
import { SmtpNotificationSender } from "../notification-sender.js";
import { createMockSmtpServer, smtpSuccessHandler } from "./fixtures/server.js";

async function fixture(
    t: import("node:test").TestContext,
    authenticated = false,
) {
    const delivered: string[] = [];
    const server = await createMockSmtpServer((socket) => {
        const index = delivered.push("") - 1;
        socket.on("data", (chunk) => {
            delivered[index] += chunk.toString();
            if (authenticated && chunk.toString().startsWith("AUTH PLAIN "))
                socket.write("235 Authentication successful\r\n");
        });
        smtpSuccessHandler(socket);
    });
    t.after(() => server.close());
    const sender = new SmtpNotificationSender({
        host: server.host,
        port: server.port,
        from: "sender@example.test",
        secure: "none",
        authDisabled: !authenticated,
        ...(authenticated
            ? { user: "review-user", password: "stored-review-password" }
            : {}),
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
    capabilities.contribute("notify:isSenderEnabled", () => true);
    capabilities.contribute(
        "notify:testSender",
        (_id: string, to: string, config: Record<string, unknown>) =>
            sender.test!(to, config),
    );
    const ctx = {
        capabilities,
        registerRoute: (route: (typeof routes)[number]) => routes.push(route),
        requireAuth: () => true,
        readJson: async (): Promise<Record<string, unknown>> => ({
            to: "admin@example.test",
        }),
    };
    await runBootstrapScope(
        root,
        "adapter:notify:smtp",
        () => sender.bootstrap(ctx as never),
        (dispose) => cleanup.push(dispose),
    );
    return {
        sender,
        delivered,
        root,
        capabilities,
        cleanup,
        routes,
        ctx,
        register: capabilities.require<RegisterNotificationAction>(
            "notify:registerEmailPurpose",
        ),
        send: capabilities.require<SendEmailAction>("notify:sendEmail"),
    };
}

test("SMTP owns staged action registration and delivery for modules and adapters", async (t) => {
    const host = await fixture(t);
    const contracts =
        host.root.requireCapability<CapabilityContracts>("system:contracts");
    for (const id of [
        "notify:emailTemplates",
        "notify:sendEmail",
        "notify:registerEmailPurpose",
        "notify:emailDeliveryPolicy",
    ])
        assert.equal(contracts.describe(id)?.owner, "adapter:notify:smtp");
    host.sender.setConfig({ codeLength: 8 });
    assert.equal(
        host.capabilities.require<() => { codeLength: number }>(
            "notify:emailDeliveryPolicy",
        )().codeLength,
        8,
    );
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
        host.root.isPublicCapability("notify:registerEmailPurpose"),
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

test("queued messages use recipient preferences and module factory options", async (t) => {
    const host = await fixture(t);
    host.capabilities.contribute(
        "notify:getAccountIdByEmail",
        async (email: string) =>
            email === "dark@example.test" ? "dark-user" : null,
    );
    host.capabilities.contribute("preferences:store", {
        get: async (id: string, key: string) => {
            assert.equal(id, "dark-user");
            assert.equal(key, "ui-preferences");
            return JSON.stringify({ mode: "dark" });
        },
    });
    const purpose = await runBootstrapScope(host.root, "module:example", () =>
        host.register(
            "report",
            () => ({ subject: "Report", body: "Summary" }),
            {
                factory: "digest",
                options: { brandName: "Example", heading: "Updates" },
            },
        ),
    );
    for (const recipientEmail of [
        "dark@example.test",
        "unknown@example.test",
    ]) {
        const receipt = await host.send({
            purpose,
            recipientEmail,
            variables: {},
        });
        await host.sender.waitForEmail(purpose, receipt.notificationId);
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(host.delivered.length, 2);
    assert.match(host.delivered[0], /#0a1628/);
    assert.match(host.delivered[1], /#e8eef9/);
    assert.match(host.delivered[0], /Example/);
    assert.match(host.delivered[0], /Updates/);
});

test("SMTP diagnostic delivery works while disabled and retains concealed credentials", async (t) => {
    const host = await fixture(t, true);
    host.sender.setDeliveryEnabled(false);
    host.capabilities.contribute("notify:isSenderEnabled", () => false);
    host.ctx.readJson = async () => ({
        to: "diagnostic@example.test",
        config: { password: "" },
    });
    let status = 0;
    await host.routes[0](
        { method: "POST" } as never,
        {
            writeHead: (code: number) => {
                status = code;
            },
            end: () => {},
        } as never,
        new URL("http://localhost/api/v1/gateways/notify/adapters/smtp/test"),
    );
    assert.equal(status, 200);
    assert.ok(
        host.delivered
            .join("")
            .includes(
                "AUTH PLAIN " +
                    Buffer.from(
                        "\0review-user\0stored-review-password",
                    ).toString("base64"),
            ),
    );
    assert.equal(
        host.sender.getConfiguredSecretFields().includes("password"),
        true,
    );
    await assert.rejects(
        host.send({
            purpose: "adapter:notify:smtp:test",
            recipientEmail: "normal@example.test",
            variables: {},
        }),
        /smtp_sender_disabled/,
    );
});

test("SMTP owns normalized defaults, bounds and revocable policy availability", async (context) => {
    const host = await fixture(context);
    const policy = host.capabilities.require<() => { codeLength: number }>(
        "notify:emailDeliveryPolicy",
    );
    assert.equal(policy().codeLength, 6);
    for (const [input, expected] of [
        [4, 4],
        [10, 10],
        [12, 10],
        [0, 4],
        [8.5, 8],
        [Number.NaN, 6],
    ]) {
        const normalized = host.sender.normalizeConfig({ codeLength: input });
        assert.equal(normalized.codeLength, expected);
        host.sender.setConfig(normalized);
        assert.equal(policy().codeLength, expected);
    }
    host.capabilities.contribute("notify:isSenderEnabled", () => false);
    assert.throws(policy, /email_delivery_unavailable/);
    host.capabilities.contribute("notify:isSenderEnabled", () => true);
    host.sender.setConfig({ host: "" });
    assert.throws(policy, /email_delivery_unavailable/);
    host.sender.setConfig({ host: "synthetic.invalid" });
    for (const dispose of host.cleanup) await dispose();
    assert.throws(policy, /email_delivery_unavailable/);
});

test("versioned bounded delivery reuses the staged SMTP flow and reports final transport status", async (t) => {
    const host = await fixture(t);
    const contracts =
        host.root.requireCapability<CapabilityContracts>("system:contracts");
    assert.equal(
        contracts.describe("notify:deliverEmail")?.owner,
        "adapter:notify:smtp",
    );
    const deliver = contracts.resolve<
        import("../contracts/action-delivery.js").DeliverEmailAction
    >("notify:deliverEmail", 1);
    const purpose = await runBootstrapScope(
        host.root,
        "module:synthetic-bounded",
        () =>
            host.register("code", (variables) => ({
                subject: "Synthetic",
                body: variables.code,
            })),
        (dispose) => host.cleanup.push(dispose),
    );
    const stages: string[] = [];
    for (const stage of ["validate", "render", "enqueue"])
        host.root.flow.extend(
            "smtp:sendEmail",
            stage,
            { id: `bounded:${stage}`, order: 100 },
            () => {
                stages.push(stage);
            },
        );
    const controller = new AbortController();
    const delivery = await deliver({
        purpose,
        recipientEmail: "bounded@example.test",
        variables: { code: "123456" },
        signal: controller.signal,
        expiresAt: Date.now() + 300000,
    });
    assert.deepEqual(stages, ["validate", "render", "enqueue"]);
    assert.notEqual(delivery.receipt.status, "failed");
    assert.equal((await delivery.completion).status, "sent");
    const deferred = await deliver({
        purpose,
        recipientEmail: "bounded@example.test",
        variables: { code: "654321" },
        signal: controller.signal,
        expiresAt: Date.now() + 300000,
    });
    assert.equal(deferred.receipt.status, "waiting_rate_limit");
    controller.abort();
    assert.equal((await deferred.completion).error, "smtp_delivery_cancelled");
});
