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
        const actor = { accountId: claims.sub, role: claims.role };
        if (url.pathname === "/api/v1/study/leaderboard/definitions") {
            const definitions = leaderboard.listDefinitions(actor);
            const accessible = (
                await Promise.all(
                    definitions.map(async (definition) =>
                        (await leaderboard.canAccessDefinition(
                            actor,
                            definition.id,
                        ))
                            ? definition
                            : undefined,
                    ),
                )
            ).filter(Boolean);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: accessible }));
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
            const requestedCohortId =
                url.searchParams.get("cohortId") ?? undefined;
            const cohortId =
                requestedCohortId ??
                leaderboard.resolveCohort(actor, definitionId);
            if (
                !(await leaderboard.canAccessDefinition(
                    actor,
                    definitionId,
                    cohortId,
                ))
            ) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: { code: "forbidden" } }));
                return true;
            }
            const locale =
                url.searchParams.get("locale")?.match(/^[A-Za-z]{2,3}/)?.[0] ??
                "en";
            const data = await leaderboard.requestTableModel(
                {
                    definitionId,
                    viewerId: claims.sub,
                    cohortId,
                    seasonId: url.searchParams.get("seasonId") ?? undefined,
                },
                locale,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }
        return false;
    };
}
