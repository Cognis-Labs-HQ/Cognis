import type { IncomingMessage, ServerResponse } from "node:http";
import { hasMinRole } from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { DbProfileStore, AccountProfile } from "../store.js";
import { visibilityRank } from "../store.js";
import { createFollowersCapability } from "../followers.js";

const SEARCH_RESULTS_LIMIT = 10;
const SOCIAL_NOTIFICATION_CATEGORY = "social";

export interface SocialNotificationDispatcher {
    (envelope: {
        category: string;
        recipientUsername: string;
        subject: string;
        body: string;
        senderName?: string;
        actionUrl?: string;
        metadata?: Record<string, unknown>;
    }): Promise<unknown>;
}

export interface SocialRoutesOptions {
    dispatchNotification?: SocialNotificationDispatcher;
}

function hasAdminBypass(role: string | null | undefined): boolean {
    return Boolean(role && hasMinRole(role, "admin"));
}

function isProfileInteractive(profile: AccountProfile): boolean {
    return profile.lifecycleState === "active";
}

function publicProfile(profile: AccountProfile) {
    return {
        accountId: profile.accountId,
        handle: profile.handle,
        role: profile.role,
        displayName: profile.displayName ?? profile.handle,
        avatarKey: profile.avatarKey,
        visibility: profile.visibility,
        lifecycleState: profile.lifecycleState,
    };
}

async function canDiscoverProfile(
    requesterId: string,
    requesterRole: string,
    target: AccountProfile,
): Promise<boolean> {
    if (hasAdminBypass(requesterRole)) return true;
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
    if (!isProfileInteractive(target)) return false;
    if (
        !requester ||
        requester.lifecycleState !== "active" ||
        visibilityRank(requester.visibility) < visibilityRank("private")
    ) {
        return false;
    }
    if (hasAdminBypass(requesterRole)) return true;
    if (target.visibility === "hidden") return false;
    if (target.visibility === "private") {
        return profileStore.isFollowing(target.accountId, requesterId);
    }
    return true;
}

async function ensureRequesterProfile(
    profileStore: DbProfileStore,
    accountId: string,
    role: string,
): Promise<AccountProfile | null> {
    const existingProfile = await profileStore.getProfile(accountId);
    if (existingProfile) return existingProfile;

    const recreatedProfile = await profileStore.createProfile(
        accountId,
        accountId,
        role as AccountProfile["role"],
    );
    if (!recreatedProfile) return null;

    return (
        (await profileStore.updateProfile(accountId, {
            visibility: "private",
        })) ?? recreatedProfile
    );
}

export function createSocialRoutes(
    profileStore: DbProfileStore,
    routeContext?: RouteContext,
    options: SocialRoutesOptions = {},
) {
    const ctx = resolveRouteContext(routeContext);
    const followers = createFollowersCapability(profileStore);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const searchMatch = url.pathname === "/api/v1/social/users/search";
        if (searchMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
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
                {
                    includeHidden: hasAdminBypass(claims.role),
                    requesterAccountId: claims.sub,
                },
            );
            const filtered = results.filter((p) => p.accountId !== claims.sub);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: filtered.map(publicProfile) }));
            return true;
        }

        const relationshipMatch = url.pathname.match(
            /^\/api\/v1\/social\/users\/([^/]+)\/relationship$/,
        );
        if (relationshipMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
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
            // Messaging eligibility: direct DM requires mutual follow; when not
            // mutual but otherwise eligible, users can send a message request.
            const followsTarget = await profileStore.isFollowing(
                claims.sub,
                target.accountId,
            );
            const hasBypass = hasAdminBypass(claims.role);
            const targetInteractive = isProfileInteractive(target);
            const requesterInteractive = requester?.lifecycleState === "active";
            const canSendMessageRequest =
                !isSelf &&
                targetInteractive &&
                requesterInteractive &&
                (hasBypass ||
                    (!blocked &&
                        requester?.visibility !== "hidden" &&
                        target.visibility !== "hidden"));
            const canMessage =
                canSendMessageRequest &&
                (hasBypass || (followsTarget && followedBy));
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
                        canSendMessageRequest,
                        requiresMessageRequest:
                            canSendMessageRequest && !canMessage,
                    },
                }),
            );
            return true;
        }

        const followMatch = url.pathname.match(
            /^\/api\/v1\/social\/users\/([^/]+)\/followers$/,
        );
        if (followMatch) {
            const claims = ctx.requireAuth(req, res, "user");
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
            if (req.method === "POST") {
                if (!isProfileInteractive(target)) {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "account_not_interactive",
                                message:
                                    "This account is not accepting interactions",
                            },
                        }),
                    );
                    return true;
                }
                if (
                    await profileStore.isBlocked(target.accountId, claims.sub)
                ) {
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
                const requester = await ensureRequesterProfile(
                    profileStore,
                    claims.sub,
                    claims.role,
                );
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
                await followers.add({
                    followerAccountId: claims.sub,
                    followedAccountId: target.accountId,
                });
                if (options.dispatchNotification) {
                    const followerName =
                        requester?.displayName ??
                        requester?.handle ??
                        claims.sub;
                    await options.dispatchNotification({
                        category: SOCIAL_NOTIFICATION_CATEGORY,
                        recipientUsername: target.handle,
                        subject: "New follower",
                        body: `${followerName} started following you.`,
                        senderName: "Cognis Social",
                        actionUrl: `/profile/${encodeURIComponent(requester?.handle ?? claims.sub)}`,
                        metadata: {
                            class: SOCIAL_NOTIFICATION_CATEGORY,
                            type: "follow",
                            followerAccountId: claims.sub,
                            followerHandle: requester?.handle ?? claims.sub,
                            targetAccountId: target.accountId,
                            targetHandle: target.handle,
                        },
                    });
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { following: true } }));
                return true;
            }
            if (req.method === "DELETE") {
                await followers.remove({
                    followerAccountId: claims.sub,
                    followedAccountId: target.accountId,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { following: false } }));
                return true;
            }
        }

        const blockMatch = url.pathname.match(
            /^\/api\/v1\/social\/users\/([^/]+)\/block$/,
        );
        if (blockMatch) {
            const claims = ctx.requireAuth(req, res, "user");
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
                if (!isProfileInteractive(target)) {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "account_not_interactive",
                                message:
                                    "This account is not accepting interactions",
                            },
                        }),
                    );
                    return true;
                }
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
            /^\/api\/v1\/social\/users\/([^/]+)\/followers$/,
        );
        if (followersMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
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
                hasAdminBypass(claims.role) ||
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
            /^\/api\/v1\/social\/users\/([^/]+)\/following$/,
        );
        if (followingMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
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
                hasAdminBypass(claims.role) ||
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
