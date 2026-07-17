import {
    getFirstMatchingStageResult,
    getFirstStageResult,
} from "../../../api/reuse/flow-helpers.js";

export function registerWhiteboardShareFlowHooks({
    ctx,
    store,
    profileStore,
    resolveWhiteboardUserAccess,
    resolveShareGuestId,
    whiteboardStylesheets,
}) {
    if (
        !ctx.flow?.exists?.("mint-share-token") ||
        !ctx.flow?.exists?.("resolve-share-token")
    )
        return;
    ctx.flow.extend(
        "mint-share-token",
        "validate-resource",
        { id: "nextcloud-whiteboard:validate-share-resource" },
        async (stageCtx) => {
            const input = stageCtx.input ?? {};
            if (String(input.resourceType ?? "") !== "whiteboard")
                return { valid: false, reason: "unsupported_resource_type" };
            await store.ensureSchema();
            const whiteboard = await store.getWhiteboardById(
                String(input.resourceId ?? ""),
            );
            if (!whiteboard)
                return { valid: false, reason: "resource_not_found" };
            const claims = input.claims ?? {};
            const ownerAccountId = String(
                claims?.sub ?? input.ownerAccountId ?? "",
            );
            const isShareGuest =
                typeof resolveShareGuestId === "function"
                    ? Boolean(resolveShareGuestId(claims))
                    : ownerAccountId.startsWith("share:");
            if (!ownerAccountId || isShareGuest)
                return { valid: false, reason: "account_owner_required" };
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
            });
            if (!access.authorized)
                return { valid: false, reason: "forbidden" };
            return {
                valid: true,
                resourceType: "whiteboard",
                resourceId: whiteboard.id,
                ownerAccountId,
            };
        },
    );
    ctx.flow.extend(
        "mint-share-token",
        "authorize-minter",
        { id: "nextcloud-whiteboard:authorize-share-minter" },
        (stageCtx) => {
            const resourceResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "validate-resource",
                (result) =>
                    result?.valid === true &&
                    result?.resourceType === "whiteboard",
            );
            return resourceResult?.valid
                ? {
                      authorized: true,
                      ownerAccountId: resourceResult.ownerAccountId,
                  }
                : {
                      authorized: false,
                      reason: resourceResult?.reason ?? "invalid_resource",
                  };
        },
    );
    ctx.flow.extend(
        "resolve-share-token",
        "resolve-resource",
        { id: "nextcloud-whiteboard:resolve-share-resource" },
        async (stageCtx) => {
            const tokenResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-token",
            );
            const token = tokenResult?.tokenRecord ?? null;
            if (!tokenResult?.valid || token?.resourceType !== "whiteboard")
                return { resolved: false, reason: "unsupported_resource_type" };
            await store.ensureSchema();
            const whiteboard = await store.getWhiteboardById(
                String(token.resourceId ?? ""),
            );
            if (!whiteboard)
                return { resolved: false, reason: "resource_not_found" };
            return {
                resolved: true,
                resourceType: "whiteboard",
                resourceId: whiteboard.id,
                payload: {
                    whiteboardId: whiteboard.id,
                    title: whiteboard.title,
                },
            };
        },
    );
    ctx.flow.extend(
        "resolve-share-token",
        "check-access",
        { id: "nextcloud-whiteboard:check-share-access" },
        async (stageCtx) => {
            const resourceResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "resolve-resource",
                (result) =>
                    result?.resolved === true &&
                    result?.resourceType === "whiteboard",
            );
            if (!resourceResult?.resolved)
                return {
                    allowed: false,
                    reason: resourceResult?.reason ?? "resource_not_found",
                };
            const requesterClaims = stageCtx.input?.requesterClaims;
            if (requesterClaims?.sub) {
                const directAccess = await resolveWhiteboardUserAccess({
                    claims: requesterClaims,
                    profileStore,
                    store,
                    whiteboardId: resourceResult.resourceId,
                });
                if (directAccess.authorized)
                    return { allowed: true, directAccess: true };
            }
            return { allowed: true };
        },
    );
    if (ctx.flow.exists("construct-share-page")) {
        ctx.flow.extend(
            "construct-share-page",
            "resolve-resource-renderer",
            { id: "nextcloud-whiteboard:share-renderer" },
            (stageCtx) => {
                const input = stageCtx.input ?? {};
                if (String(input.resourceType ?? "") !== "whiteboard")
                    return null;
                return {
                    mountScriptUrl:
                        "/static/modules/nextcloud-whiteboard/app/index.js",
                    stringsBaseUrl: [
                        "/static/modules/nextcloud-whiteboard/languages",
                    ],
                    stylesheetUrls: whiteboardStylesheets,
                };
            },
        );
    }
    if (ctx.flow.exists("revoke-share-token")) {
        ctx.flow.extend(
            "revoke-share-token",
            "authorize-revocation",
            { id: "nextcloud-whiteboard:authorize-share-revocation" },
            async (stageCtx) => {
                const input = stageCtx.input ?? {};
                if (String(input.resourceType ?? "") !== "whiteboard")
                    return {
                        authorized: false,
                        reason: "unsupported_resource_type",
                    };
                await store.ensureSchema();
                const whiteboard = await store.getWhiteboardById(
                    String(input.resourceId ?? ""),
                );
                if (!whiteboard)
                    return { authorized: false, reason: "resource_not_found" };
                const claims = input.claims ?? {};
                const ownerAccountId = String(
                    claims?.sub ?? input.ownerAccountId ?? "",
                );
                const isShareGuest =
                    typeof resolveShareGuestId === "function"
                        ? Boolean(resolveShareGuestId(claims))
                        : ownerAccountId.startsWith("share:");
                if (!ownerAccountId || isShareGuest)
                    return {
                        authorized: false,
                        reason: "account_owner_required",
                    };
                const access = await resolveWhiteboardUserAccess({
                    claims,
                    profileStore,
                    store,
                    whiteboardId: whiteboard.id,
                });
                return access.authorized
                    ? {
                          authorized: true,
                          shareId: String(input.shareId ?? ""),
                          ownerAccountId,
                          resourceType: "whiteboard",
                          resourceId: whiteboard.id,
                      }
                    : { authorized: false, reason: "forbidden" };
            },
        );
    }
}
