import assert from "node:assert/strict";
import test from "node:test";
import {
    CoreShareGateway,
    type IssuedShareToken,
    type ShareTokenView,
} from "../gateway/index.js";
import { ShareTokenStore } from "../gateway/store.js";
import { GuestProfileStore } from "../gateway/guest-profile-store.js";
import { ShareApprovalRequestStore } from "../gateway/approval-request-store.js";
import { MemoryExecutor } from "./reuse/executor.js";

test("typed share results retain persisted controls through issue, list and update", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor);
    const gateway = new CoreShareGateway(
        store,
        new GuestProfileStore(executor),
        new ShareApprovalRequestStore(executor),
        "",
    );
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const issued: IssuedShareToken = await gateway.issueToken({
        ownerAccountId: "alice",
        resourceType: "document",
        resourceId: "document-1",
        metadata: { contentUrl: "/documents/document-1" },
        grantedCapabilities: ["document:read"],
        accessControls: {
            recipients: [{ type: "user", id: "bob", permissions: ["read"] }],
        },
        expiresAt,
    });
    assert.equal(issued.expiresAt, expiresAt);
    assert.deepEqual(issued.grantedCapabilities, ["document:read"]);
    assert.equal(issued.accessControls.recipients[0].id, "bob");
    assert.equal(issued.metadata?.contentUrl, "/documents/document-1");
    assert.equal(issued.generatedPassword, null);

    const listed: ShareTokenView[] = await gateway.listTokens({
        ownerAccountId: "alice",
    });
    assert.deepEqual(
        listed.map((record) => record.id),
        [issued.id],
    );
    assert.equal(listed[0].expiresAt, expiresAt);
    assert.equal(
        await gateway.updateToken({
            shareId: issued.id,
            ownerAccountId: "bob",
            grantedCapabilities: [],
        }),
        null,
    );
    const updated: IssuedShareToken | null = await gateway.updateToken({
        shareId: issued.id,
        ownerAccountId: "alice",
        grantedCapabilities: [],
    });
    assert.ok(updated);
    assert.deepEqual(updated.grantedCapabilities, []);
    assert.equal(updated.expiresAt, expiresAt);
    assert.equal(updated.accessControls.recipients[0].id, "bob");
    const persisted = await store.getById(issued.id);
    assert.deepEqual(persisted?.grantedCapabilities, []);
});
