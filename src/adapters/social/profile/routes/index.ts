import type { IncomingMessage, ServerResponse } from "node:http";
import {
    hasMinRole,
    type BootstrapLog,
    type FileStorageGateway,
    type FlowApi,
    type FlowRunResult,
} from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type {
    ProfileStore,
    AccountProfile,
    AccountVisibility,
    AccountRole,
} from "../profile-store.js";
import { readRawBody, readJson } from "../../../../api/reuse/read-json.js";

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
type ProfileMediaKey = "avatarKey" | "bannerKey";

type ProfileMediaMutationResult = {
    persisted: boolean;
    removed?: boolean;
    updated?: AccountProfile | null;
    storedKey?: string;
    reason?: string;
};

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

function hasAdminProfileBypass(role: string | null | undefined): boolean {
    return Boolean(role && hasMinRole(role as AccountRole, "admin"));
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
): Promise<boolean> {
    if (hasAdminProfileBypass(requesterRole)) return true;
    if (requesterId === target.accountId) return true;
    if (!requesterId) return false;
    return target.visibility !== "hidden";
}

async function canViewFullProfile(
    requesterId: string | null,
    requesterRole: string | null,
    target: AccountProfile,
    profileStore: ProfileStore,
): Promise<boolean> {
    if (hasAdminProfileBypass(requesterRole)) return true;
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
 * Stores replacement media and updates profile key atomically from the caller's perspective.
 * If profile persistence fails, the newly stored object is rolled back.
 * If deleting the previously referenced object fails, the update still succeeds and the
 * optional callback is invoked so callers can log/observe cleanup failures.
 */
async function replaceProfileMedia(
    profileStore: ProfileStore,
    fileGateway: FileStorageGateway,
    accountId: string,
    key: ProfileMediaKey,
    content: Uint8Array,
    contentType: string,
    onPreviousDeleteError?: (error: unknown, previousKey: string) => void,
): Promise<{ updated: AccountProfile; storedKey: string } | null> {
    const existing = await profileStore.getProfile(accountId);
    if (!existing) return null;
    const previousKey = existing[key];
    const stored = await fileGateway.store(accountId, content, contentType);
    let updated: AccountProfile | null = null;
    try {
        updated = await profileStore.updateProfile(accountId, {
            [key]: stored.key,
        } as Partial<Pick<AccountProfile, ProfileMediaKey>>);
    } catch (error) {
        await fileGateway.delete(stored.key);
        throw error;
    }
    if (!updated) {
        await fileGateway.delete(stored.key);
        return null;
    }
    if (previousKey && previousKey !== stored.key) {
        try {
            await fileGateway.delete(previousKey);
        } catch (error) {
            onPreviousDeleteError?.(error, previousKey);
        }
    }
    return { updated, storedKey: stored.key };
}

function getFirstStageResult<T>(
    flowResult: FlowRunResult,
    stageId: string,
): T | undefined {
    const stageResults = flowResult.stageResults[stageId];
    if (!Array.isArray(stageResults) || stageResults.length === 0) {
        return undefined;
    }
    return stageResults[0] as T;
}

export function registerProfileMediaFlowHooks(input: {
    flow: FlowApi;
    profileStore: ProfileStore;
    fileGateway: FileStorageGateway;
    log?: BootstrapLog;
    onProfileChanged?: (payload: {
        accountId: string;
        handle?: string | null;
        displayName?: string | null;
        displayNameChanged?: boolean;
        avatarChanged?: boolean;
    }) => Promise<void>;
}): void {
    const { flow, profileStore, fileGateway, log, onProfileChanged } = input;

    if (flow.exists("upload-profile-media")) {
        flow.extend(
            "upload-profile-media",
            "persist-media",
            { id: "social-profile-adapter:persist-profile-media" },
            async (stageCtx) => {
                const payload = stageCtx.input as {
                    accountId?: unknown;
                    mediaField?: unknown;
                    content?: unknown;
                    contentType?: unknown;
                };
                const accountId = String(payload.accountId ?? "");
                const mediaField = String(payload.mediaField ?? "");
                const contentType = String(payload.contentType ?? "");
                const content = payload.content;

                if (!accountId || !contentType || !(content instanceof Uint8Array)) {
                    return {
                        persisted: false,
                        reason: "invalid_upload_payload",
                    };
                }
                if (mediaField !== "avatarKey" && mediaField !== "bannerKey") {
                    return {
                        persisted: false,
                        reason: "invalid_media_field",
                    };
                }

                const result = await replaceProfileMedia(
                    profileStore,
                    fileGateway,
                    accountId,
                    mediaField,
                    content,
                    contentType,
                    (error, previousKey) => {
                        log?.(
                            "warn",
                            `Failed to delete replaced ${mediaField === "avatarKey" ? "avatar" : "banner"} file.`,
                            {
                                component: "social-profile-adapter",
                                accountId,
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
                    return { persisted: false, reason: "profile_not_found" };
                }

                return {
                    persisted: true,
                    storedKey: result.storedKey,
                    updated: result.updated,
                };
            },
        );

        flow.extend(
            "upload-profile-media",
            "emit-events",
            { id: "social-profile-adapter:emit-profile-media-upload-events" },
            async (stageCtx) => {
                const persistResult = getFirstStageResult<ProfileMediaMutationResult>(
                    {
                        flowId: stageCtx.flowId,
                        data: stageCtx.data,
                        stageResults: stageCtx.stageResults,
                    },
                    "persist-media",
                );
                if (!persistResult?.persisted || !persistResult.updated) {
                    return { emitted: false };
                }
                const mediaField = String(
                    (stageCtx.input as Record<string, unknown>).mediaField ?? "",
                );
                if (mediaField === "avatarKey") {
                    await onProfileChanged?.({
                        accountId: persistResult.updated.accountId,
                        handle: persistResult.updated.handle,
                        displayName: persistResult.updated.displayName,
                        avatarChanged: true,
                    });
                }
                return { emitted: true };
            },
        );
    }

    if (flow.exists("remove-profile-media")) {
        flow.extend(
            "remove-profile-media",
            "persist-removal",
            { id: "social-profile-adapter:persist-profile-media-removal" },
            async (stageCtx) => {
                const payload = stageCtx.input as {
                    accountId?: unknown;
                    mediaField?: unknown;
                };
                const accountId = String(payload.accountId ?? "");
                const mediaField = String(payload.mediaField ?? "");
                if (!accountId) {
                    return {
                        persisted: false,
                        reason: "invalid_upload_payload",
                    };
                }
                if (mediaField !== "avatarKey" && mediaField !== "bannerKey") {
                    return {
                        persisted: false,
                        reason: "invalid_media_field",
                    };
                }

                const profile = await profileStore.getProfile(accountId);
                if (!profile) {
                    return { persisted: false, reason: "profile_not_found" };
                }
                const existingKey = profile[mediaField];
                if (existingKey) {
                    await fileGateway.delete(existingKey);
                }
                const updated = await profileStore.updateProfile(accountId, {
                    [mediaField]: null,
                } as Partial<Pick<AccountProfile, ProfileMediaKey>>);
                return {
                    persisted: true,
                    removed: true,
                    storedKey: existingKey ?? undefined,
                    updated: updated ?? profile,
                };
            },
        );

        flow.extend(
            "remove-profile-media",
            "emit-events",
            { id: "social-profile-adapter:emit-profile-media-removal-events" },
            async (stageCtx) => {
                const persistResult = getFirstStageResult<ProfileMediaMutationResult>(
                    {
                        flowId: stageCtx.flowId,
                        data: stageCtx.data,
                        stageResults: stageCtx.stageResults,
                    },
                    "persist-removal",
                );
                if (!persistResult?.persisted || !persistResult.updated) {
                    return { emitted: false };
                }
                const mediaField = String(
                    (stageCtx.input as Record<string, unknown>).mediaField ?? "",
                );
                if (mediaField === "avatarKey") {
                    await onProfileChanged?.({
                        accountId: persistResult.updated.accountId,
                        handle: persistResult.updated.handle,
                        displayName: persistResult.updated.displayName,
                        avatarChanged: true,
                    });
                }
                return { emitted: true };
            },
        );
    }
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
 *   `/api/v1/profile/ping` endpoint returns `503` so callers can detect that
 *   profile functionality is temporarily unavailable.
 */
export function createProfileRoutes(
    profileStore: ProfileStore,
    fileGateway?: FileStorageGateway,
    isGatewayEnabled?: () => boolean,
    log?: BootstrapLog,
    onProfileChanged?: (input: {
        accountId: string;
        handle?: string | null;
        displayName?: string | null;
        displayNameChanged?: boolean;
        avatarChanged?: boolean;
    }) => Promise<void>,
    routeContext?: RouteContext,
    flow?: FlowApi,
) {
    const ctx = resolveRouteContext(routeContext);
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

        if (url.pathname === "/api/v1/profile/ping" && req.method === "GET") {
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

        if (url.pathname === "/api/v1/profile" && req.method === "GET") {
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

        if (url.pathname === "/api/v1/profile" && req.method === "PATCH") {
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

        if (url.pathname === "/api/v1/profile/avatar" && req.method === "PUT") {
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
            if (flow?.exists("upload-profile-media")) {
                const flowResult = await flow.run("upload-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "avatarKey",
                    content: body,
                    contentType: mime,
                });
                const persistResult = getFirstStageResult<ProfileMediaMutationResult>(
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
                if (!persistResult?.persisted || !persistResult.storedKey) {
                    res.writeHead(500, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "upload_failed",
                                message: "Failed to upload avatar.",
                            },
                        }),
                    );
                    return true;
                }
                updated = persistResult.updated ?? null;
                storedKey = persistResult.storedKey;
            } else {
                const result = await replaceProfileMedia(
                    profileStore,
                    fileGateway,
                    claims!.sub,
                    "avatarKey",
                    body,
                    mime,
                    (error, previousKey) => {
                        log?.("warn", "Failed to delete replaced avatar file.", {
                            ...logMeta,
                            accountId: claims!.sub,
                            previousKey,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        });
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
                    data: { avatarKey: storedKey ?? null, profile: updated ?? null },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/profile/avatar" &&
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
            if (flow?.exists("remove-profile-media")) {
                const flowResult = await flow.run("remove-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "avatarKey",
                });
                const persistResult = getFirstStageResult<ProfileMediaMutationResult>(
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
                if (profile?.avatarKey) await fileGateway.delete(profile.avatarKey);
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

        if (url.pathname === "/api/v1/profile/banner" && req.method === "PUT") {
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
            if (flow?.exists("upload-profile-media")) {
                const flowResult = await flow.run("upload-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "bannerKey",
                    content: body,
                    contentType: mime,
                });
                const persistResult = getFirstStageResult<ProfileMediaMutationResult>(
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
                if (!persistResult?.persisted || !persistResult.storedKey) {
                    res.writeHead(500, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "upload_failed",
                                message: "Failed to upload banner.",
                            },
                        }),
                    );
                    return true;
                }
                updated = persistResult.updated ?? null;
                storedKey = persistResult.storedKey;
            } else {
                const result = await replaceProfileMedia(
                    profileStore,
                    fileGateway,
                    claims!.sub,
                    "bannerKey",
                    body,
                    mime,
                    (error, previousKey) => {
                        log?.("warn", "Failed to delete replaced banner file.", {
                            ...logMeta,
                            accountId: claims!.sub,
                            previousKey,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        });
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
                    data: { bannerKey: storedKey ?? null, profile: updated ?? null },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/profile/banner" &&
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
            if (flow?.exists("remove-profile-media")) {
                const flowResult = await flow.run("remove-profile-media", {
                    accountId: claims!.sub,
                    mediaField: "bannerKey",
                });
                const persistResult = getFirstStageResult<ProfileMediaMutationResult>(
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
                if (profile?.bannerKey) await fileGateway.delete(profile.bannerKey);
                await profileStore.updateProfile(claims!.sub, { bannerKey: null });
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
            /^\/api\/v1\/users\/([^/]+)\/profile$/,
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
                !hasAdminProfileBypass(claims!.role) &&
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
