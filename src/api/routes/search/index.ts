/**
 * Global search route.
 *
 * Endpoints:
 *   GET /api/v1/search?q=...&type=...
 *     Requires auth. Searches across users.
 *     If type=users, returns only user results as a flat array.
 *     Otherwise returns grouped results by category (Users only from server;
 *     settings and other static categories are searched client-side).
 *
 * @module api/routes/search
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";

interface SearchResultItem {
    id: string;
    label: string;
    url?: string;
    meta?: string;
}

interface SearchResultGroup {
    category: string;
    items: SearchResultItem[];
}

type ProfileSearchFn = (
    query: string,
    limit: number,
    options?: { includeHidden?: boolean; requesterAccountId?: string },
) => Promise<
    Array<{
        accountId?: string;
        handle?: string;
        displayName?: string;
        avatarKey?: string | null;
    }>
>;

export function createSearchRoutes(
    searchProfiles?: ProfileSearchFn,
    routeContext?: RouteContext,
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== "/api/v1/search" || req.method !== "GET") {
            return false;
        }

        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;

        const query = (url.searchParams.get("q") ?? "").trim();
        const typeFilter = url.searchParams.get("type") ?? "";
        const includeHiddenProfiles = ctx.hasMinRole(claims.role, "admin");

        if (!query) {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: [] }));
            return true;
        }

        if (typeFilter === "users") {
            let userItems: SearchResultItem[] = [];
            if (searchProfiles) {
                try {
                    const profiles = await searchProfiles(query, 10, {
                        includeHidden: includeHiddenProfiles,
                        requesterAccountId: claims.sub,
                    });
                    userItems = profiles.map(
                        (profile) =>
                            ({
                                id: profile.handle ?? profile.accountId ?? "",
                                label:
                                    profile.displayName ??
                                    profile.handle ??
                                    profile.accountId ??
                                    "",
                                url: profile.handle
                                    ? `/profile/${encodeURIComponent(profile.handle)}`
                                    : undefined,
                                meta:
                                    profile.handle ??
                                    profile.accountId ??
                                    undefined,
                                accountId: profile.accountId,
                                handle: profile.handle,
                                displayName: profile.displayName,
                                avatarKey: profile.avatarKey ?? null,
                            }) as SearchResultItem & {
                                accountId?: string;
                                handle?: string;
                                displayName?: string;
                                avatarKey?: string | null;
                            },
                    );
                } catch {
                    // search failure is silent
                }
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: userItems }));
            return true;
        }

        const groups: SearchResultGroup[] = [];

        if (searchProfiles) {
            try {
                const profiles = await searchProfiles(query, 5, {
                    includeHidden: includeHiddenProfiles,
                    requesterAccountId: claims.sub,
                });
                if (profiles.length > 0) {
                    groups.push({
                        category: "Users",
                        items: profiles.map((profile) => ({
                            id: profile.handle ?? profile.accountId ?? "",
                            label:
                                profile.displayName ??
                                profile.handle ??
                                profile.accountId ??
                                "",
                            url: profile.handle
                                ? `/profile/${encodeURIComponent(profile.handle)}`
                                : undefined,
                            meta: profile.accountId ?? profile.handle,
                        })),
                    });
                }
            } catch {
                // search failure is silent
            }
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: groups }));
        return true;
    };
}
