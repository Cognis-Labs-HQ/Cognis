import type { IncomingMessage, ServerResponse } from "node:http";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { SocialAdapterBootstrapCtx } from "../../../../gateways/social/gateway.js";
import type { FileStorageGateway } from "../../../../gateways/files/gateway.js";
import type {
    ProfileStore,
    AccountProfile,
    AccountVisibility,
    AccountRole,
} from "../store-contract.js";
import { readRawBody, readJson } from "../../../../api/reuse/read-json.js";
import {
    getFirstStageResult,
    replaceProfileMedia,
    type ProfileMediaMutationResult,
} from "./media-flow-hooks.js";

const VALID_VISIBILITY = new Set<AccountVisibility>([
    "hidden",
    "private",
    "friends",
    "community",
]);

const AVATAR_ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
]);
const BANNER_ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
]);

type SocialAdapterLog = NonNullable<SocialAdapterBootstrapCtx["log"]>;

function profileResponse(
    profile: AccountProfile,
    followerCount: number | null,
    followingCount: number | null,
    postCount: number | null,
) {
    return {
        accountId: profile.accountId,
        handle: profile.handle,
        displayName: profile.displayName,
        role: profile.role,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        avatarKey: profile.avatarKey,
        bannerKey: profile.bannerKey,
        visibility: profile.visibility,
        followerCount,
        followingCount,
        postCount,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    };
}

function hasAdminProfileBypass(
    role: string | null | undefined,
    ctx: RouteContext,
): boolean {
    return Boolean(role && ctx.hasMinRole(role as AccountRole, "admin"));
}

function minimalProfileResponse(profile: AccountProfile) {
    return {
        accountId: profile.accountId,
        handle: profile.handle,
        displayName: null,
        role: null,
        bio: null,
        location: null,
        website: null,
        avatarKey: null,
        bannerKey: null,
        visibility: profile.visibility,
        followerCount: null,
        followingCount: null,
        postCount: null,
        createdAt: null,
        updatedAt: null,
    };
}

async function canDiscoverProfile(
    requesterId: string | null,
    requesterRole: string | null,
    target: AccountProfile,
    ctx: RouteContext,
): Promise<boolean> {
    if (hasAdminProfileBypass(requesterRole, ctx)) return true;
    if (requesterId === target.accountId) return true;
    if (!requesterId) return false;
    return target.visibility !== "hidden";
}

async function canViewFullProfile(
    requesterId: string | null,
    requesterRole: string | null,
    target: AccountProfile,
    profileStore: ProfileStore,
    ctx: RouteContext,
): Promise<boolean> {
    if (hasAdminProfileBypass(requesterRole, ctx)) return true;
    if (requesterId === target.accountId) return true;
    if (!requesterId || target.visibility === "hidden") return false;
    if (target.visibility === "community") return true;
    const [requesterFollowsTarget, targetFollowsRequester] = await Promise.all([
        profileStore.isFollowing(requesterId, target.accountId),
        profileStore.isFollowing(target.accountId, requesterId),
    ]);
    return requesterFollowsTarget && targetFollowsRequester;
}

/**
 * Creates route handlers for the profile API.
 *
 * @param profileStore - The profile storage adapter.
 * @param fileGateway  - Optional file storage gateway. When absent, avatar and
 *   banner mutation routes return `503 file_storage_unavailable` instead of
 *   being unregistered, so callers receive an explicit error rather than a 404.
 * @param isGatewayEnabled - Optional callback returning whether the profile
 *   gateway is currently active. When supplied and returns `false`, the
 *   `/api/v1/social/profile/ping` endpoint returns `503` so callers can detect that
 *   profile functionality is temporarily unavailable.
 */
