import test from "node:test";
import assert from "node:assert/strict";
import {
    createCtx,
    registerCanonicalFlow,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import {
    registerShareApprovalFlow,
    requestShareApproval,
} from "../bootstrap/approval.js";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreShareGateway } from "../gateway/index.js";

test("share approval accepts the requester display name used by Jitsi Meet", async () => {
    const systemCtx = createCtx();
    const ctx = {
        flow: systemCtx.flow,
        capabilities: {
            get: (id: string) => (id === "system:ctx" ? systemCtx : undefined),
        },
    } as unknown as GatewayBootstrapContext;
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
    let approvalRequest: Record<string, unknown> | null = null;
    const gateway = {
        async createApprovalRequestBatch(input: Record<string, unknown>) {
            approvalRequest = input;
            return { mintRequestId: "approval-1", rows: [] };
        },
        async resolveApprovalStatus() {
            return { allResponded: true, anyDeclined: false };
        },
    };

    registerShareApprovalFlow({
        ctx,
        gateway: gateway as unknown as CoreShareGateway,
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
    assert.equal(approvalRequest?.requesterDisplayName, "Alice");
    assert.equal(approvalRequest?.approvalAction, "add a participant");
    assert.equal(approvalRequest?.approvalTarget, "Weekly meeting");
    assert.deepEqual(approvalRequest?.targetAccountIds, ["bob"]);
});

test("share approval retains the share-link popup defaults", async () => {
    const systemCtx = createCtx();
    const ctx = {
        flow: systemCtx.flow,
        capabilities: {
            get: (id: string) => (id === "system:ctx" ? systemCtx : undefined),
        },
    } as unknown as GatewayBootstrapContext;
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
    let approvalRequest: Record<string, unknown> | null = null;
    const gateway = {
        async createApprovalRequestBatch(input: Record<string, unknown>) {
            approvalRequest = input;
            return { mintRequestId: "approval-2", rows: [] };
        },
        async resolveApprovalStatus() {
            return { allResponded: true, anyDeclined: false };
        },
    };

    registerShareApprovalFlow({
        ctx,
        gateway: gateway as unknown as CoreShareGateway,
    });
    await requestShareApproval({
        ctx,
        request: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            requesterAccountId: "alice-account",
        },
    });

    assert.equal(approvalRequest?.approvalAction, "");
    assert.equal(approvalRequest?.approvalTarget, "meeting");
});
