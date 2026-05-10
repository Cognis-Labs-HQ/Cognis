import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { DbProfileStore } from "../../db/reuse/profile-store.js";
import { DbUserPreferenceStore } from "../../db/reuse/preference-store.js";
import { createProfileRoutes } from "../../../api/routes/profile/index.js";
import { createSocialRoutes } from "./routes/social.js";
import { createPostRoutes } from "./routes/posts.js";
import { createFileRoutes } from "./routes/files.js";
import { createPreferencesRoutes } from "./routes/preferences.js";
import type { FileStorageGateway } from "@cognis/core";
import {
    getCookieSession,
    setPageSecurityHeaders,
} from "../../../api/auth/guard.js";
import type { AccountRole } from "../../db/reuse/profile-store.js";
import type {
    SocialAdapter,
    SocialAdapterBootstrapCtx,
} from "../../../gateways/social/gateway.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { SupportedDbType } from "../../../gateways/db/executor.js";

const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");

let adapterReady = false;

export function createSocialAdapter(): SocialAdapter {
    return {
        adapterId: "profile",
        adapterName: "Profile",
        isConfigured: () => adapterReady,
    };
}

/**
 * Creates page-serving route handlers for the profile SPA pages. Owned by
 * the profile adapter so that removing the adapter also removes the profile
 * pages — core has no knowledge of them.
 *
 * When `isAdapterEnabled` is supplied and returns `false`, all profile page
 * routes return `false` so that the server's 404 handler takes over,
 * preventing access to the profile UI while the social gateway is disabled.
 */
export function createProfilePageRoutes(isAdapterEnabled?: () => boolean) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;

        if (isAdapterEnabled && !isAdapterEnabled()) return false;

        if (url.pathname === "/profile") {
            const session = getCookieSession(req);
            if (!session) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }
            res.writeHead(302, {
                location: `/profile/${encodeURIComponent(session.sub)}`,
            });
            res.end();
            return true;
        }

        if (
            url.pathname.startsWith("/profile/") &&
            url.pathname.length > "/profile/".length
        ) {
            if (!getCookieSession(req)) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }
            try {
                const filePath = path.join(
                    PUBLIC_ROOT,
                    "pages",
                    "profile.html",
                );
                const file = await readFile(filePath);
                setPageSecurityHeaders(res);
                res.writeHead(200, {
                    "content-type": "text/html; charset=utf-8",
                    "cache-control": "no-store",
                });
                res.end(file);
            } catch {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Asset not found.",
                        },
                    }),
                );
            }
            return true;
        }

        return false;
    };
}

/**
 * Profile Adapter for the Social Gateway. Owns user profiles, social graph,
 * posts, file storage, and per-user preferences. Contributes the following
 * capabilities to the shared CapabilityStore so other adapters and the core
 * API can consume them without holding direct references:
 *
 *   profile:createProfile   — (accountId, handle, role?, displayName?) => void
 *                              Called by auth and user routes on register/login
 *                              to ensure a profile row exists.
 *   profile:setRoleByHandle — (handle, role) => void
 *                              Called by user:role route when this adapter is
 *                              present so profile rows stay in sync.
 *   preferences:store       — DbUserPreferenceStore for per-user settings.
 *   social:profileStore     — DbProfileStore for cross-adapter lookup
 *                              (e.g. messages adapter handle resolution).
 *
 * Profile API routes are always registered. Avatar/banner routes return
 * `503 file_storage_unavailable` when the file:gateway capability is absent.
 * File routes are only registered when file:gateway is present.
 */
export async function bootstrapSocialAdapter(
    ctx: SocialAdapterBootstrapCtx,
): Promise<void> {
    const dbExecutor =
        ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor;
    const dbType =
        ctx.capabilities.get<SupportedDbType>("db:type") ??
        ctx.dbType ??
        "postgresql";

    if (!dbExecutor) {
        ctx.log?.(
            "warn",
            "Profile adapter: no database executor available — profile features disabled.",
            { component: "social-profile-adapter" },
        );
        return;
    }

    const profileStore = new DbProfileStore(dbExecutor, dbType);
    await profileStore.ensureSchema();
    ctx.log?.("info", "Profile store schema ready.", {
        component: "social-profile-adapter",
        dbType,
    });

    const prefStore = new DbUserPreferenceStore(dbExecutor, dbType);
    await prefStore.ensureSchema();
    ctx.capabilities.contribute("preferences:store", prefStore);
    ctx.capabilities.contribute("social:profileStore", profileStore);
    ctx.log?.("info", "Profile preference store schema ready.", {
        component: "social-profile-adapter",
        dbType,
    });

    ctx.capabilities.contribute(
        "profile:createProfile",
        async (
            accountId: string,
            handle: string,
            role?: string,
            displayName?: string,
        ): Promise<void> => {
            await profileStore.createProfile(
                accountId,
                handle,
                (role as AccountRole) ?? "user",
                displayName,
            );
        },
    );

    ctx.capabilities.contribute(
        "profile:setRoleByHandle",
        async (handle: string, role: string): Promise<void> => {
            await profileStore.setRoleByHandle(handle, role as AccountRole);
        },
    );

    const fileGateway =
        ctx.capabilities.get<FileStorageGateway>("file:gateway");

    ctx.registerRoute(
        createProfileRoutes(
            profileStore,
            fileGateway ?? undefined,
            () => ctx.isGatewayEnabled(),
            ctx.log as never,
        ),
        "social",
    );

    if (fileGateway) {
        ctx.registerRoute(
            createFileRoutes(profileStore, fileGateway),
            "social",
        );
        ctx.log?.("info", "Profile adapter: file routes registered.");
    } else {
        ctx.log?.(
            "warn",
            "Profile adapter: file:gateway capability not found — avatar/banner/file routes unavailable.",
        );
    }

    ctx.registerRoute(
        createProfilePageRoutes(() => ctx.isGatewayEnabled()),
        "social",
    );
    ctx.registerRoute(createSocialRoutes(profileStore), "social");
    ctx.registerRoute(createPostRoutes(profileStore), "social");
    ctx.registerRoute(createPreferencesRoutes(prefStore), "social");
    ctx.log?.("info", "Profile adapter routes registered.", {
        component: "social-profile-adapter",
        hasFileGateway: Boolean(fileGateway),
    });

    const uiDir = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "ui",
    );
    ctx.registerAdapterStaticDir?.("social", "profile", uiDir);
    ctx.registerNavbarPlugin("/static/adapters/social/profile/navbar.js");
    ctx.registerAuthTypingMessage?.({
        id: "profile-social-space",
        textKey: "ui.app.login.typing.sample.5",
        ownerType: "adapter",
        ownerId: "social-profile",
    });

    ctx.log?.("info", "Profile adapter: initialized.", {
        component: "social-profile-adapter",
        hasFileGateway: Boolean(fileGateway),
    });

    adapterReady = true;
}
