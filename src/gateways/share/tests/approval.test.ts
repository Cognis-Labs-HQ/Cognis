import test from "node:test";
import assert from "node:assert/strict";
import {
    createCtx,
    CapabilityStore,
    registerCanonicalFlow,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import {
    registerShareApprovalFlow,
    requestShareApproval,
} from "../bootstrap/approval.js";

test("share approval accepts the requester display name used by Jitsi Meet", async () => {
    const systemCtx = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", systemCtx);
    const ctx = { flow: systemCtx.flow, capabilities };
    const approvalFlow = SHARE_FLOW_CATALOG.find(
        (flow) => flow.id === "resolve-share-approval-targets",
    );
    assert.ok(approvalFlow);
    registerCanonicalFlow(systemCtx, approvalFlow);
    ctx.flow.extend(
        "resolve-share-approval-targets",
        "resolve-targets",
        { id: "test:meeting-participants" },
        () => ({ targetAccountIds: ["bob"] }),
    );
    const approvalRequests: Record<string, unknown>[] = [];
    const gateway = {
        async createApprovalRequestBatch(input: Record<string, unknown>) {
            approvalRequests.push(input);
            return { mintRequestId: "approval-1", rows: [] };
        },
        async resolveApprovalStatus() {
            return { allResponded: true, anyDeclined: false };
        },
    };

    registerShareApprovalFlow({
        ctx,
        gateway,
    });
    const result = await requestShareApproval({
        ctx,
        request: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            requesterAccountId: "alice-account",
            requesterDisplayName: "Alice",
            action: "add a participant",
            target: "Weekly meeting",
        },
    });

    assert.deepEqual(result, { approved: true, requiresApproval: true });
    assert.equal(approvalRequests[0]?.requesterDisplayName, "Alice");
    assert.equal(approvalRequests[0]?.approvalAction, "add a participant");
    assert.equal(approvalRequests[0]?.approvalTarget, "Weekly meeting");
    assert.deepEqual(approvalRequests[0]?.targetAccountIds, ["bob"]);
});

test("share approval retains the share-link popup defaults", async () => {
    const systemCtx = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", systemCtx);
    const ctx = { flow: systemCtx.flow, capabilities };
    const approvalFlow = SHARE_FLOW_CATALOG.find(
        (flow) => flow.id === "resolve-share-approval-targets",
    );
    assert.ok(approvalFlow);
    registerCanonicalFlow(systemCtx, approvalFlow);
    ctx.flow.extend(
        "resolve-share-approval-targets",
        "resolve-targets",
        { id: "test:default-copy-target" },
        () => ({ targetAccountIds: ["bob"] }),
    );
    const approvalRequests: Record<string, unknown>[] = [];
    const gateway = {
        async createApprovalRequestBatch(input: Record<string, unknown>) {
            approvalRequests.push(input);
            return { mintRequestId: "approval-2", rows: [] };
        },
        async resolveApprovalStatus() {
            return { allResponded: true, anyDeclined: false };
        },
    };

    registerShareApprovalFlow({
        ctx,
        gateway,
    });
    await requestShareApproval({
        ctx,
        request: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            requesterAccountId: "alice-account",
        },
    });

    assert.equal(approvalRequests[0]?.approvalAction, "");
    assert.equal(approvalRequests[0]?.approvalTarget, "meeting");
});
