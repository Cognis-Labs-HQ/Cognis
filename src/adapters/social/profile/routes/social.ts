import type { IncomingMessage, ServerResponse } from "node:http";
import { requireAuth } from "../../../../api/auth/guard.js";
import type {
    DbProfileStore,
    AccountProfile,
} from "../../../../adapters/db/reuse/profile-store.js";
import { visibilityRank } from "../../../../adapters/db/reuse/profile-store.js";

const SEARCH_RESULTS_LIMIT = 10;

function publicProfile(profile: AccountProfile) {
    return {
        accountId: profile.accountId,
        handle: profile.handle,
        role: profile.role,
        displayName: profile.displayName ?? profile.handle,
        avatarKey: profile.avatarKey,
        visibility: profile.visibility,
    };
}

async function canDiscoverProfile(
    requesterId: string,
    requesterRole: string,
    target: AccountProfile,
): Promise<boolean> {
    if (requesterRole === "admin") return true;
    if (requesterId === target.accountId) return true;
    return target.visibility !== "hidden";
}

async function canFollowProfile(
    requesterId: string,
    requesterRole: string,
    requester: AccountProfile | null,
    target: AccountProfile,
    profileStore: DbProfileStore,
): Promise<boolean> {
    if (requesterRole === "admin") return true;
    if (!requester || requester.visibility === "hidden") return false;
    if (target.visibility === "hidden") return false;
    if (target.visibility === "private") {
        return profileStore.isFollowing(target.accountId, requesterId);
    }
    return true;
}

export function createSocialRoutes(profileStore: DbProfileStore) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const searchMatch = url.pathname === "/api/v1/users/search";
        if (searchMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const query = (url.searchParams.get("q") ?? "")
                .trim()
                .toLowerCase();
            if (!query) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const results = await profileStore.searchProfiles(
                query,
                SEARCH_RESULTS_LIMIT,
            );
            const filtered = results.filter((p) => p.accountId !== claims.sub);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: filtered.map(publicProfile) }));
            return true;
        }

        const relationshipMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/relationship$/,
        );
        if (relationshipMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const handle = decodeURIComponent(relationshipMatch[1]);
            const target = await profileStore.getProfileByHandle(handle);
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const blockedBy = await profileStore.isBlocked(
                target.accountId,
                claims.sub,
            );
            if (blockedBy) {
                // Treat as not-found from the requester's perspective; the blocker
                // must never appear to exist (mirrors follow/followers handlers below).
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const isSelf = claims.sub === target.accountId;
            const canDiscover = await canDiscoverProfile(
                claims.sub,
                claims.role,
                target,
            );
            if (!canDiscover) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const [following, followedBy, blocked, requester] =
                await Promise.all([
                    isSelf
                        ? Promise.resolve(false)
                        : profileStore.isFollowing(
                              claims.sub,
                              target.accountId,
                          ),
                    isSelf
                        ? Promise.resolve(false)
                        : profileStore.isFollowing(
                              target.accountId,
                              claims.sub,
                          ),
                    isSelf
                        ? Promise.resolve(false)
                        : profileStore.isBlocked(claims.sub, target.accountId),
                    profileStore.getProfile(claims.sub),
                ]);
            // Messaging eligibility: neither user is hidden, neither side has
            // blocked the other, and the target accepts community messages.
            // The same predicate gates the message icon in the profile UI.
            const canMessage =
                !isSelf &&
                !blocked &&
                requester?.visibility !== "hidden" &&
                target.visibility !== "hidden" &&
                (target.visibility === "community" || followedBy);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: target.accountId,
                        handle: target.handle,
                        self: isSelf,
                        following,
                        followedBy,
                        blocked,
                        blockedBy: false,
                        canMessage,
                    },
                }),
            );
            return true;
        }

        const followMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/follow$/,
        );
        if (followMatch) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const handle = decodeURIComponent(followMatch[1]);
            const target = await profileStore.getProfileByHandle(handle);
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            if (await profileStore.isBlocked(target.accountId, claims.sub)) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            if (req.method === "POST") {
                if (claims.sub === target.accountId) {
                    res.writeHead(400, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "bad_request",
                                message: "Cannot follow yourself",
                            },
                        }),
                    );
                    return true;
                }
                const requester = await profileStore.getProfile(claims.sub);
                const canDiscover = await canDiscoverProfile(
                    claims.sub,
                    claims.role,
                    target,
                );
                if (!canDiscover) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "User not found",
                            },
                        }),
                    );
                    return true;
                }
                const canFollow = await canFollowProfile(
                    claims.sub,
                    claims.role,
                    requester,
                    target,
                    profileStore,
                );
                if (!canFollow) {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "forbidden",
                                message: "This user cannot be followed",
                            },
                        }),
                    );
                    return true;
                }
                await profileStore.follow(claims.sub, target.accountId);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { following: true } }));
                return true;
            }
            if (req.method === "DELETE") {
                await profileStore.unfollow(claims.sub, target.accountId);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { following: false } }));
                return true;
            }
        }

        const blockMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/block$/,
        );
        if (blockMatch) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const handle = decodeURIComponent(blockMatch[1]);
            const target = await profileStore.getProfileByHandle(handle);
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            if (req.method === "POST") {
                if (claims.sub === target.accountId) {
                    res.writeHead(400, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "bad_request",
                                message: "Cannot block yourself",
                            },
                        }),
                    );
                    return true;
                }
                await profileStore.block(claims.sub, target.accountId);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { blocked: true } }));
                return true;
            }
            if (req.method === "DELETE") {
                await profileStore.unblock(claims.sub, target.accountId);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { blocked: false } }));
                return true;
            }
        }

        const followersMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/followers$/,
        );
        if (followersMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const handle = decodeURIComponent(followersMatch[1]);
            const target = await profileStore.getProfileByHandle(handle);
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            if (await profileStore.isBlocked(target.accountId, claims.sub)) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const canView = await canDiscoverProfile(
                claims.sub,
                claims.role,
                target,
            );
            if (!canView) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const showList =
                claims.role === "admin" ||
                claims.sub === target.accountId ||
                visibilityRank(target.visibility) >=
                    visibilityRank("community") ||
                (await profileStore.isFollowing(claims.sub, target.accountId));
            if (!showList) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const followers = await profileStore.getFollowers(target.accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: followers.map(publicProfile) }));
            return true;
        }

        const followingMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/following$/,
        );
        if (followingMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const handle = decodeURIComponent(followingMatch[1]);
            const target = await profileStore.getProfileByHandle(handle);
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            if (await profileStore.isBlocked(target.accountId, claims.sub)) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const canView = await canDiscoverProfile(
                claims.sub,
                claims.role,
                target,
            );
            if (!canView) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const showList =
                claims.role === "admin" ||
                claims.sub === target.accountId ||
                visibilityRank(target.visibility) >=
                    visibilityRank("community") ||
                (await profileStore.isFollowing(claims.sub, target.accountId));
            if (!showList) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const following = await profileStore.getFollowing(target.accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: following.map(publicProfile) }));
            return true;
        }

        return false;
    };
}
