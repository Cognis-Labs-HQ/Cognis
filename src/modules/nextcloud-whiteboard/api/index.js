import path from "node:path";
import { hasMinRole, requireAuth } from "../../../gateways/shared.js";
import { readJson } from "../../../api/reuse/read-json.js";
import { sendError, sendJson } from "../../../api/reuse/http-response.js";
import { getFirstStageResult } from "../../../api/reuse/flow-helpers.js";
import { normalizeHttpUrl } from "../../../api/reuse/url-parts.js";
import { normalizeHandleKey } from "../../../api/reuse/normalize-handle.js";
import { checkHttpLiveness } from "../../../api/reuse/http-liveness.js";
import { NextcloudWhiteboardStore } from "./store.js";
import { registerWhiteboardShareFlowHooks } from "./share-hooks.js";

const LIVENESS_TIMEOUT_MS = 5000;

const MODULE_ID = "nextcloud-whiteboard";
const PAGE_RESOURCE_ORIGIN_OWNER_ID = "module:nextcloud-whiteboard";
const WHITEBOARD_STYLESHEETS = [
    "/static/styles/page-builder.css",
    "/static/styles/reuse/page-sections.css",
    "/static/modules/nextcloud-whiteboard/styles/whiteboards.css",
];
const storeByExecutor = new WeakMap();

function resolveStore(dbExecutor, log) {
    const existingStore = storeByExecutor.get(dbExecutor);
    if (existingStore) return existingStore;
    const store = new NextcloudWhiteboardStore({ db: dbExecutor, log });
    storeByExecutor.set(dbExecutor, store);
    return store;
}

async function resolveRequesterUsername(profileStore, accountId) {
    const profile = await profileStore.getProfile(accountId);
    const username = normalizeHandleKey(profile?.handle ?? "");
    if (!username) {
        throw new Error(
            "A visible profile handle is required to use Whiteboards.",
        );
    }
    return username;
}

async function resolveParticipantHandles(
    profileStore,
    requestedHandles,
    includeHidden,
) {
    const usernames = [];
    for (const candidate of Array.isArray(requestedHandles)
        ? requestedHandles
        : []) {
        const normalizedHandle = normalizeHandleKey(candidate);
        if (!normalizedHandle) continue;
        const profile = await profileStore.getProfileByHandle(normalizedHandle);
        if (!profile?.handle) continue;
        if (!includeHidden && profile.visibility === "hidden") continue;
        usernames.push(normalizeHandleKey(profile.handle));
    }
    return usernames;
}

function buildCognisWhiteboardUrl(whiteboardId) {
    return `/whiteboard?id=${encodeURIComponent(whiteboardId)}`;
}

async function resolveWhiteboardUserAccess({
    claims,
    profileStore,
    store,
    whiteboardId,
    resolveShareGuestAccess,
    requireWrite = false,
}) {
    if (typeof resolveShareGuestAccess === "function") {
        const shareAccess = await resolveShareGuestAccess({
            claims,
            resourceType: "whiteboard",
            resourceId: whiteboardId,
            requiredCapability: requireWrite
                ? "whiteboard:write"
                : "whiteboard:read",
        }).catch(() => null);
        if (shareAccess?.shareGuest) {
            return shareAccess.authorized
                ? {
                      authorized: true,
                      username: shareAccess.username,
                      displayName: shareAccess.displayName,
                  }
                : {
                      authorized: false,
                      status: 403,
                      code: "forbidden",
                      message:
                          "This share link cannot access the requested whiteboard.",
                  };
        }
    }
    const username = await resolveRequesterUsername(
        profileStore,
        claims.sub,
    ).catch((error) => ({ error }));
    if (username?.error)
        return {
            authorized: false,
            status: 409,
            code: "profile_required",
            message: username.error.message,
        };
    const authorized = await store.canAccessWhiteboard(whiteboardId, username);
    return authorized
        ? { authorized: true, username }
        : {
              authorized: false,
              status: 403,
              code: "forbidden",
              message:
                  "You are not listed as an allowed whiteboard participant.",
          };
}

