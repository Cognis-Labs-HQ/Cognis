import test from "node:test";
import assert from "node:assert/strict";
import {
    createCtx,
    registerCanonicalFlow,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import { requestShareApproval } from "../bootstrap/approval.js";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreShareGateway } from "../gateway/index.js";

test("share approval accepts the requester display name used by Jitsi Meet", async () => {
    const ctx = createCtx();
    const approvalFlow = SHARE_FLOW_CATALOG.find(
        (flow) => flow.id === "resolve-share-approval-targets",
    );
    assert.ok(approvalFlow);
    registerCanonicalFlow(ctx, approvalFlow);
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

    const result = await requestShareApproval({
        ctx: ctx as unknown as GatewayBootstrapContext,
        gateway: gateway as unknown as CoreShareGateway,
        request: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            requesterAccountId: "alice-account",
            requesterDisplayName: "Alice",
        },
    });

    assert.deepEqual(result, { approved: true, requiresApproval: true });
    assert.equal(approvalRequest?.requesterDisplayName, "Alice");
    assert.deepEqual(approvalRequest?.targetAccountIds, ["bob"]);
});
