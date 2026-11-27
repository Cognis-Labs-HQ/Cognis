import type { IncomingMessage } from "node:http";
import type { BootstrapLog, LocalAccountStore } from "@cognis/core";
import type { RouteContext } from "../../reuse/route-context.js";

function getCookieAccessToken(request: IncomingMessage): string | null {
    const cookie = request.headers.cookie ?? "";
    const match = cookie.match(/(?:^|; )cognis_access_token=([^;]+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
}

export async function resolveLoginRedirectLocation(
    request: IncomingMessage,
    routeContext: RouteContext,
    accountStore?: LocalAccountStore,
    log?: BootstrapLog,
): Promise<string> {
    const cookieToken = getCookieAccessToken(request);
    const session = routeContext.getCookieSession(request);
    if (!cookieToken) return "/login";

    const tokenInfo = routeContext.lookupAccessToken(cookieToken);
    const accountId = session?.sub ?? tokenInfo?.sub ?? null;
    if (
        accountId &&
        accountStore &&
        typeof accountStore.getInfo === "function"
    ) {
        const info = await accountStore.getInfo(accountId).catch((error) => {
            log?.(
                "error",
                "Failed to read account info while resolving login redirect.",
                {
                    component: "api-ui",
                    accountId,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
            return null;
        });
        if (!info) return "/login?reason=account_deleted";
        if (info.enabled === false) return "/login?reason=account_disabled";
    }

    if (!session || !tokenInfo || tokenInfo.revoked) {
        return "/login?reason=session_expired";
    }
    if (!accountStore || typeof accountStore.getInfo !== "function") return "";
    const info = await accountStore.getInfo(session.sub).catch((error) => {
        log?.(
            "error",
            "Failed to read active session account info while resolving login redirect.",
            {
                component: "api-ui",
                accountId: session.sub,
                error: error instanceof Error ? error.message : String(error),
            },
        );
        return null;
    });
    if (!info) return "/login?reason=account_deleted";
    if (info.enabled === false) return "/login?reason=account_disabled";
    return "";
}
