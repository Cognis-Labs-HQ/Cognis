import type { GatewayBootstrapContext } from "../../shared.js";
import {
    SHARE_FLOW_CATALOG,
    CTX_CAPABILITY,
    registerCanonicalFlow,
} from "@cognis/core";
import type { CoreShareGateway } from "../gateway/index.js";

function firstStageResult<T>(
    stageResults: Record<string, unknown[]>,
    stageId: string,
): T | null {
    const results = stageResults[stageId] as T[] | undefined;
    return results?.[0] ?? null;
}

export async function registerShareBootstrapHooks(input: {
    ctx: GatewayBootstrapContext;
    gateway: CoreShareGateway;
}): Promise<void> {
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

    input.ctx.flow.extend(
        "mint-share-token",
        "issue-token",
        { id: "share-gateway:issue-token" },
        async (stageCtx) => {
            const resourceResult = firstStageResult<{
                valid?: boolean;
                resourceType?: string;
                resourceId?: string;
                ownerAccountId?: string;
            }>(stageCtx.stageResults, "validate-resource");
            const authorizeResult = firstStageResult<{
                authorized?: boolean;
                ownerAccountId?: string;
            }>(stageCtx.stageResults, "authorize-minter");
            if (!resourceResult?.valid || !authorizeResult?.authorized) {
                return { minted: false, reason: "share_mint_rejected" };
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
            const issued = firstStageResult<{
                minted?: boolean;
                shareRecord?: unknown;
            }>(stageCtx.stageResults, "issue-token");
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
        "build-payload",
        { id: "share-gateway:build-payload" },
        async (stageCtx) => {
            const tokenResult = firstStageResult<{
                valid?: boolean;
                tokenRecord?: Record<string, unknown>;
            }>(stageCtx.stageResults, "validate-token");
            const resourceResult = firstStageResult<{
                resolved?: boolean;
                resourceType?: string;
                resourceId?: string;
                payload?: Record<string, unknown>;
            }>(stageCtx.stageResults, "resolve-resource");
            const accessResult = firstStageResult<{
                allowed?: boolean;
                reason?: string;
            }>(stageCtx.stageResults, "check-access");
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
            const authorizeResult = firstStageResult<{
                authorized?: boolean;
                shareId?: string;
                ownerAccountId?: string;
                resourceType?: string;
                resourceId?: string;
            }>(stageCtx.stageResults, "authorize-revocation");
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
            showTopbar: false,
            showNavbar: false,
            showFooter: false,
            showThemeToggle: true,
            frameless: true,
            stringsBaseUrl: ["/static/gateways/share/languages"],
        }),
    );
}