export function createProfileRoutes(
    profileStore: ProfileStore,
    fileGateway?: FileStorageGateway,
    isGatewayEnabled?: () => boolean,
    log?: SocialAdapterLog,
    onProfileChanged?: (input: {
        accountId: string;
        handle?: string | null;
        displayName?: string | null;
        displayNameChanged?: boolean;
        avatarChanged?: boolean;
    }) => Promise<void>,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const flowApi = ctx.flow;
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = ctx.getAuthClaims(req);
        const logMeta = {
            component: "api-profile",
            method: req.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };

        if (
            url.pathname === "/api/v1/social/profile/ping" &&
            req.method === "GET"
        ) {
            if (!ctx.requireAuth(req, res, "user")) return true;
            if (isGatewayEnabled && !isGatewayEnabled()) {
                log?.(
                    "warn",
                    "Profile ping failed because the gateway is disabled.",
                    logMeta,
                );
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "gateway_disabled",
                            message: "Profile gateway is disabled",
                        },
                    }),
                );
                return true;
            }
            log?.("debug", "Profile ping succeeded.", logMeta);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { available: true } }));
            return true;
        }

        if (url.pathname === "/api/v1/social/profile" && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "user")) return true;
            let profile = await profileStore.getProfile(claims!.sub);
            if (!profile) {
                profile = await profileStore.createProfile(
                    claims!.sub,
                    claims!.sub,
                    (claims!.role as AccountRole) ?? "user",
                );
                log?.(
                    "info",
                    "Auto-created profile for authenticated account.",
                    {
                        ...logMeta,
                        targetAccountId: claims!.sub,
                    },
                );
            }
            if (!profile) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Profile not found",
                        },
                    }),
                );
                return true;
            }
            const [followerCount, followingCount, posts] = await Promise.all([
                profileStore.getFollowerCount(profile.accountId),
                profileStore.getFollowingCount(profile.accountId),
                profileStore.getPostsByAccount(profile.accountId),
            ]);
            log?.("debug", "Read own profile.", {
                ...logMeta,
                targetAccountId: profile.accountId,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: profileResponse(
                        profile,
                        followerCount,
                        followingCount,
                        posts.length,
                    ),
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/social/profile" &&
            req.method === "PATCH"
        ) {
            if (!ctx.requireAuth(req, res, "user")) return true;
            const body = await readJson(req);
            const updates: Parameters<typeof profileStore.updateProfile>[1] =
                {};
            if ("bio" in body)
                updates.bio = body.bio != null ? String(body.bio) : null;
            if ("location" in body)
                updates.location =
                    body.location != null ? String(body.location) : null;
            if ("website" in body)
                updates.website =
                    body.website != null ? String(body.website) : null;
            if ("displayName" in body)
                updates.displayName =
                    body.displayName != null ? String(body.displayName) : null;
            if ("visibility" in body) {
                const visibility = String(body.visibility);
                if (!VALID_VISIBILITY.has(visibility as AccountVisibility)) {
                    log?.(
                        "warn",
                        "Rejected profile update with invalid visibility.",
                        {
                            ...logMeta,
                            visibility,
                        },
                    );
                    res.writeHead(400, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "bad_request",
                                message: `Invalid visibility: ${visibility}`,
                            },
                        }),
                    );
                    return true;
                }
                if (
                    claims?.role === "teacher" &&
                    (visibility === "hidden" || visibility === "private")
                ) {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "teacher_visibility_incompatible",
                                message:
                                    "Teacher accounts must use friends or community visibility",
                            },
                        }),
                    );
                    return true;
                }
                updates.visibility = visibility as AccountVisibility;
            }
            const updated = await profileStore.updateProfile(
                claims!.sub,
                updates,
            );
            if (updated) {
                await onProfileChanged?.({
                    accountId: updated.accountId,
                    handle: updated.handle,
                    displayName: updated.displayName,
                    displayNameChanged: Object.prototype.hasOwnProperty.call(
                        updates,
                        "displayName",
                    ),
                });
            }
            log?.("info", "Updated profile.", {
                ...logMeta,
                changedFields: Object.keys(updates),
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: updated }));
            return true;
        }

        if (
            url.pathname === "/api/v1/social/profile/avatar" &&
            req.method === "PUT"
        ) {
            if (!ctx.requireAuth(req, res, "user")) return true;
            if (!fileGateway) {
                log?.(
                    "warn",
                    "Avatar upload failed because file storage is unavailable.",
                    logMeta,
                );
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "file_storage_unavailable",
                            message: "File storage is not configured.",
                        },
                    }),
                );
                return true;
            }
            const mime = (req.headers["content-type"] ?? "")
                .split(";")[0]
                .trim()
                .toLowerCase();
            if (!AVATAR_ALLOWED_MIME.has(mime)) {
                log?.(
                    "warn",
                    "Rejected avatar upload with unsupported media type.",
                    {
                        ...logMeta,
                        mime,
                    },
                );
                res.writeHead(415, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unsupported_media_type",
                            message: "Avatar must be jpeg, png, or webp",
                        },
                    }),
                );
                return true;
            }
            const maxBytes = await profileStore.getFileSizeLimit("image");
            const body = await readRawBody(req);
            if (body.length > maxBytes) {
                log?.(
                    "warn",
                    "Rejected avatar upload that exceeded the size limit.",
                    {
                        ...logMeta,
                        mime,
                        sizeBytes: body.length,
                        maxBytes,
                    },
                );
                res.writeHead(413, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "payload_too_large",
                            message: `Avatar exceeds ${maxBytes} byte limit`,
                        },
                    }),
                );
                return true;
            }
            let updated: AccountProfile | null | undefined;
            let storedKey: string | undefined;
            if (flowApi.exists("upload-profile-media")) {
                const flowResult = await flowApi.run("upload-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "avatarKey",
                    content: body,
                    contentType: mime,
                });
                const persistResult =
                    getFirstStageResult<ProfileMediaMutationResult>(
                        flowResult,
                        "persist-media",
                    );
                if (persistResult?.reason === "profile_not_found") {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Profile not found",
                            },
                        }),
                    );
                    return true;
                }
                if (persistResult?.persisted && persistResult.storedKey) {
                    updated = persistResult.updated ?? null;
                    storedKey = persistResult.storedKey;
                } else {
                    const fallbackReason = !persistResult
                        ? "missing_persist_result"
                        : !persistResult.persisted
                          ? (persistResult.reason ?? "persist_failed")
                          : "missing_stored_key";
                    log?.(
                        "warn",
                        "Avatar upload flow did not persist media; falling back to direct persistence.",
                        {
                            ...logMeta,
                            reason: fallbackReason,
                        },
                    );
                }
            }
            if (!storedKey) {
                const result = await replaceProfileMedia(
                    profileStore,
                    fileGateway,
                    claims!.sub,
                    "avatarKey",
                    body,
                    mime,
                    (error, previousKey) => {
                        log?.(
                            "warn",
                            "Failed to delete replaced avatar file.",
                            {
                                ...logMeta,
                                accountId: claims!.sub,
                                previousKey,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    },
                );
                if (!result) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Profile not found",
                            },
                        }),
                    );
                    return true;
                }
                updated = result.updated;
                storedKey = result.storedKey;
                await onProfileChanged?.({
                    accountId: updated.accountId,
                    handle: updated.handle,
                    displayName: updated.displayName,
                    avatarChanged: true,
                });
            }
            log?.("info", "Uploaded avatar.", {
                ...logMeta,
                mime,
                sizeBytes: body.length,
                avatarKey: storedKey ?? null,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        avatarKey: storedKey ?? null,
                        profile: updated ?? null,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/social/profile/avatar" &&
            req.method === "DELETE"
        ) {
            if (!ctx.requireAuth(req, res, "user")) return true;
            if (!fileGateway) {
                log?.(
                    "warn",
                    "Avatar deletion failed because file storage is unavailable.",
                    logMeta,
                );
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "file_storage_unavailable",
                            message: "File storage is not configured.",
                        },
                    }),
                );
                return true;
            }
            const profile = await profileStore.getProfile(claims!.sub);
            if (flowApi.exists("remove-profile-media")) {
                const flowResult = await flowApi.run("remove-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "avatarKey",
                });
                const persistResult =
                    getFirstStageResult<ProfileMediaMutationResult>(
                        flowResult,
                        "persist-removal",
                    );
                if (persistResult?.reason === "profile_not_found") {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Profile not found",
                            },
                        }),
                    );
                    return true;
                }
                if (!persistResult?.persisted) {
                    res.writeHead(500, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "remove_failed",
                                message: "Failed to remove avatar.",
                            },
                        }),
                    );
                    return true;
                }
            } else {
                if (profile?.avatarKey)
                    await fileGateway.delete(profile.avatarKey);
                const updated = await profileStore.updateProfile(claims!.sub, {
                    avatarKey: null,
                });
                if (updated) {
                    await onProfileChanged?.({
                        accountId: updated.accountId,
                        handle: updated.handle,
                        displayName: updated.displayName,
                        avatarChanged: true,
                    });
                }
            }
            log?.("info", "Removed avatar.", {
                ...logMeta,
                avatarKey: profile?.avatarKey ?? null,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { removed: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/social/profile/banner" &&
            req.method === "PUT"
        ) {
            if (!ctx.requireAuth(req, res, "user")) return true;
            if (!fileGateway) {
                log?.(
                    "warn",
                    "Banner upload failed because file storage is unavailable.",
                    logMeta,
                );
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "file_storage_unavailable",
                            message: "File storage is not configured.",
                        },
                    }),
                );
                return true;
            }
            const mime = (req.headers["content-type"] ?? "")
                .split(";")[0]
                .trim()
                .toLowerCase();
            if (!BANNER_ALLOWED_MIME.has(mime)) {
                log?.(
                    "warn",
                    "Rejected banner upload with unsupported media type.",
                    {
                        ...logMeta,
                        mime,
                    },
                );
                res.writeHead(415, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unsupported_media_type",
                            message: "Banner must be jpeg, png, webp, or gif",
                        },
                    }),
                );
                return true;
            }
            const maxBytes = await profileStore.getFileSizeLimit("image");
            const body = await readRawBody(req);
            if (body.length > maxBytes) {
                log?.(
                    "warn",
                    "Rejected banner upload that exceeded the size limit.",
                    {
                        ...logMeta,
                        mime,
                        sizeBytes: body.length,
                        maxBytes,
                    },
                );
                res.writeHead(413, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "payload_too_large",
                            message: `Banner exceeds ${maxBytes} byte limit`,
                        },
                    }),
                );
                return true;
            }
            let updated: AccountProfile | null | undefined;
            let storedKey: string | undefined;
            if (flowApi.exists("upload-profile-media")) {
                const flowResult = await flowApi.run("upload-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "bannerKey",
                    content: body,
                    contentType: mime,
                });
                const persistResult =
                    getFirstStageResult<ProfileMediaMutationResult>(
                        flowResult,
                        "persist-media",
                    );
                if (persistResult?.reason === "profile_not_found") {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Profile not found",
                            },
                        }),
                    );
                    return true;
                }
                if (persistResult?.persisted && persistResult.storedKey) {
                    updated = persistResult.updated ?? null;
                    storedKey = persistResult.storedKey;
                } else {
                    const fallbackReason = !persistResult
                        ? "missing_persist_result"
                        : !persistResult.persisted
                          ? (persistResult.reason ?? "persist_failed")
                          : "missing_stored_key";
                    log?.(
                        "warn",
                        "Banner upload flow did not persist media; falling back to direct persistence.",
                        {
                            ...logMeta,
                            reason: fallbackReason,
                        },
                    );
                }
            }
            if (!storedKey) {
                const result = await replaceProfileMedia(
                    profileStore,
                    fileGateway,
                    claims!.sub,
                    "bannerKey",
                    body,
                    mime,
                    (error, previousKey) => {
                        log?.(
                            "warn",
                            "Failed to delete replaced banner file.",
                            {
                                ...logMeta,
                                accountId: claims!.sub,
                                previousKey,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    },
                );
                if (!result) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Profile not found",
                            },
                        }),
                    );
                    return true;
                }
                updated = result.updated;
                storedKey = result.storedKey;
            }
            log?.("info", "Uploaded banner.", {
                ...logMeta,
                mime,
                sizeBytes: body.length,
                bannerKey: storedKey ?? null,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        bannerKey: storedKey ?? null,
                        profile: updated ?? null,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/social/profile/banner" &&
            req.method === "DELETE"
        ) {
            if (!ctx.requireAuth(req, res, "user")) return true;
            if (!fileGateway) {
                log?.(
                    "warn",
                    "Banner deletion failed because file storage is unavailable.",
                    logMeta,
                );
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "file_storage_unavailable",
                            message: "File storage is not configured.",
                        },
                    }),
                );
                return true;
            }
            const profile = await profileStore.getProfile(claims!.sub);
            if (flowApi.exists("remove-profile-media")) {
                const flowResult = await flowApi.run("remove-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "bannerKey",
                });
                const persistResult =
                    getFirstStageResult<ProfileMediaMutationResult>(
                        flowResult,
                        "persist-removal",
                    );
                if (persistResult?.reason === "profile_not_found") {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Profile not found",
                            },
                        }),
                    );
                    return true;
                }
                if (!persistResult?.persisted) {
                    res.writeHead(500, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "remove_failed",
                                message: "Failed to remove banner.",
                            },
                        }),
                    );
                    return true;
                }
            } else {
                if (profile?.bannerKey)
                    await fileGateway.delete(profile.bannerKey);
                await profileStore.updateProfile(claims!.sub, {
                    bannerKey: null,
                });
            }
            log?.("info", "Removed banner.", {
                ...logMeta,
                bannerKey: profile?.bannerKey ?? null,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { removed: true } }));
            return true;
        }

        const publicProfileMatch = url.pathname.match(
            /^\/api\/v1\/social\/users\/([^/]+)\/profile$/,
        );
        if (publicProfileMatch && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "user")) return true;
            const handle = decodeURIComponent(publicProfileMatch[1]);
            const target = await profileStore.getProfileByHandle(handle);
            if (!target) {
                log?.("debug", "Public profile lookup returned no profile.", {
                    ...logMeta,
                    targetHandle: handle,
                });
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Profile not found",
                        },
                    }),
                );
                return true;
            }
            if (
                !hasAdminProfileBypass(claims!.role, ctx) &&
                (await profileStore.isBlocked(target.accountId, claims!.sub))
            ) {
                log?.("debug", "Public profile lookup was blocked.", {
                    ...logMeta,
                    targetHandle: handle,
                    targetAccountId: target.accountId,
                });
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Profile not found",
                        },
                    }),
                );
                return true;
            }
            const visible = await canDiscoverProfile(
                claims!.sub,
                claims!.role,
                target,
                ctx,
            );
            if (!visible) {
                log?.(
                    "debug",
                    "Public profile lookup was hidden by visibility rules.",
                    {
                        ...logMeta,
                        targetHandle: handle,
                        targetAccountId: target.accountId,
                    },
                );
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Profile not found",
                        },
                    }),
                );
                return true;
            }
            const showDetails = await canViewFullProfile(
                claims!.sub,
                claims!.role,
                target,
                profileStore,
                ctx,
            );
            const [followerCount, followingCount, posts] = showDetails
                ? await Promise.all([
                      profileStore.getFollowerCount(target.accountId),
                      profileStore.getFollowingCount(target.accountId),
                      profileStore.getPostsByAccount(target.accountId),
                  ])
                : [null, null, []];
            log?.("debug", "Read public profile.", {
                ...logMeta,
                targetHandle: handle,
                targetAccountId: target.accountId,
                showDetails,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: showDetails
                        ? profileResponse(
                              target,
                              followerCount,
                              followingCount,
                              posts.length,
                          )
                        : minimalProfileResponse(target),
                }),
            );
            return true;
        }

        return false;
    };
}
