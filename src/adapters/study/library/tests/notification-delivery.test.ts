import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore } from "@cognis/core";
import { createNotificationDelivery } from "../notification-delivery.js";
import { createRequestNotifier } from "../request-notifications.js";
import { createLibraryFlow } from "./reuse/flows.js";
import type { LibraryPushRequest } from "../types.js";

test("Study request delivery resolves late notification capabilities and forwards each decision to the internal feed", async () => {
    const capabilities = new CapabilityStore();
    const logs: Array<{ level: string; metadata: unknown }> = [];
    const delivery = createNotificationDelivery({
        capabilities,
        log: (level, _message, metadata) => {
            logs.push({ level, metadata });
        },
    });
    const notify = createRequestNotifier({
        ...delivery,
        flow: createLibraryFlow(),
    });
    const feed: unknown[] = [];
    const categories: string[] = [];
    capabilities.contribute("auth:accountStore", {
        list: async () => [
            {
                accountId: "admin",
                username: "public-admin",
                role: "admin",
                enabled: true,
            },
        ],
    });
    capabilities.contribute("notify:registerCategory", (id: string) =>
        categories.push(id),
    );
    capabilities.contribute("notify:dispatch", async (envelope) => {
        feed.push(envelope);
        return { dispatched: ["internal"] };
    });
    for (const status of [
        "pending",
        "approved",
        "rejected",
        "withdrawn",
    ] as const)
        await notify({ id: "request", status } as LibraryPushRequest, {
            accountId: "actor",
            role: "admin",
        });
    assert.equal(feed.length, 4);
    assert.deepEqual(categories, Array(4).fill("study"));
    assert.equal(logs.filter(({ level }) => level === "info").length, 4);
    capabilities.contribute("notify:dispatch", async () => ({
        dispatched: [],
        errors: [{ senderId: "internal", error: "storage failed" }],
    }));
    await assert.rejects(
        delivery.dispatch({
            category: "study",
            recipientUsername: "admin",
            subject: "subject",
            body: "body",
        }),
        /notification_not_delivered/,
    );
    assert.ok(logs.some(({ level }) => level === "error"));
    capabilities.contribute("notify:dispatch", async (envelope) => {
        feed.push(envelope);
        return { dispatched: ["internal"] };
    });
    await delivery.dispatch({
        category: "study",
        recipientUsername: "admin",
        subject: "subject",
        body: "body",
    });
    assert.equal(feed.length, 5);
});

test("an administrator receives their incoming request but not their own review decision", async () => {
    const capabilities = new CapabilityStore();
    const feed: Array<{ metadata: { status: string } }> = [];
    capabilities.contribute("auth:accountStore", {
        list: async () => [
            {
                accountId: "admin",
                username: "public-admin",
                role: "admin",
                enabled: true,
            },
        ],
    });
    capabilities.contribute("notify:dispatch", async (envelope) => {
        feed.push(envelope);
        return { dispatched: ["internal"] };
    });
    const notify = createRequestNotifier({
        ...createNotificationDelivery({ capabilities }),
        flow: createLibraryFlow(),
    });
    for (const status of [
        "pending",
        "approved",
        "rejected",
        "withdrawn",
    ] as const)
        await notify({ id: "request", status } as LibraryPushRequest, {
            accountId: "admin",
            role: "admin",
        });
    assert.deepEqual(
        feed.map(({ metadata }) => metadata.status),
        ["pending"],
    );
});
