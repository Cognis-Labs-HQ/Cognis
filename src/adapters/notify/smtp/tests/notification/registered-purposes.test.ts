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
