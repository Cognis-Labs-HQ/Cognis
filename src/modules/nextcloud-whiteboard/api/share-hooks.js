import {
    getFirstMatchingStageResult,
    getFirstStageResult,
} from "../../../api/reuse/flow-helpers.js";

export function registerWhiteboardShareFlowHooks({
    ctx,
    store,
    profileStore,
    resolveWhiteboardUserAccess,
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
            const access = await resolveWhiteboardUserAccess({
                claims: input.claims ?? {},
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
                ownerAccountId: String(
                    input.claims?.sub ?? input.ownerAccountId ?? "",
                ),
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
        (stageCtx) => {
            const resourceResult = getFirstMatchingStageResult(
                stageCtx.stageResults,
                "resolve-resource",
                (result) =>
                    result?.resolved === true &&
                    result?.resourceType === "whiteboard",
            );
            return resourceResult?.resolved
                ? { allowed: true }
                : {
                      allowed: false,
                      reason: resourceResult?.reason ?? "resource_not_found",
                  };
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
                const access = await resolveWhiteboardUserAccess({
                    claims: input.claims ?? {},
                    profileStore,
                    store,
                    whiteboardId: whiteboard.id,
                });
                return access.authorized
                    ? {
                          authorized: true,
                          shareId: String(input.shareId ?? ""),
                          ownerAccountId: String(
                              input.claims?.sub ?? input.ownerAccountId ?? "",
                          ),
                          resourceType: "whiteboard",
                          resourceId: whiteboard.id,
                      }
                    : { authorized: false, reason: "forbidden" };
            },
        );
    }
}
