import { DbProfileStore } from "../../adapters/db/reuse/profile-store.js";
import { DbUserPreferenceStore } from "../../adapters/db/reuse/preference-store.js";
import { createProfileRoutes } from "../../api/routes/profile/index.js";
import { createSocialRoutes } from "./routes/social.js";
import { createPostRoutes } from "./routes/posts.js";
import { createFileRoutes } from "./routes/files.js";
import {
    createPreferencesRoutes,
    type UserPreferenceStore,
} from "./routes/preferences.js";
import type { FileStorageGateway } from "@cognis/core";
import {
    getCookieSession,
    setPageSecurityHeaders,
    type GatewayBootstrapContext,
} from "../shared.js";
import type { AccountRole } from "../../adapters/db/reuse/profile-store.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";

const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");

/**
 * Creates page-serving route handlers for the profile SPA pages.
 * These routes are owned by the profile gateway so that removing the gateway
 * also removes the profile pages — core has no knowledge of them.
 *
 * When `isGatewayEnabled` is supplied and returns `false`, all profile page
 * routes return `false` so that the server's 404 handler takes over, preventing
 * access to the profile UI while the gateway is disabled.
 */
export function createProfilePageRoutes(isGatewayEnabled?: () => boolean) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;

        if (isGatewayEnabled && !isGatewayEnabled()) return false;

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
 * Standard gateway bootstrap entry point for all profile, social, post, and
 * file storage functionality. Core has no knowledge of any of these concepts.
 *
 * Capabilities contributed to the store:
 *
 *   profile:createProfile  — (accountId, handle, role?) => Promise<void>
 *                            Called by auth and user routes on register/login
 *                            to ensure a profile row exists. Silently no-ops
 *                            if this gateway is absent.
 *   profile:setRoleByHandle — (handle, role) => Promise<void>
 *                            Called by user:role route when the profile gateway
 *                            is present so profile rows stay in sync.
 *
 * Profile API routes are always registered. Avatar/banner routes return
 * 503 file_storage_unavailable when the file:gateway capability is absent.
 * File routes are only registered when file:gateway is present.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor = (ctx.capabilities.get<DbExecutor>("db:executor") ??
        ctx.dbExecutor)!;
    const dbType =
        ctx.capabilities.get<SupportedDbType>("db:type") ??
        ctx.dbType ??
        "sqlite";

    const profileStore = new DbProfileStore(dbExecutor, dbType);
    await profileStore.ensureSchema();
    ctx.log?.("info", "Profile store schema ready.", {
        component: "profile-gateway",
        dbType,
    });

    const prefStore = new DbUserPreferenceStore(dbExecutor, dbType);
    await prefStore.ensureSchema();
    ctx.capabilities.contribute("preferences:store", prefStore);
    ctx.log?.("info", "Profile preference store schema ready.", {
        component: "profile-gateway",
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

    ctx.routeRegistry.register(
        createProfileRoutes(
            profileStore,
            fileGateway ?? undefined,
            () => ctx.gatewayRegistry.get("profile")?.status !== "disabled",
            ctx.log,
        ),
        "profile",
    );

    if (fileGateway) {
        ctx.routeRegistry.register(
            createFileRoutes(profileStore, fileGateway),
            "profile",
        );
        ctx.log?.("info", "Profile gateway: file routes registered.");
    } else {
        ctx.log?.(
            "warn",
            "Profile gateway: file:gateway capability not found — avatar/banner/file routes unavailable.",
        );
    }

    ctx.routeRegistry.register(
        createProfilePageRoutes(
            () => ctx.gatewayRegistry.get("profile")?.status !== "disabled",
        ),
        "profile",
    );
    ctx.routeRegistry.register(createSocialRoutes(profileStore), "profile");
    ctx.routeRegistry.register(createPostRoutes(profileStore), "profile");

    ctx.routeRegistry.register(createPreferencesRoutes(prefStore), "profile");
    ctx.log?.("info", "Profile gateway routes registered.", {
        component: "profile-gateway",
        hasFileGateway: Boolean(fileGateway),
    });

    ctx.gatewayRegistry.register({
        id: "profile",
        name: "Profile Gateway",
        version: "1.1.1",
        description: "User profiles, social graph, posts, and file storage.",
        publisher: "Cognis Labs",
    });

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "profile",
        "ui",
    );
    ctx.uiRegistry?.registerStaticDir("profile", uiDir);
    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/profile/navbar.js",
    });
    ctx.uiRegistry?.registerAuthTypingMessage({
        id: "profile-social-space",
        textKey: "ui.app.login.typing.sample.5",
        ownerType: "gateway",
        ownerId: "profile",
    });

    ctx.log?.("info", "Profile gateway: initialized.", {
        component: "profile-gateway",
        hasFileGateway: Boolean(fileGateway),
    });
}
