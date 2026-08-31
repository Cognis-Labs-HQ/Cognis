import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreShareGateway } from "../gateway/index.js";

const APPROVAL_TIMEOUT_SECONDS = 60;
const APPROVAL_POLL_INTERVAL_MS = 1_000;

export interface ShareApprovalInput {
    resourceType: string;
    resourceId: string;
    requesterAccountId: string;
}

export interface ShareApprovalResult {
    approved: boolean;
    requiresApproval: boolean;
    reason?: string;
}

export async function requestShareApproval(input: {
    ctx: GatewayBootstrapContext;
    gateway: CoreShareGateway;
    request: ShareApprovalInput;
}): Promise<ShareApprovalResult> {
    if (!input.ctx.flow.exists("resolve-share-approval-targets")) {
        return { approved: true, requiresApproval: false };
    }
    const targetsResult = await input.ctx.flow.run(
        "resolve-share-approval-targets",
        input.request,
    );
    const resolvedTargets = (targetsResult.stageResults["resolve-targets"] ??
        [])[0] as {
        targetAccountIds?: string[];
        requesterDisplayName?: string;
    } | null;
    const targetAccountIds = Array.from(
        new Set(
            (resolvedTargets?.targetAccountIds ?? [])
                .map((accountId) => String(accountId ?? "").trim())
                .filter(
                    (accountId) =>
                        Boolean(accountId) &&
                        accountId !== input.request.requesterAccountId,
                ),
        ),
    );
    if (targetAccountIds.length === 0) {
        return { approved: true, requiresApproval: false };
    }
    const { mintRequestId } = await input.gateway.createApprovalRequestBatch({
        ...input.request,
        requesterDisplayName: String(
            resolvedTargets?.requesterDisplayName ??
                input.request.requesterAccountId,
        ),
        targetAccountIds,
        ttlSeconds: APPROVAL_TIMEOUT_SECONDS,
    });
    input.ctx.log?.("info", "Requested approval for a shared resource.", {
        component: "share-gateway",
        operation: "request_share_approval",
        resourceType: input.request.resourceType,
        resourceId: input.request.resourceId,
        requesterAccountId: input.request.requesterAccountId,
        targetAccountIds,
    });
    const deadline = Date.now() + APPROVAL_TIMEOUT_SECONDS * 1000;
    let summary = await input.gateway.resolveApprovalStatus(mintRequestId);
    while (!summary.allResponded && Date.now() < deadline) {
        await new Promise((resolve) =>
            setTimeout(resolve, APPROVAL_POLL_INTERVAL_MS),
        );
        summary = await input.gateway.resolveApprovalStatus(mintRequestId);
    }
    if (!summary.allResponded) {
        // The polling loop above is the primary path; this timeout fallback
        // auto-approves pending rows through the next status resolution.
        summary = await input.gateway.resolveApprovalStatus(mintRequestId);
    }
    return summary.anyDeclined
        ? {
              approved: false,
              requiresApproval: true,
              reason: "share_approval_declined",
          }
        : { approved: true, requiresApproval: true };
}
