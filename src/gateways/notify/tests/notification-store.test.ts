import test from "node:test";
import assert from "node:assert/strict";
import { DbNotificationStore } from "../notification-store.js";
import { InMemoryTestExecutor } from "../../db/tests/in-memory-test-executor.js";

async function makeNotificationStore(): Promise<DbNotificationStore> {
    const databaseExecutor = new InMemoryTestExecutor();
    const notificationStore = new DbNotificationStore(databaseExecutor);
    await notificationStore.ensureSchema();
    return notificationStore;
}

test("getActiveBroadcastsForRole returns only the newest visible broadcast for each display mode", async () => {
    const notificationStore = await makeNotificationStore();
    const originalNow = Date.now;
    try {
        Date.now = () => 1_700_000_000_000;
        await notificationStore.createBroadcast({
            title: "Older Bar",
            message: "Older bar message",
            displayMode: "bar",
            targetRoles: ["user"],
            startAt: null,
            endAt: null,
            requireAcknowledgement: false,
            redirectUrl: null,
            enabled: true,
            createdBy: "admin",
        });

        Date.now = () => 1_700_000_100_000;
        await notificationStore.createBroadcast({
            title: "Older Popup",
            message: "Older popup message",
            displayMode: "popup",
            targetRoles: ["user"],
            startAt: null,
            endAt: null,
            requireAcknowledgement: false,
            redirectUrl: null,
            enabled: true,
            createdBy: "admin",
        });

        Date.now = () => 1_700_000_200_000;
        await notificationStore.createBroadcast({
            title: "Newest Bar",
            message: "Newest bar message",
            displayMode: "bar",
            targetRoles: ["user"],
            startAt: null,
            endAt: null,
            requireAcknowledgement: false,
            redirectUrl: null,
            enabled: true,
            createdBy: "admin",
        });

        Date.now = () => 1_700_000_300_000;
        await notificationStore.createBroadcast({
            title: "Newest Popup",
            message: "Newest popup message",
            displayMode: "popup",
            targetRoles: ["user"],
            startAt: null,
            endAt: null,
            requireAcknowledgement: false,
            redirectUrl: null,
            enabled: true,
            createdBy: "admin",
        });
    } finally {
        Date.now = originalNow;
    }

    const activeBroadcasts = await notificationStore.getActiveBroadcastsForRole(
        "alice",
        "user",
    );

    assert.deepEqual(
        activeBroadcasts.map((broadcast) => broadcast.title),
        ["Newest Popup", "Newest Bar"],
    );
});

test("getActiveBroadcastsForRole falls back to the next newest applicable broadcast of the same mode", async () => {
    const notificationStore = await makeNotificationStore();
    const originalNow = Date.now;
    let newestBarBroadcastId = "";
    try {
        Date.now = () => 1_700_000_000_000;
        await notificationStore.createBroadcast({
            title: "Fallback Bar",
            message: "Fallback bar message",
            displayMode: "bar",
            targetRoles: ["user"],
            startAt: null,
            endAt: null,
            requireAcknowledgement: false,
            redirectUrl: null,
            enabled: true,
            createdBy: "admin",
        });

        Date.now = () => 1_700_000_100_000;
        const newestBarBroadcast = await notificationStore.createBroadcast({
            title: "Dismissed Bar",
            message: "Dismissed bar message",
            displayMode: "bar",
            targetRoles: ["user"],
            startAt: null,
            endAt: null,
            requireAcknowledgement: false,
            redirectUrl: null,
            enabled: true,
            createdBy: "admin",
        });
        newestBarBroadcastId = newestBarBroadcast.id;

        Date.now = () => 1_700_000_200_000;
        await notificationStore.createBroadcast({
            title: "Newest Popup",
            message: "Newest popup message",
            displayMode: "popup",
            targetRoles: ["user"],
            startAt: null,
            endAt: null,
            requireAcknowledgement: true,
            redirectUrl: null,
            enabled: true,
            createdBy: "admin",
        });
    } finally {
        Date.now = originalNow;
    }

    await notificationStore.markBroadcastDismissed(
        "alice",
        newestBarBroadcastId,
    );

    const activeBroadcasts = await notificationStore.getActiveBroadcastsForRole(
        "alice",
        "user",
    );

    assert.deepEqual(
        activeBroadcasts.map((broadcast) => broadcast.title),
        ["Newest Popup", "Fallback Bar"],
    );
});
