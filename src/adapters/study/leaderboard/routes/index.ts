import type { RouteContext } from "../../../../../api/reuse/route-context.js";
import type { LeaderboardCapability } from "../types.js";

export function createLeaderboardRoutes(
    leaderboard: LeaderboardCapability,
    routeContext: RouteContext | undefined,
) {
    if (!routeContext) throw new Error("route_context_missing");
    return async (req: any, res: any, url: URL) => {
        if (req.method !== "GET") return false;
        const claims = routeContext.getAuthClaims(req);
        if (!claims || !routeContext.requireAuth(req, res, "user")) return true;
        if (url.pathname === "/api/v1/study/leaderboard/definitions") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: leaderboard.listDefinitions() }));
            return true;
        }
        if (url.pathname === "/api/v1/study/leaderboard/standings") {
            const definitionId = url.searchParams.get("definitionId") ?? "";
            if (!definitionId) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({ error: { code: "definition_required" } }),
                );
                return true;
            }
            const data = await leaderboard.requestTableModel(
                {
                    definitionId,
                    viewerId: claims.sub,
                    cohortId: url.searchParams.get("cohortId") ?? undefined,
                    seasonId: url.searchParams.get("seasonId") ?? undefined,
                },
                "en",
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }
        return false;
    };
}