function resolveExpiry(hoursValue) {
    if (
        hoursValue === null ||
        hoursValue === undefined ||
        String(hoursValue).trim() === ""
    )
        return "";
    const parsed = Number(hoursValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return new Date(Date.now() + parsed * 60 * 60 * 1000).toISOString();
}

function publicConfig(config) {
    return {
        serverUrl: config.serverUrl,
        imageUploadMaxBytes: config.imageUploadMaxBytes,
        apiKeyConfigured: config.apiKeyConfigured,
        updatedAt: config.updatedAt,
    };
}

function registerConfiguredOrigin(registerScriptOrigins, config) {
    if (typeof registerScriptOrigins === "function") {
        registerScriptOrigins(PAGE_RESOURCE_ORIGIN_OWNER_ID, [
            config?.serverUrl,
        ]);
    }
}

async function registerStoredOrigin({ store, registerScriptOrigins, log }) {
    try {
        await store.ensureSchema();
        registerConfiguredOrigin(
            registerScriptOrigins,
            await store.getConfig(),
        );
    } catch (error) {
        log?.(
            "error",
            "Failed to register stored Nextcloud Whiteboard CSP origin.",
            {
                component: "nextcloud-whiteboard-module",
                operation: "register_stored_origin",
                error: error instanceof Error ? error.message : String(error),
            },
        );
    }
}

export function registerUi(ctx) {
    const moduleUiRoot = path.join(ctx.moduleRoot, "ui");
    ctx.registerStaticDir("", moduleUiRoot);
    ctx.registerNavbarPlugin({
        scriptUrl: "/static/modules/nextcloud-whiteboard/navbar.js",
        access: { minRole: "user" },
    });
    ctx.registerSpaRoute({
        id: "module-nextcloud-whiteboard",
        pattern: "^/whiteboards$",
        base: "/whiteboards",
        scriptUrl: "/static/modules/nextcloud-whiteboard/app/index.js",
        stylesheets: WHITEBOARD_STYLESHEETS,
        access: { minRole: "user" },
    });

    ctx.registerSpaRoute({
        id: "module-nextcloud-whiteboard-canvas",
        pattern: "^/whiteboard$",
        base: "/whiteboard",
        scriptUrl: "/static/modules/nextcloud-whiteboard/app/index.js",
        stylesheets: WHITEBOARD_STYLESHEETS,
        access: { minRole: "user" },
    });
    ctx.registerAdminSection({
        id: "module-nextcloud-whiteboard",
        label: "Nextcloud Whiteboard",
        scriptUrl: "/static/modules/nextcloud-whiteboard/admin-section.js",
        access: { minRole: "admin" },
        stringsBaseUrl: "/static/modules/nextcloud-whiteboard/languages",
    });
}

export function registerApiRoutes(router, ctx) {
    const dbExecutor = ctx.getCapability("db:executor");
    const profileStore = ctx.getCapability("social:profileStore");
    const log = ctx.getCapability("logging:log");
    const registerScriptOrigins = ctx.getCapability(
        "auth:registerPageScriptOrigins",
    );
    const resolveShareGuestAccess = ctx.getCapability(
        "share:resolveGuestAccess",
    );
    const listSharesByResource = ctx.getCapability("share:listByResource");
    const systemCtx = ctx.getCapability("system:ctx");

    if (!dbExecutor || !profileStore) {
        router.get(
            "/api/v1/modules/nextcloud-whiteboard/ping",
            async (_req, res) => {
                sendJson(res, 200, {
                    data: {
                        ready: false,
                        reason: "required_capabilities_missing",
                    },
                });
            },
        );
        return;
    }

    const store = resolveStore(dbExecutor, log);
    const ensureShareFlowHooks = () =>
        registerWhiteboardShareFlowHooks({
            ctx: systemCtx ?? ctx,
            store,
            profileStore,
            resolveWhiteboardUserAccess,
            whiteboardStylesheets: WHITEBOARD_STYLESHEETS,
        });
    ensureShareFlowHooks();
    void registerStoredOrigin({ store, registerScriptOrigins, log });

    const moduleApi = {
        async spawnWhiteboardWindow(options = {}) {
            await store.ensureSchema();
            const createdBy = normalizeHandleKey(options.createdBy);
            if (!createdBy) {
                throw new Error(
                    "createdBy is required to spawn a whiteboard window.",
                );
            }
            const config = await store.getConfig();
            if (!config.serverUrl || !config.apiKeyConfigured) {
                throw new Error(
                    "Nextcloud Whiteboard server URL and API key must be configured.",
                );
            }
            const whiteboard = await store.createWhiteboard({
                title: options.title,
                createdBy,
                participants: options.participants,
                externalPath: options.externalPath,
            });
            const launchUrl = buildCognisWhiteboardUrl(whiteboard.id);
            log?.("info", "Nextcloud Whiteboard window spawned.", {
                component: "nextcloud-whiteboard-module",
                operation: "spawn_whiteboard_window",
                whiteboardId: whiteboard.id,
                createdBy,
            });
            return {
                whiteboardId: whiteboard.id,
                launchUrl,
                windowFeatures:
                    "popup,width=1280,height=900,noopener,noreferrer",
                access: {
                    owner: createdBy,
                    participants: whiteboard
                        ? [createdBy, ...(options.participants ?? [])]
                        : [createdBy],
                },
            };
        },
        async fetchBoardData(whiteboardId) {
            await store.ensureSchema();
            const whiteboard = await store.getWhiteboardById(
                String(whiteboardId ?? ""),
            );
            if (!whiteboard) return null;
            return {
                id: whiteboard.id,
                title: whiteboard.title,
                embedUrl: buildCognisWhiteboardUrl(whiteboard.id),
                createdBy: whiteboard.createdBy,
                createdAt: whiteboard.createdAt,
                updatedAt: whiteboard.updatedAt,
            };
        },
    };
    ctx.getCapability("system:ctx")?.contributePublicCapability?.(
        "nextcloud-whiteboard:api",
        moduleApi,
    );
    ctx.getCapability("system:ctx")?.contributePublicCapability?.(
        "nextcloud-whiteboard:spawnWhiteboardWindow",
        moduleApi.spawnWhiteboardWindow,
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/ping",
        async (_req, res) => {
            await store.ensureSchema();
            const config = await store.getConfig();
            sendJson(res, 200, {
                data: {
                    ready: true,
                    configComplete: Boolean(
                        config.serverUrl && config.apiKeyConfigured,
                    ),
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/preflight",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const config = await store.getConfig();
            if (!config.serverUrl || !config.apiKeyConfigured) {
                sendError(
                    res,
                    409,
                    "config_required",
                    "The whiteboard server URL and API key must be configured before use.",
                );
                return;
            }
            const liveness = await checkHttpLiveness(config.serverUrl, {
                timeoutMs: LIVENESS_TIMEOUT_MS,
            });
            log?.("info", "Nextcloud Whiteboard preflight check completed.", {
                component: "nextcloud-whiteboard-module",
                operation: "preflight",
                alive: liveness.alive,
                serverUrl: config.serverUrl,
            });
            sendJson(res, 200, {
                data: {
                    alive: liveness.alive,
                    serverUrl: config.serverUrl,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/config",
        async (_req, res) => {
            await store.ensureSchema();
            sendJson(res, 200, { data: publicConfig(await store.getConfig()) });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/config",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "admin");
            if (!claims) return;
            const body = await readJson(req);
            const serverUrl = normalizeHttpUrl(body.serverUrl);
            const apiKey = String(body.apiKey ?? "").trim();
            const imageUploadMaxBytes = Number(
                body.imageUploadMaxBytes ?? 1048576,
            );
            if (!serverUrl || !apiKey) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "A valid Whiteboard server URL and API key are required.",
                );
                return;
            }
            const saved = await store.saveConfig({
                serverUrl,
                apiKey,
                imageUploadMaxBytes,
            });
            registerConfiguredOrigin(registerScriptOrigins, saved);
            log?.("info", "Nextcloud Whiteboard configuration updated.", {
                component: "nextcloud-whiteboard-module",
                operation: "save_config",
                hasServerUrl: Boolean(saved.serverUrl),
                hasApiKey: saved.apiKeyConfigured,
                imageUploadMaxBytes: saved.imageUploadMaxBytes,
                updatedBy: claims.sub,
            });
            sendJson(res, 200, { data: publicConfig(saved) });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const username = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            ).catch((error) => {
                sendError(res, 409, "profile_required", error.message);
                return null;
            });
            if (!username) return;
            const data = await store.listAccessibleWhiteboards(username);
            sendJson(res, 200, { data });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/session",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const url = new URL(req.url, "http://localhost");
            const whiteboardId = url.searchParams.get("id") ?? "";
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
                requireWrite: true,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            const username = access.username;
            const displayName = access.displayName || username;
            const config = await store.getConfig();
            if (!config.serverUrl || !config.apiKeyConfigured) {
                sendError(
                    res,
                    409,
                    "config_required",
                    "Nextcloud Whiteboard must be configured before use.",
                );
                return;
            }
            const token = store.mintSessionToken(config, whiteboard, {
                id: username,
                name: displayName,
            });
            log?.("info", "Nextcloud Whiteboard session token issued.", {
                component: "nextcloud-whiteboard-module",
                operation: "issue_session_token",
                whiteboardId: whiteboard.id,
                username,
            });
            const elements = await store.getElementsSnapshot(whiteboard.id);
            sendJson(res, 200, {
                data: {
                    roomId: whiteboard.id,
                    title: whiteboard.title,
                    canRename: access.username === whiteboard.createdBy,
                    serverUrl: config.serverUrl,
                    imageUploadMaxBytes: config.imageUploadMaxBytes,
                    elements,
                    token,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/elements",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const body = await readJson(req);
            const whiteboardId = String(body.id ?? "").trim();
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
                requireWrite: true,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            const saved = await store.saveElementsSnapshot(
                whiteboard.id,
                body.elements,
            );
            sendJson(res, 200, { data: saved });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/presence",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const url = new URL(req.url, "http://localhost");
            const whiteboardId = url.searchParams.get("pageId") ?? "";
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
                requireWrite: true,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            const rows = await store.listPresence(whiteboard.id);
            const profileCache = new Map();
            const presence = [];
            for (const entry of rows) {
                if (!entry.active) continue;
                let handle = "";
                let avatarKey = null;
                if (!entry.guest && !entry.username.startsWith("guest:")) {
                    handle = entry.username;
                    if (!profileCache.has(handle)) {
                        profileCache.set(
                            handle,
                            profileStore
                                .getProfileByHandle(handle)
                                .catch(() => null),
                        );
                    }
                    const profile = await profileCache.get(handle);
                    avatarKey = profile?.avatarKey ?? null;
                }
                presence.push({
                    id: entry.username,
                    displayName: entry.displayName,
                    handle,
                    avatarKey,
                    guest: entry.guest || entry.username.startsWith("guest:"),
                    active: entry.active,
                    pointer: entry.pointer,
                    lastSeenAt: entry.lastSeenAt,
                });
            }
            sendJson(res, 200, { data: { presence } });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/presence",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const body = await readJson(req);
            const whiteboardId = String(body.pageId ?? "").trim();
            const sessionId = String(body.sessionId ?? "").trim();
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard || !sessionId) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
                requireWrite: true,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            await store.upsertPresence({
                whiteboardId: whiteboard.id,
                username: access.username,
                sessionId,
                displayName: access.displayName || access.username,
                guest: access.username.startsWith("guest:"),
                active: body.active !== false,
                pointer: body.pointer,
            });
            sendJson(res, 200, { data: { ok: true } });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/rename",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            let body;
            try {
                body = await readJson(req);
            } catch {
                sendError(
                    res,
                    400,
                    "invalid_json",
                    "Rename request body must be valid JSON.",
                );
                return;
            }
            const whiteboardId = String(body.id ?? "").trim();
            const title = String(body.title ?? "").trim();
            if (!whiteboardId || !title) {
                sendError(
                    res,
                    422,
                    "invalid_rename",
                    "Whiteboard id and title are required.",
                );
                return;
            }
            const username = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            ).catch((error) => {
                sendError(res, 409, "profile_required", error.message);
                return null;
            });
            if (!username) return;
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard was not found.");
                return;
            }
            if (whiteboard.createdBy !== username) {
                sendError(
                    res,
                    403,
                    "forbidden",
                    "Only the whiteboard owner can rename this whiteboard.",
                );
                return;
            }
            const renamed = await store.renameWhiteboard(whiteboardId, title);
            if (!renamed) {
                sendError(res, 404, "not_found", "Whiteboard was not found.");
                return;
            }
            sendJson(res, 200, { data: renamed });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/share",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            if (typeof listSharesByResource !== "function") {
                sendError(
                    res,
                    503,
                    "service_unavailable",
                    "Share capabilities are unavailable.",
                );
                return;
            }
            await store.ensureSchema();
            const url = new URL(req.url, "http://localhost");
            const whiteboardId = String(
                url.searchParams.get("whiteboardId") ?? "",
            ).trim();
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            const shares = await listSharesByResource({
                resourceType: "whiteboard",
                resourceId: whiteboard.id,
            });
            sendJson(res, 200, { data: shares });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/share",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            ensureShareFlowHooks();
            if (!systemCtx?.flow?.exists?.("mint-share-token")) {
                sendError(
                    res,
                    503,
                    "service_unavailable",
                    "Share capabilities are unavailable.",
                );
                return;
            }
            const body = await readJson(req);
            const whiteboardId = String(body.whiteboardId ?? "").trim();
            const expiresAt = resolveExpiry(body.expiresInHours);
            if (expiresAt === null) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "expiresInHours must be a positive number.",
                );
                return;
            }
            const result = await systemCtx.flow.run("mint-share-token", {
                resourceType: "whiteboard",
                resourceId: whiteboardId,
                claims,
                label: body.label,
                expiresAt,
                grantedCapabilities: ["whiteboard:read", "whiteboard:write"],
            });
            const issued =
                getFirstStageResult(result.stageResults, "issue-token") ??
                getFirstStageResult(result.stageResults, "emit-event");
            if (!issued?.minted && !issued?.emitted) {
                sendError(
                    res,
                    403,
                    "forbidden",
                    "Whiteboard cannot be shared.",
                );
                return;
            }
            sendJson(res, 200, { data: issued.shareRecord ?? null });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/share/delete",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            ensureShareFlowHooks();
            if (!systemCtx?.flow?.exists?.("revoke-share-token")) {
                sendError(
                    res,
                    503,
                    "service_unavailable",
                    "Share capabilities are unavailable.",
                );
                return;
            }
            const body = await readJson(req);
            const result = await systemCtx.flow.run("revoke-share-token", {
                resourceType: "whiteboard",
                resourceId: String(body.whiteboardId ?? "").trim(),
                shareId: String(body.shareId ?? "").trim(),
                ownerAccountId: claims.sub,
                claims,
            });
            const revoked = getFirstStageResult(
                result.stageResults,
                "delete-token",
            );
            if (!revoked?.revoked) {
                sendError(
                    res,
                    403,
                    "forbidden",
                    "Share link cannot be revoked.",
                );
                return;
            }
            sendJson(res, 200, { data: { deleted: true } });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/launch",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const url = new URL(req.url, "http://localhost");
            const whiteboardId = url.searchParams.get("id") ?? "";
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
                requireWrite: true,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            res.writeHead(302, {
                location: buildCognisWhiteboardUrl(whiteboardId),
            });
            res.end();
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/spawn",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const body = await readJson(req);
            const username = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            ).catch((error) => {
                sendError(res, 409, "profile_required", error.message);
                return null;
            });
            if (!username) return;
            const config = await store.getConfig();
            if (!config.serverUrl || !config.apiKeyConfigured) {
                sendError(
                    res,
                    409,
                    "config_required",
                    "Nextcloud Whiteboard must be configured before use.",
                );
                return;
            }
            const participants = await resolveParticipantHandles(
                profileStore,
                body.participants,
                hasMinRole(claims.role, "admin"),
            );
            const whiteboard = await store.createWhiteboard({
                title: body.title,
                createdBy: username,
                participants,
                externalPath: body.externalPath,
            });
            sendJson(res, 200, {
                data: {
                    whiteboard,
                    launchUrl: buildCognisWhiteboardUrl(whiteboard.id),
                    windowFeatures:
                        "popup,width=1280,height=900,noopener,noreferrer",
                },
            });
        },
        { access: { minRole: "user" } },
    );
}

export { MODULE_ID };
