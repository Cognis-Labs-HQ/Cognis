import type { GatewayBootstrapContext } from "../../shared.js";
import {
    SHARE_FLOW_CATALOG,
    CTX_CAPABILITY,
    registerCanonicalFlow,
    type Ctx,
} from "@cognis/core";
import {
    getFirstMatchingStageResult,
    getFirstStageResult,
} from "../../../api/reuse/flow-helpers.js";
import type { CoreShareGateway } from "../gateway/index.js";
import { createHash } from "node:crypto";

const MAX_GUEST_TOKEN_TTL_SECONDS = 4 * 60 * 60;

type ShareAccessResult = {
    allowed?: boolean;
    reason?: string;
    directAccess?: boolean;
};

function resolveShareAccessResult(
    stageResults: Record<string, unknown[]> | undefined,
): ShareAccessResult | null {
    return (
        (getFirstMatchingStageResult(
            stageResults,
            "check-access",
            (result) =>
                (result as ShareAccessResult)?.allowed === true &&
                (result as ShareAccessResult)?.directAccess === true,
        ) as ShareAccessResult | null) ??
        (getFirstMatchingStageResult(
            stageResults,
            "check-access",
            (result) => (result as ShareAccessResult)?.allowed === true,
        ) as ShareAccessResult | null) ??
        (getFirstMatchingStageResult(
            stageResults,
            "check-access",
            (result) => (result as ShareAccessResult)?.allowed === false,
        ) as ShareAccessResult | null)
    );
}

