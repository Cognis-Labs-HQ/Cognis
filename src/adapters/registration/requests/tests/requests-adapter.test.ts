import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";
import { createAdapter } from "../index.js";

test("requests adapter submits and reads pending request", async () => {
    const dbExecutor = new InMemoryTestExecutor();
    const adapter = createAdapter({ dbExecutor });
    const requestApi = adapter.request;
    assert.ok(requestApi);

    const submitted = await requestApi!.submitRequest({
        provider: "line",
        externalUserId: "U123",
        requestedAccountId: "line:U123",
        requestedDisplayName: "LINE User",
        requestedEmail: "line.user@example.com",
    });
    assert.equal(submitted.provider, "line");
    assert.equal(submitted.externalUserId, "U123");
    assert.equal(submitted.status, "pending");

    const byIdentity = await requestApi!.getRequestByIdentity({
        provider: "line",
        externalUserId: "U123",
    });
    assert.equal(byIdentity?.status, "pending");
    assert.equal(byIdentity?.requestedDisplayName, "LINE User");
});

test("requests adapter review updates pending request to approved", async () => {
    const dbExecutor = new InMemoryTestExecutor();
    const adapter = createAdapter({ dbExecutor });
    const requestApi = adapter.request;
    assert.ok(requestApi);

    const submitted = await requestApi!.submitRequest({
        provider: "line",
        externalUserId: "U456",
        requestedAccountId: "line:U456",
        requestedDisplayName: "Another User",
    });
    const reviewed = await requestApi!.reviewRequest({
        requestId: submitted.id,
        status: "approved",
        reviewedByAccountId: "admin-user",
    });
    assert.equal(reviewed?.status, "approved");
    assert.equal(reviewed?.reviewedByAccountId, "admin-user");
});
