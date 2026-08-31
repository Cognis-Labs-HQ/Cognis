import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreShareGateway } from "../gateway/index.js";
import { CTX_CAPABILITY, type Ctx } from "@cognis/core";

const APPROVAL_FLOW_ID = "request-share-approval";
const APPROVAL_TIMEOUT_SECONDS = 60;
const APPROVAL_POLL_INTERVAL_MS = 1_000;

export interface ShareApprovalInput {
    resourceType: string;
    resourceId: string;
    requesterAccountId: string;
    requesterDisplayName?: string;
    action?: string;
    target?: string;
}

export interface ShareApprovalResult {
    approved: boolean;
    requiresApproval: boolean;
    reason?: string;
}

function firstStageResult<T>(
    stageResults: Record<string, unknown[]>,
    stageId: string,
): T | null {
    return (stageResults[stageId]?.[0] as T | undefined) ?? null;
}

export function registerShareApprovalFlow(input: {
    ctx: GatewayBootstrapContext;
    gateway: CoreShareGateway;
}): void {
    const systemCtx = input.ctx.capabilities.get<Ctx>(CTX_CAPABILITY);
    if (!input.ctx.flow.exists(APPROVAL_FLOW_ID)) {
        systemCtx?.registerFlow({
            id: APPROVAL_FLOW_ID,
            description:
                "Resolves approvers, persists requests, waits for responses, and decides a Share approval request.",
            stages: [
                "resolve-targets",
                "create-request",
                "wait-for-responses",
                "decide",
            ],
        });
    }

    input.ctx.flow.extend(
        APPROVAL_FLOW_ID,
        "resolve-targets",
        { id: "share-gateway:resolve-approval-targets" },
        async (stageCtx) => {
            const request = stageCtx.input as ShareApprovalInput;
            if (!input.ctx.flow.exists("resolve-share-approval-targets")) {
                return { targetAccountIds: [] };
            }
            const result = await input.ctx.flow.run(
                "resolve-share-approval-targets",
                request,
            );
            const resolved = firstStageResult<{
                targetAccountIds?: string[];
                requesterDisplayName?: string;
            }>(result.stageResults, "resolve-targets");
            return {
                requesterDisplayName: resolved?.requesterDisplayName,
                targetAccountIds: Array.from(
                    new Set(
                        (resolved?.targetAccountIds ?? [])
                            .map((accountId) => String(accountId ?? "").trim())
                            .filter(
                                (accountId) =>
                                    Boolean(accountId) &&
                                    accountId !== request.requesterAccountId,
                            ),
                    ),
                ),
            };
        },
    );
    input.ctx.flow.extend(
        APPROVAL_FLOW_ID,
        "create-request",
        { id: "share-gateway:create-approval-request" },
        async (stageCtx) => {
            const request = stageCtx.input as ShareApprovalInput;
            const resolved = firstStageResult<{
                targetAccountIds: string[];
                requesterDisplayName?: string;
            }>(stageCtx.stageResults, "resolve-targets");
            if (!resolved?.targetAccountIds.length)
                return { requiresApproval: false };
            const created = await input.gateway.createApprovalRequestBatch({
                ...request,
                requesterDisplayName: String(
                    resolved.requesterDisplayName ??
                        request.requesterDisplayName ??
                        request.requesterAccountId,
                ),
                approvalAction: String(request.action ?? "").trim(),
                approvalTarget:
                    String(request.target ?? "").trim() || request.resourceType,
                targetAccountIds: resolved.targetAccountIds,
                ttlSeconds: APPROVAL_TIMEOUT_SECONDS,
            });
            input.ctx.log?.(
                "info",
                "Requested approval for a shared resource.",
                {
                    component: "share-gateway",
                    operation: "request_share_approval",
                    resourceType: request.resourceType,
                    resourceId: request.resourceId,
                    requesterAccountId: request.requesterAccountId,
                    targetAccountIds: resolved.targetAccountIds,
                },
            );
            return {
                requiresApproval: true,
                mintRequestId: created.mintRequestId,
            };
        },
    );
    input.ctx.flow.extend(
        APPROVAL_FLOW_ID,
        "wait-for-responses",
        { id: "share-gateway:wait-for-approval-responses" },
        async (stageCtx) => {
            const created = firstStageResult<{
                requiresApproval: boolean;
                mintRequestId?: string;
            }>(stageCtx.stageResults, "create-request");
            if (!created?.requiresApproval || !created.mintRequestId)
                return null;
            const deadline = Date.now() + APPROVAL_TIMEOUT_SECONDS * 1000;
            let summary = await input.gateway.resolveApprovalStatus(
                created.mintRequestId,
            );
            while (!summary.allResponded && Date.now() < deadline) {
                await new Promise((resolve) =>
                    setTimeout(resolve, APPROVAL_POLL_INTERVAL_MS),
                );
                summary = await input.gateway.resolveApprovalStatus(
                    created.mintRequestId,
                );
            }
            if (!summary.allResponded) {
                // The polling loop above is the primary path; this timeout
                // fallback is handled by the status resolution below.
                summary = await input.gateway.resolveApprovalStatus(
                    created.mintRequestId,
                );
            }
            return summary;
        },
    );
    input.ctx.flow.extend(
        APPROVAL_FLOW_ID,
        "decide",
        { id: "share-gateway:decide-approval" },
        (stageCtx): ShareApprovalResult => {
            const created = firstStageResult<{ requiresApproval: boolean }>(
                stageCtx.stageResults,
                "create-request",
            );
            if (!created?.requiresApproval) {
                return { approved: true, requiresApproval: false };
            }
            const summary = firstStageResult<{ anyDeclined?: boolean }>(
                stageCtx.stageResults,
                "wait-for-responses",
            );
            return summary?.anyDeclined
                ? {
                      approved: false,
                      requiresApproval: true,
                      reason: "share_approval_declined",
                  }
                : { approved: true, requiresApproval: true };
        },
    );
}

export async function requestShareApproval(input: {
    ctx: GatewayBootstrapContext;
    request: ShareApprovalInput;
}): Promise<ShareApprovalResult> {
    const result = await input.ctx.flow.run(APPROVAL_FLOW_ID, input.request);
    return (
        firstStageResult<ShareApprovalResult>(
            result.stageResults,
            "decide",
        ) ?? {
            approved: false,
            requiresApproval: false,
            reason: "share_approval_unavailable",
        }
    );
}
