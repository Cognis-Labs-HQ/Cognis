import assert from "node:assert/strict";
import test from "node:test";
import { logRejectedDeliveries } from "../reuse/settled-deliveries.js";

test("rejected share deliveries are logged with recipient context", () => {
    const logs: Array<Record<string, unknown>> = [];

    logRejectedDeliveries({
        results: [
            { status: "fulfilled", value: undefined },
            { status: "rejected", reason: new Error("delivery unavailable") },
        ],
        recipients: ["alice", "bob"],
        log: (level, message, metadata) => {
            logs.push({ level, message, ...metadata });
        },
        message: "Failed to dispatch direct share notification.",
        operation: "dispatch_direct_share_notification",
        shareId: "share-1",
    });

    assert.deepEqual(logs, [
        {
            level: "error",
            message: "Failed to dispatch direct share notification.",
            component: "share-gateway",
            operation: "dispatch_direct_share_notification",
            shareId: "share-1",
            recipientUsername: "bob",
            error: "delivery unavailable",
        },
    ]);
});
