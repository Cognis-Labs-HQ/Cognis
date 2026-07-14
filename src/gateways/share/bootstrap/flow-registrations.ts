import type { GatewayBootstrapContext } from "../../shared.js";
import {
    SHARE_FLOW_CATALOG,
    CTX_CAPABILITY,
    registerCanonicalFlow,
    type Ctx,
} from "@cognis/core";
import { getFirstStageResult } from "../../../api/reuse/flow-helpers.js";
import type { CoreShareGateway } from "../gateway/index.js";

const MAX_GUEST_TOKEN_TTL_SECONDS = 4 * 60 * 60;

export async function registerShareBootstrapHooks(input: {
    ctx: GatewayBootstrapContext;
    gateway: CoreShareGateway;
}): Promise<void> {
    const issueAccessToken = input.ctx.capabilities.get<
        (
            subject: string,
            role: "user" | "teacher" | "moderator" | "admin" | "owner",
            ttlSeconds: number | null,
            options?: {
                providerId?: string;
                purpose?: "session" | "password-reset" | "share";
            },
        ) => string
    >("auth:issueAccessToken");
    const systemCtx = input.ctx.capabilities.get<Ctx>(CTX_CAPABILITY);
    if (systemCtx) {
        for (const flow of SHARE_FLOW_CATALOG) {
            registerCanonicalFlow(systemCtx, flow);
        }
    }

    input.ctx.flow.extend(
        "bootstrap-platform",
        "register-flows",
        { id: "share-gateway:bootstrap-registration" },
        () => ({
            gatewayId: "share",
            registeredFlowIds: SHARE_FLOW_CATALOG.map((flow) => flow.id),
        }),
    );

    const APPROVAL_TIMEOUT_SECONDS = 60;
    const APPROVAL_POLL_INTERVAL_MS = 1_000;

    input.ctx.flow.extend(
        "mint-share-token",
        "request-approval",
        { id: "share-gateway:request-approval" },
        async (stageCtx) => {
            const resourceResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-resource",
            ) as {
                valid?: boolean;
                resourceType?: string;
                resourceId?: string;
                ownerAccountId?: string;
                meetingInstanceId?: string;
            } | null;
            const authorizeResult = getFirstStageResult(
                stageCtx.stageResults,
                "authorize-minter",
            ) as {
                authorized?: boolean;
                ownerAccountId?: string;
                meetingInstanceId?: string;
            } | null;
            if (!resourceResult?.valid || !authorizeResult?.authorized) {
                return { approved: false, reason: "share_mint_rejected" };
            }
            const requesterAccountId =
                authorizeResult.ownerAccountId ??
                resourceResult.ownerAccountId ??
                "";
            if (!stageCtx.ctx.flow.exists("resolve-share-approval-targets")) {
                return { approved: true, requiresApproval: false };
            }
            const targetsResult = await stageCtx.ctx.flow.run(
                "resolve-share-approval-targets",
                {
                    resourceType: resourceResult.resourceType,
                    resourceId: resourceResult.resourceId,
                    requesterAccountId,
                },
            );
            const resolvedTargets = (targetsResult.stageResults[
                "resolve-targets"
            ] ?? [])[0] as {
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
                                accountId !== requesterAccountId,
                        ),
                ),
            );
            if (targetAccountIds.length === 0) {
                return { approved: true, requiresApproval: false };
            }
            const { mintRequestId } =
                await input.gateway.createApprovalRequestBatch({
                    resourceType: resourceResult.resourceType ?? "",
                    resourceId: resourceResult.resourceId ?? "",
                    requesterAccountId,
                    requesterDisplayName: String(
                        resolvedTargets?.requesterDisplayName ??
                            requesterAccountId,
                    ),
                    targetAccountIds,
                    ttlSeconds: APPROVAL_TIMEOUT_SECONDS,
                });
            const deadline = Date.now() + APPROVAL_TIMEOUT_SECONDS * 1000;
            let summary =
                await input.gateway.resolveApprovalStatus(mintRequestId);
            while (!summary.allResponded && Date.now() < deadline) {
                await new Promise((resolve) =>
                    setTimeout(resolve, APPROVAL_POLL_INTERVAL_MS),
                );
                summary =
                    await input.gateway.resolveApprovalStatus(mintRequestId);
            }
            if (!summary.allResponded) {
                // Timeout reached; resolveApprovalStatus auto-approves any
                // still-pending rows on its next call, so query once more to
                // pick up the fallback-approved state.
                summary =
                    await input.gateway.resolveApprovalStatus(mintRequestId);
            }
            if (summary.anyDeclined) {
                return {
                    approved: false,
                    requiresApproval: true,
                    reason: "share_approval_declined",
                };
            }
            return { approved: true, requiresApproval: true };
        },
    );

    input.ctx.flow.extend(
        "mint-share-token",
        "issue-token",
        { id: "share-gateway:issue-token" },
        async (stageCtx) => {
            const resourceResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-resource",
            ) as {
                valid?: boolean;
                resourceType?: string;
                resourceId?: string;
                ownerAccountId?: string;
                meetingInstanceId?: string;
            } | null;
            const authorizeResult = getFirstStageResult(
                stageCtx.stageResults,
                "authorize-minter",
            ) as {
                authorized?: boolean;
                ownerAccountId?: string;
                meetingInstanceId?: string;
            } | null;
            const approvalResult = getFirstStageResult(
                stageCtx.stageResults,
                "request-approval",
            ) as {
                approved?: boolean;
                reason?: string;
            } | null;
            if (
                !resourceResult?.valid ||
                !authorizeResult?.authorized ||
                approvalResult?.approved === false
            ) {
                return {
                    minted: false,
                    reason:
                        approvalResult?.approved === false
                            ? (approvalResult.reason ??
                              "share_approval_declined")
                            : "share_mint_rejected",
                };
            }
            const inputPayload = (stageCtx.input ?? {}) as {
                label?: string;
                grantedCapabilities?: string[];
                expiresAt?: string;
            };
            const shareRecord = await input.gateway.issueToken({
                ownerAccountId:
                    authorizeResult.ownerAccountId ??
                    resourceResult.ownerAccountId ??
                    "",
                resourceType: resourceResult.resourceType ?? "",
                resourceId: resourceResult.resourceId ?? "",
                metadata: authorizeResult.meetingInstanceId
                    ? {
                          meetingInstanceId: authorizeResult.meetingInstanceId,
                      }
                    : resourceResult.meetingInstanceId
                      ? {
                            meetingInstanceId: resourceResult.meetingInstanceId,
                        }
                      : null,
                label: inputPayload.label,
                grantedCapabilities: Array.isArray(
                    inputPayload.grantedCapabilities,
                )
                    ? inputPayload.grantedCapabilities
                    : [],
                expiresAt: String(inputPayload.expiresAt ?? ""),
            });
            stageCtx.data.shareRecord = shareRecord;
            return { minted: true, shareRecord };
        },
    );

    input.ctx.flow.extend(
        "mint-share-token",
        "emit-event",
        { id: "share-gateway:emit-event" },
        (stageCtx) => {
            const issued = getFirstStageResult(
                stageCtx.stageResults,
                "issue-token",
            ) as {
                minted?: boolean;
                shareRecord?: unknown;
            } | null;
            return {
                emitted: Boolean(issued?.minted),
                shareRecord: issued?.shareRecord ?? null,
            };
        },
    );

    input.ctx.flow.extend(
        "resolve-share-token",
        "validate-token",
        { id: "share-gateway:validate-token" },
        async (stageCtx) => {
            const inputPayload = (stageCtx.input ?? {}) as { token?: string };
            const token = String(inputPayload.token ?? "").trim();
            if (!token) {
                return { valid: false, reason: "missing_token" };
            }
            const tokenRecord = await input.gateway.resolveToken(token);
            if (!tokenRecord) {
                return { valid: false, reason: "invalid_token" };
            }
            stageCtx.data.shareTokenRecord = tokenRecord;
            return { valid: true, tokenRecord };
        },
    );

    input.ctx.flow.extend(
        "resolve-share-token",
        "issue-guest-token",
        { id: "share-gateway:issue-guest-token" },
        async (stageCtx) => {
            const tokenResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-token",
            ) as {
                valid?: boolean;
                tokenRecord?: {
                    id?: string;
                    expiresAt?: string;
                };
            } | null;
            const resourceResult = getFirstStageResult(
                stageCtx.stageResults,
                "resolve-resource",
            ) as {
                resolved?: boolean;
            } | null;
            const accessResult = getFirstStageResult(
                stageCtx.stageResults,
                "check-access",
            ) as {
                allowed?: boolean;
                directAccess?: boolean;
            } | null;
            if (!tokenResult?.valid || !resourceResult?.resolved) {
                return { issued: false, reason: "resource_unavailable" };
            }
            if (accessResult && accessResult.allowed === false) {
                return { issued: false, reason: "forbidden" };
            }
            if (accessResult?.directAccess === true) {
                // The requester already has direct access to the resource
                // through their own account (e.g. they are the meeting
                // owner or an invited participant). Minting a guest token
                // for them would discard their real identity when the
                // client activates it, so no guest token is issued here —
                // the share link falls back to being a one-time bypass
                // only for visitors without direct access.
                return { issued: false, reason: "direct_access" };
            }
            if (!issueAccessToken || !tokenResult.tokenRecord?.id) {
                return { issued: false, reason: "auth_issue_unavailable" };
            }
            const now = Date.now();
            const expiresAt = String(tokenResult.tokenRecord.expiresAt ?? "");
            const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
            const ttlSeconds = Number.isFinite(expiresAtMs)
                ? Math.floor((expiresAtMs - now) / 1000)
                : MAX_GUEST_TOKEN_TTL_SECONDS;
            if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
                return { issued: false, reason: "expired" };
            }
            const boundedTtlSeconds = Math.min(
                MAX_GUEST_TOKEN_TTL_SECONDS,
                ttlSeconds,
            );
            const guestProfile = await input.gateway.createGuestProfile({
                shareId: tokenResult.tokenRecord.id,
                ttlSeconds: boundedTtlSeconds,
            });
            const guestAccessToken = issueAccessToken(
                `share:${tokenResult.tokenRecord.id}:${guestProfile.guestId}`,
                "user",
                boundedTtlSeconds,
                {
                    providerId: "share",
                    purpose: "share",
                },
            );
            stageCtx.data.guestAccessToken = guestAccessToken;
            return { issued: true };
        },
    );

    input.ctx.flow.extend(
        "resolve-share-token",
        "build-payload",
        { id: "share-gateway:build-payload" },
        async (stageCtx) => {
            const tokenResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-token",
            ) as {
                valid?: boolean;
                tokenRecord?: Record<string, unknown>;
            } | null;
            const resourceResult = getFirstStageResult(
                stageCtx.stageResults,
                "resolve-resource",
            ) as {
                resolved?: boolean;
                resourceType?: string;
                resourceId?: string;
                payload?: Record<string, unknown>;
            } | null;
            const accessResult = getFirstStageResult(
                stageCtx.stageResults,
                "check-access",
            ) as {
                allowed?: boolean;
                reason?: string;
                directAccess?: boolean;
            } | null;
            if (!tokenResult?.valid || !resourceResult?.resolved) {
                return { resolved: false, reason: "resource_unavailable" };
            }
            if (accessResult && accessResult.allowed === false) {
                return {
                    resolved: false,
                    reason: accessResult.reason ?? "forbidden",
                };
            }
            const pageResult = stageCtx.ctx.flow.exists("construct-share-page")
                ? await stageCtx.ctx.flow.run("construct-share-page", {
                      resourceType: resourceResult.resourceType,
                      resourceId: resourceResult.resourceId,
                      tokenRecord: tokenResult.tokenRecord,
                      resource: resourceResult,
                  })
                : null;
            const shellResult =
                pageResult?.stageResults["resolve-shell"]?.[0] ?? {};
            const rendererResult =
                pageResult?.stageResults["resolve-resource-renderer"]?.[0] ??
                {};
            return {
                resolved: true,
                resourceType: resourceResult.resourceType,
                resourceId: resourceResult.resourceId,
                payload: resourceResult.payload ?? {},
                directAccess: accessResult?.directAccess === true,
                guestAccessToken:
                    typeof stageCtx.data.guestAccessToken === "string"
                        ? stageCtx.data.guestAccessToken
                        : "",
                grantedCapabilities:
                    (tokenResult.tokenRecord?.grantedCapabilities as
                        | string[]
                        | undefined) ?? [],
                page: {
                    ...shellResult,
                    ...rendererResult,
                },
            };
        },
    );

    input.ctx.flow.extend(
        "revoke-share-token",
        "delete-token",
        { id: "share-gateway:delete-token" },
        async (stageCtx) => {
            const authorizeResult = getFirstStageResult(
                stageCtx.stageResults,
                "authorize-revocation",
            ) as {
                authorized?: boolean;
                shareId?: string;
                ownerAccountId?: string;
                resourceType?: string;
                resourceId?: string;
            } | null;
            if (!authorizeResult?.authorized || !authorizeResult.shareId) {
                return { revoked: false, reason: "share_revoke_rejected" };
            }
            const deleted = await input.gateway.deleteToken({
                shareId: authorizeResult.shareId,
                ownerAccountId: authorizeResult.ownerAccountId,
                resourceType: authorizeResult.resourceType,
                resourceId: authorizeResult.resourceId,
            });
            return { revoked: deleted };
        },
    );

    input.ctx.flow.extend(
        "construct-share-page",
        "resolve-shell",
        { id: "share-gateway:resolve-shell" },
        () => ({
            pageContextKey: "share.page_title",
            pageSubtitleKey: "share.subtitle",
            showTopbar: true,
            showNavbar: false,
            showFooter: true,
            showThemeToggle: true,
            frameless: false,
            stringsBaseUrl: ["/static/gateways/share/languages"],
        }),
    );
}
