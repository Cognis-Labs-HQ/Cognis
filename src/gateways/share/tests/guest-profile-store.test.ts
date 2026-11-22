import { CapabilityStore } from "@cognis/core";
import { ShareTokenStore } from "../gateway/store.js";
import { ShareApprovalRequestStore } from "../gateway/approval-request-store.js";
import test from "node:test";
import assert from "node:assert/strict";
import { MemoryExecutor } from "./reuse/executor.js";
import { GuestProfileStore } from "../gateway/guest-profile-store.js";
import { CoreShareGateway } from "../gateway/index.js";

test("guest profile default display name includes a distinguishing random number", async () => {
    const store = new GuestProfileStore(
        new MemoryExecutor("share_guest_profiles"),
    );
    await store.ensureSchema();

    const first = await store.create({ shareId: "share-1", ttlSeconds: 60 });
    const second = await store.create({ shareId: "share-1", ttlSeconds: 60 });

    assert.match(first.displayName, /^Guest #\d{6}$/);
    assert.match(second.displayName, /^Guest #\d{6}$/);
    assert.notEqual(
        first.displayName,
        second.displayName,
        "concurrent guests should be assigned distinguishing default names",
    );
});

test("guest profile honors an explicit display name over the random default", async () => {
    const store = new GuestProfileStore(
        new MemoryExecutor("share_guest_profiles"),
    );
    await store.ensureSchema();

    const record = await store.create({
        shareId: "share-1",
        displayName: "Ada",
        ttlSeconds: 60,
    });

    assert.equal(record.displayName, "Ada");
});

test("purging expired guest profiles returns identities for keyring cleanup", async () => {
    const executor = new MemoryExecutor("share_guest_profiles");
    const store = new GuestProfileStore(executor);
    executor.rows.set("guest-expired", {
        guest_id: "guest-expired",
        share_id: "share-1",
        display_name: "Guest #123456",
        avatar_key: null,
        created_at: new Date(Date.now() - 120_000).toISOString(),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
    });

    const expired = await store.purgeExpired();

    assert.deepEqual(
        expired.map(({ guestId, shareId }) => ({ guestId, shareId })),
        [{ guestId: "guest-expired", shareId: "share-1" }],
    );
    assert.equal(executor.rows.size, 0);
});

test("share guest expiry deletes the matching temporary keyring vault", async () => {
    const deletedAccounts: string[] = [];
    const executor = new MemoryExecutor("share_guest_profiles");
    executor.rows.set("guest-1", {
        guest_id: "guest-1",
        share_id: "share-1",
        display_name: "Guest #123456",
        avatar_key: null,
        created_at: new Date(Date.now() - 120_000).toISOString(),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const capabilities = new CapabilityStore();
    capabilities.contribute(
        "auth:deleteKeyringVault",
        async (accountId: string) => {
            deletedAccounts.push(accountId);
        },
    );
    const gateway = new CoreShareGateway(
        new ShareTokenStore(executor),
        new GuestProfileStore(executor),
        new ShareApprovalRequestStore(executor),
        "",
        capabilities.get.bind(capabilities),
    );

    await gateway.purgeExpiredGuestProfiles();

    assert.deepEqual(deletedAccounts, ["share:share-1:guest-1"]);
    assert.equal(executor.rows.has("guest-1"), false);
});
