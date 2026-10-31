import test from "node:test";
import assert from "node:assert/strict";
import type net from "node:net";
import { runBootstrapScope } from "@cognis/core";
import { SmtpNotificationSender } from "../../notification-sender.js";
import {
    createMockSmtpServer,
    smtpSuccessHandler,
} from "../fixtures/server.js";

function gate() {
    let resolve!: () => void;
    const promise = new Promise<void>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}
const envelope = {
    category: "system",
    recipientUsername: "person",
    recipientEmail: "person@example.test",
    subject: "Subject",
    body: "Body",
};

test("registered SMTP purpose queues deliver independently and reject late registration or unknown purposes", async () => {
    const entered = gate();
    let held!: net.Socket;
    let connections = 0;
    const server = await createMockSmtpServer((socket) => {
        if (++connections === 1) {
            held = socket;
            entered.resolve();
        } else smtpSuccessHandler(socket);
    });
    const sender = new SmtpNotificationSender({
        host: server.host,
        port: server.port,
        from: "sender@example.test",
        secure: "none",
        authDisabled: true,
    });
    try {
        await runBootstrapScope(sender, "module:custom", async () => {
            sender.registerPurpose("slow");
            sender.registerPurpose("fast");
        });
        assert.throws(
            () => sender.registerPurpose("late"),
            /bootstrap_registration_closed/,
        );
        await assert.rejects(
            sender.send({ ...envelope, purpose: "unknown" }),
            /smtp_purpose_unregistered/,
        );
        await assert.rejects(
            sender.send(envelope),
            /smtp_purpose_unregistered/,
        );
        assert.equal(connections, 0);
        const slow = sender.send({ ...envelope, purpose: "slow" });
        await entered.promise;
        await sender.send({ ...envelope, purpose: "fast" });
        assert.equal(
            sender.listQueue().find((item) => item.purpose === "fast")?.status,
            "sent",
        );
        assert.equal(
            sender.listQueue().find((item) => item.purpose === "slow")?.status,
            "sending",
        );
        smtpSuccessHandler(held);
        await slow;
        assert.equal(connections, 2);
    } finally {
        held?.destroy();
        await server.close();
    }
});

test("purpose disposal rejects pending delivery, closes its SMTP session and permits clean owner reactivation", async () => {
    const entered = gate();
    const closed = gate();
    const server = await createMockSmtpServer((socket) => {
        socket.on("close", closed.resolve);
        entered.resolve();
    });
    const sender = new SmtpNotificationSender({
        host: server.host,
        port: server.port,
        from: "sender@example.test",
        secure: "none",
    });
    let dispose!: () => void;
    try {
        await runBootstrapScope(sender, "module:custom", async () => {
            dispose = sender.registerPurpose("custom");
        });
        const sending = sender.send({ ...envelope, purpose: "custom" });
        const outcome = assert.rejects(sending, /smtp_purpose_disposed/);
        await entered.promise;
        dispose();
        await outcome;
        await closed.promise;
        assert.equal(sender.listQueue().length, 0);
        await runBootstrapScope(sender, "module:custom", async () => {
            dispose = sender.registerPurpose("custom");
        });
        dispose();
    } finally {
        await server.close();
    }
});

test("SMTP sender disable cancels delivery and re-enable restores only registered queues", async () => {
    const entered = gate();
    let held!: net.Socket;
    let connections = 0;
    const server = await createMockSmtpServer((socket) => {
        if (++connections === 1) {
            held = socket;
            entered.resolve();
        } else smtpSuccessHandler(socket);
    });
    const sender = new SmtpNotificationSender({
        host: server.host,
        port: server.port,
        from: "sender@example.test",
        secure: "none",
        authDisabled: true,
    });
    let channel!: ReturnType<SmtpNotificationSender["registerChannel"]>;
    const cleanup: Array<() => void | Promise<void>> = [];
    try {
        await runBootstrapScope(sender, "gateway:custom", async () => {
            channel = sender.registerChannel({ id: "custom", label: "Custom" });
            cleanup.push(channel);
        });
        const pending = channel.send({ ...envelope, category: "custom" });
        const rejected = assert.rejects(pending, /smtp_purpose_disposed/);
        await entered.promise;
        sender.setDeliveryEnabled(false);
        await rejected;
        held.destroy();
        sender.setDeliveryEnabled(true);
        await channel.send({
            ...envelope,
            category: "custom",
            recipientEmail: "resumed@example.test",
        });
        assert.equal(connections, 2);
        assert.equal(sender.listQueue()[0]?.purpose, "channel:custom");
        assert.equal(sender.listQueue()[0]?.status, "sent");
        await cleanup[0]();
        sender.setDeliveryEnabled(false);
        sender.setDeliveryEnabled(true);
        await assert.rejects(
            channel.send({ ...envelope, category: "custom" }),
            /smtp_purpose_unregistered/,
        );
    } finally {
        held?.destroy();
        for (const dispose of cleanup) await dispose();
        await server.close();
    }
});