function shareRecipientsAllowRequester(
    tokenRecord: {
        ownerAccountId?: unknown;
        accessControls?: { recipients?: unknown };
    },
    requesterClaims: { sub?: unknown } | null | undefined,
): boolean {
    const recipients = tokenRecord.accessControls?.recipients;
    if (!Array.isArray(recipients) || recipients.length === 0) {
        return true;
    }
    const requesterId = String(requesterClaims?.sub ?? "").trim();
    if (!requesterId) {
        return false;
    }
    if (requesterId === String(tokenRecord.ownerAccountId ?? "")) {
        return true;
    }
    return recipients.some((entry) => {
        if (!entry || typeof entry !== "object") {
            return false;
        }
        const recipient = entry as { type?: unknown; id?: unknown };
        return (
            String(recipient.type ?? "") === "user" &&
            String(recipient.id ?? "") === requesterId
        );
    });
}

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

    input.ctx.flow.extend(
        "resolve-share-token",
        "check-access",
        { id: "share-gateway:account-access" },
        (stageCtx) => {
            const tokenResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-token",
            ) as {
                valid?: boolean;
                tokenRecord?: {
                    ownerAccountId?: unknown;
                    accessControls?: { recipients?: unknown };
                };
            } | null;
            const requesterAccountId = String(
                stageCtx.input?.requesterClaims?.sub ?? "",
            ).trim();
            const recipients =
                tokenResult?.tokenRecord?.accessControls?.recipients;
            const isOwner =
                tokenResult?.valid === true &&
                requesterAccountId.length > 0 &&
                requesterAccountId ===
                    String(tokenResult.tokenRecord?.ownerAccountId ?? "");
            const isUserRecipient =
                tokenResult?.valid === true &&
                requesterAccountId.length > 0 &&
                Array.isArray(recipients) &&
                recipients.some(
                    (recipient) =>
                        recipient &&
                        typeof recipient === "object" &&
                        String(recipient.type ?? "") === "user" &&
                        String(recipient.id ?? "") === requesterAccountId,
                );
            return isOwner || isUserRecipient
                ? { allowed: true, directAccess: true }
                : null;
        },
    );
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
        "prepare-share-method",
        "prepare-method",
        { id: "share-gateway:prepare-method" },
        (stageCtx) => {
            const flowInput = (stageCtx.input ?? {}) as {
                shareMethod?: string;
                recipients?: unknown;
                accessControls?: Record<string, unknown>;
            };
            try {
                return {
                    prepared: true,
                    ...input.gateway.prepareAdapterShare(
                        String(flowInput.shareMethod ?? ""),
                        flowInput,
                    ),
                };
            } catch (error) {
                return {
                    prepared: false,
                    reason:
                        error instanceof Error ? error.message : String(error),
                };
            }
        },
    );

    input.ctx.flow.extend(
        "mint-share-token",
        "request-approval",
        { id: "share-gateway:request-approval" },
        async (stageCtx) => {
            const resourceResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "validate-resource",
                (result) => Boolean((result as { valid?: boolean })?.valid),
            ) as {
                valid?: boolean;
                resourceType?: string;
                resourceId?: string;
                ownerAccountId?: string;
                meetingInstanceId?: string;
                metadata?: Record<string, string>;
            } | null;
            const authorizeResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "authorize-minter",
                (result) =>
                    Boolean((result as { authorized?: boolean })?.authorized),
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
            const resourceResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "validate-resource",
                (result) => Boolean((result as { valid?: boolean })?.valid),
            ) as {
                valid?: boolean;
                resourceType?: string;
                resourceId?: string;
                ownerAccountId?: string;
                meetingInstanceId?: string;
            } | null;
            const authorizeResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "authorize-minter",
                (result) =>
                    Boolean((result as { authorized?: boolean })?.authorized),
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
                accessControls?: Record<string, unknown>;
                password?: string | null;
                generatePassword?: boolean;
                expiresAt?: string;
                contentUrl?: string;
                supportsReadOnly?: boolean;
            };
            let shareRecord;
            try {
                shareRecord = await input.gateway.issueToken({
                    ownerAccountId:
                        authorizeResult.ownerAccountId ??
                        resourceResult.ownerAccountId ??
                        "",
                    resourceType: resourceResult.resourceType ?? "",
                    resourceId: resourceResult.resourceId ?? "",
                    metadata: {
                        ...(resourceResult.metadata ?? {}),
                        ...(authorizeResult.meetingInstanceId
                            ? {
                                  meetingInstanceId:
                                      authorizeResult.meetingInstanceId,
                              }
                            : resourceResult.meetingInstanceId
                              ? {
                                    meetingInstanceId:
                                        resourceResult.meetingInstanceId,
                                }
                              : {}),
                        ...(inputPayload.contentUrl
                            ? { contentUrl: inputPayload.contentUrl }
                            : {}),
                        supportsReadOnly: inputPayload.supportsReadOnly
                            ? "true"
                            : "false",
                    },
                    label: inputPayload.label,
                    grantedCapabilities: Array.isArray(
                        inputPayload.grantedCapabilities,
                    )
                        ? inputPayload.grantedCapabilities
                        : [],
                    accessControls: inputPayload.accessControls,
                    password: inputPayload.password,
                    generatePassword: inputPayload.generatePassword === true,
                    expiresAt: String(inputPayload.expiresAt ?? ""),
                });
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === "duplicate_user_share"
                ) {
                    return { minted: false, reason: "duplicate_user_share" };
                }
                throw error;
            }
            stageCtx.data.shareRecord = shareRecord;
            return { minted: true, shareRecord };
        },
    );

    input.ctx.flow.extend(
        "mint-share-token",
        "emit-event",
        { id: "share-gateway:emit-event" },
        async (stageCtx) => {
            const issued = getFirstStageResult(
                stageCtx.stageResults,
                "issue-token",
            ) as {
                minted?: boolean;
                shareRecord?: unknown;
            } | null;
            const shareRecord = issued?.shareRecord as {
                ownerAccountId?: string;
                resourceType?: string;
                resourceId?: string;
                label?: string;
                shareUrl?: string;
                metadata?: Record<string, string> | null;
                accessControls?: {
                    recipients?: Array<{ type?: string; id?: string }>;
                };
            } | null;
            const userRecipients = Array.from(
                new Set(
                    (shareRecord?.accessControls?.recipients ?? [])
                        .filter((recipient) => recipient?.type === "user")
                        .map((recipient) => String(recipient.id ?? "").trim())
                        .filter(Boolean),
                ),
            );
            const registerCategory = input.ctx.capabilities.get<
                (id: string, label: string) => void
            >("notify:registerCategory");
            const dispatch =
                input.ctx.capabilities.get<
                    (envelope: {
                        category: string;
                        recipientUsername: string;
                        subject: string;
                        body: string;
                        actionUrl?: string;
                        senderName?: string;
                        metadata?: Record<string, unknown>;
                    }) => Promise<unknown>
                >("notify:dispatch");
            if (issued?.minted && dispatch && userRecipients.length > 0) {
                registerCategory?.("share", "Share");
                const shareUrl = String(shareRecord?.shareUrl ?? "").trim();
                await Promise.allSettled(
                    userRecipients.map((recipientUsername) =>
                        dispatch({
                            category: "share",
                            recipientUsername,
                            subject: `${shareRecord?.ownerAccountId ?? "A Cognis user"} shared an item with you`,
                            body: `${shareRecord?.ownerAccountId ?? "A Cognis user"} shared ${shareRecord?.label || shareRecord?.resourceType || "an item"} with you. Open it to view the shared content and its access permissions.`,
                            actionUrl: shareUrl || undefined,
                            senderName: "Cognis Share",
                            metadata: {
                                shareId: (shareRecord as { id?: string })?.id,
                                resourceType: shareRecord?.resourceType,
                                resourceId: shareRecord?.resourceId,
                            },
                        }),
                    ),
                );
            }
            return {
                emitted: Boolean(issued?.minted),
                shareRecord: shareRecord ?? null,
                notifiedRecipients: userRecipients,
            };
        },
    );

    input.ctx.flow.extend(
        "resolve-share-token",
        "validate-token",
        { id: "share-gateway:validate-token" },
        async (stageCtx) => {
            const inputPayload = (stageCtx.input ?? {}) as {
                token?: string;
                password?: string | null;
            };
            const token = String(inputPayload.token ?? "").trim();
            if (!token) {
                return { valid: false, reason: "missing_token" };
            }
            const tokenRecord = await input.gateway.resolveToken(
                token,
                inputPayload.password,
            );
            if (!tokenRecord) {
                const inspectedRecord = await input.gateway.inspectToken(token);
                if (inspectedRecord?.passwordHash) {
                    return { valid: false, reason: "password_required" };
                }
                return { valid: false, reason: "invalid_token" };
            }
            const requesterClaims = (
                stageCtx.input as {
                    requesterClaims?: { sub?: unknown } | null;
                }
            ).requesterClaims;
            if (!shareRecipientsAllowRequester(tokenRecord, requesterClaims)) {
                return { valid: false, reason: "recipient_restricted" };
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
                reason?: string;
            } | null;
            const resourceResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "resolve-resource",
                (result) =>
                    Boolean((result as { resolved?: boolean })?.resolved),
            ) as {
                resolved?: boolean;
            } | null;
            const accessResult = resolveShareAccessResult(
                stageCtx.stageResults,
            );
            if (!tokenResult?.valid) {
                return {
                    issued: false,
                    reason: tokenResult?.reason ?? "invalid_token",
                };
            }
            if (!resourceResult?.resolved) {
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
            const guestKeyringAccountId = `share:${tokenResult.tokenRecord.id}:${guestProfile.guestId}`;
            stageCtx.data.guestAccessToken = guestAccessToken;
            stageCtx.data.guestKeyring = {
                accountId: guestKeyringAccountId,
                passphrase: createHash("sha256")
                    .update(`guest-keyring:${guestAccessToken}`)
                    .digest("base64url"),
            };
            stageCtx.data.guestProfile = {
                displayName: guestProfile.displayName,
                avatarKey: guestProfile.avatarKey,
            };
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
                reason?: string;
                tokenRecord?: Record<string, unknown>;
            } | null;
            const resourceResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "resolve-resource",
                (result) =>
                    Boolean((result as { resolved?: boolean })?.resolved),
            ) as {
                resolved?: boolean;
                resourceType?: string;
                resourceId?: string;
                payload?: Record<string, unknown>;
            } | null;
            const accessResult = resolveShareAccessResult(
                stageCtx.stageResults,
            );
            if (!tokenResult?.valid) {
                return {
                    resolved: false,
                    reason: tokenResult?.reason ?? "invalid_token",
                };
            }
            if (!resourceResult?.resolved) {
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
                (getFirstMatchingStageResult(
                    pageResult?.stageResults,
                    "resolve-resource-renderer",
                    (result) => {
                        if (!result || typeof result !== "object") {
                            return false;
                        }
                        const candidate = result as {
                            mountScriptUrl?: unknown;
                            rendererScriptUrl?: unknown;
                        };
                        return Boolean(
                            candidate.mountScriptUrl ||
                            candidate.rendererScriptUrl,
                        );
                    },
                ) as Record<string, unknown> | null) ?? {};
            return {
                resolved: true,
                shareId: String(tokenResult.tokenRecord?.id ?? ""),
                resourceType: resourceResult.resourceType,
                resourceId: resourceResult.resourceId,
                ownerAccountId: String(
                    tokenResult.tokenRecord?.ownerAccountId ?? "",
                ),
                expiresAt: String(tokenResult.tokenRecord?.expiresAt ?? ""),
                payload: resourceResult.payload ?? {},
                contentUrl: String(
                    tokenResult.tokenRecord?.metadata?.contentUrl ?? "",
                ),
                directAccess: accessResult?.directAccess === true,
                guestAccessToken:
                    typeof stageCtx.data.guestAccessToken === "string"
                        ? stageCtx.data.guestAccessToken
                        : "",
                grantedCapabilities:
                    (tokenResult.tokenRecord?.grantedCapabilities as
                        string[] | undefined) ?? [],
                accessControls:
                    (tokenResult.tokenRecord?.accessControls as
                        Record<string, unknown> | undefined) ?? {},
                readonlyWatermark: Boolean(
                    (
                        tokenResult.tokenRecord?.accessControls as
                            { watermarkReadonly?: boolean } | undefined
                    )?.watermarkReadonly,
                ),
                guestProfile:
                    typeof stageCtx.data.guestProfile === "object"
                        ? stageCtx.data.guestProfile
                        : null,
                guestKeyring:
                    typeof stageCtx.data.guestKeyring === "object"
                        ? stageCtx.data.guestKeyring
                        : null,
                page: {
                    ...shellResult,
                    ...rendererResult,
                },
            };
        },
    );

    input.ctx.flow.extend(
        "resolve-share-token",
        "deliver-recipient",
        { id: "share-gateway:deliver-recipient" },
        async (stageCtx) => {
            const resolved = getFirstStageResult(
                stageCtx.stageResults,
                "build-payload",
            ) as {
                resolved?: boolean;
                resourceType?: string;
                shareId?: string;
                resourceId?: string;
                ownerAccountId?: string;
                expiresAt?: string;
                grantedCapabilities?: string[];
                accessControls?: { recipients?: unknown };
            } | null;
            const requesterClaims = (
                stageCtx.input as { requesterClaims?: { sub?: unknown } }
            ).requesterClaims;
            const recipientAccountId = String(requesterClaims?.sub ?? "");
            const recipients = resolved?.accessControls?.recipients;
            const isUserRecipient =
                Array.isArray(recipients) &&
                recipients.some((entry) => {
                    if (!entry || typeof entry !== "object") return false;
                    const recipient = entry as {
                        type?: unknown;
                        id?: unknown;
                    };
                    return (
                        recipient.type === "user" &&
                        String(recipient.id ?? "") === recipientAccountId
                    );
                });
            if (!resolved?.resolved || !isUserRecipient) return null;
            const deliverUserShare = input.gateway.getCapability<
                (delivery: {
                    resourceType: string;
                    shareId: string;
                    resourceId: string;
                    ownerAccountId: string;
                    recipientAccountId: string;
                    grantedCapabilities: string[];
                    expiresAt: string;
                }) => Promise<{ navigationUrl?: string } | null>
            >(`share:deliverUserShare:${resolved.resourceType ?? ""}`);
            if (!deliverUserShare) return null;
            return deliverUserShare({
                shareId: String(resolved.shareId ?? ""),
                resourceType: String(resolved.resourceType ?? ""),
                resourceId: String(resolved.resourceId ?? ""),
                ownerAccountId: String(resolved.ownerAccountId ?? ""),
                recipientAccountId,
                grantedCapabilities: resolved.grantedCapabilities ?? [],
                expiresAt: String(resolved.expiresAt ?? ""),
            });
        },
    );

    input.ctx.flow.extend(
        "update-share-token",
        "authorize-update",
        { id: "share-gateway:authorize-update" },
        async (stageCtx) => {
            const flowInput = (stageCtx.input ?? {}) as {
                claims?: { sub?: string };
                shareId?: string;
            };
            const existingToken = await input.gateway.getTokenById(
                String(flowInput.shareId ?? ""),
            );
            const ownerAccountId = String(flowInput.claims?.sub ?? "");
            const authorized =
                Boolean(existingToken) &&
                existingToken?.ownerAccountId === ownerAccountId;
            return {
                authorized,
                existingToken: authorized ? existingToken : null,
            };
        },
    );

    input.ctx.flow.extend(
        "update-share-token",
        "update-token",
        { id: "share-gateway:update-token" },
        async (stageCtx) => {
            const authorization = getFirstStageResult(
                stageCtx.stageResults,
                "authorize-update",
            ) as { authorized?: boolean } | null;
            if (!authorization?.authorized) {
                return { updated: false, reason: "forbidden" };
            }
            const flowInput = (stageCtx.input ?? {}) as {
                claims?: { sub?: string };
                shareId?: string;
                changes?: Parameters<CoreShareGateway["updateToken"]>[0];
            };
            const updatedToken = await input.gateway.updateToken({
                ...(flowInput.changes ?? {}),
                shareId: String(flowInput.shareId ?? ""),
                ownerAccountId: String(flowInput.claims?.sub ?? ""),
            });
            return {
                updated: Boolean(updatedToken),
                updatedToken,
            };
        },
    );

    input.ctx.flow.extend(
        "revoke-share-token",
        "authorize-revocation",
        { id: "share-gateway:authorize-recipient-rejection" },
        async (stageCtx) => {
            if (stageCtx.input?.rejection !== true) return null;
            const flowInput = (stageCtx.input ?? {}) as {
                claims?: { sub?: string };
                shareId?: string;
            };
            const shareRecord = await input.gateway.getTokenById(
                String(flowInput.shareId ?? ""),
            );
            const recipientAccountId = String(flowInput.claims?.sub ?? "");
            const authorized = Boolean(
                shareRecord?.accessControls.recipients.some(
                    (recipient) =>
                        recipient.type === "user" &&
                        recipient.id === recipientAccountId,
                ),
            );
            return {
                authorized,
                shareId: shareRecord?.id,
                ownerAccountId: shareRecord?.ownerAccountId,
                resourceType: shareRecord?.resourceType,
                resourceId: shareRecord?.resourceId,
                rejection: authorized,
                recipientAccountId,
            };
        },
    );

    input.ctx.flow.extend(
        "revoke-share-token",
        "delete-token",
        { id: "share-gateway:delete-token" },
        async (stageCtx) => {
            const authorizeResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "authorize-revocation",
                (result) =>
                    Boolean((result as { authorized?: boolean })?.authorized),
            ) as {
                authorized?: boolean;
                shareId?: string;
                ownerAccountId?: string;
                resourceType?: string;
                resourceId?: string;
                rejection?: boolean;
                recipientAccountId?: string;
            } | null;
            if (!authorizeResult?.authorized || !authorizeResult.shareId) {
                return { revoked: false, reason: "share_revoke_rejected" };
            }
            if (
                authorizeResult.rejection &&
                authorizeResult.recipientAccountId
            ) {
                const result = await input.gateway.removeUserRecipient({
                    shareId: authorizeResult.shareId,
                    recipientAccountId: authorizeResult.recipientAccountId,
                });
                return {
                    revoked: result !== "not_found",
                    rejected: result !== "not_found",
                };
            }
            const deleted = await input.gateway.deleteToken({
                shareId: authorizeResult.shareId,
                ownerAccountId: authorizeResult.ownerAccountId,
                resourceType: authorizeResult.resourceType,
                resourceId: authorizeResult.resourceId,
            });
            return { revoked: deleted, rejected: false };
        },
    );

    input.ctx.flow.extend(
        "revoke-share-token",
        "remove-delivery",
        { id: "share-gateway:notify-share-removal" },
        async (stageCtx) => {
            const deletion = getFirstStageResult(
                stageCtx.stageResults,
                "delete-token",
            ) as { revoked?: boolean; rejected?: boolean } | null;
            if (!deletion?.revoked) return { notified: false };
            const flowInput = (stageCtx.input ?? {}) as {
                shareId?: string;
                label?: string;
                ownerAccountId?: string;
                recipientAccountId?: string;
                recipients?: Array<{ type?: string; id?: string }>;
            };
            const dispatch =
                input.ctx.capabilities.get<
                    (notification: Record<string, unknown>) => Promise<unknown>
                >("notify:dispatch");
            if (!dispatch) return { notified: false };
            if (deletion.rejected && flowInput.ownerAccountId) {
                await dispatch({
                    category: "share",
                    recipientUsername: flowInput.ownerAccountId,
                    subject: "A recipient rejected your share",
                    body: `${flowInput.recipientAccountId || "A recipient"} rejected ${flowInput.label || "your shared item"}.`,
                    actionUrl: "/shares",
                    senderName: "Cognis Share",
                    metadata: { shareId: flowInput.shareId },
                });
                return { notified: true };
            }
            const recipients = (flowInput.recipients ?? []).filter(
                (recipient) => recipient.type === "user" && recipient.id,
            );
            await Promise.allSettled(
                recipients.map((recipient) =>
                    dispatch({
                        category: "share",
                        recipientUsername: recipient.id,
                        subject: "A shared item was revoked",
                        body: `${flowInput.label || "A shared item"} is no longer available.`,
                        actionUrl: "/shares",
                        senderName: "Cognis Share",
                        metadata: { shareId: flowInput.shareId },
                    }),
                ),
            );
            return { notified: recipients.length > 0 };
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
