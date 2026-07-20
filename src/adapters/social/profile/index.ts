import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { DbProfileStore } from "./store.js";
import { DbUserPreferenceStore } from "./preference-store.js";
import { createProfileRoutes } from "./routes/index.js";
import { registerProfileMediaFlowHooks } from "./routes/media-flow-hooks.js";
import { createSocialRoutes } from "./routes/social.js";
import { createPostRoutes } from "./routes/posts.js";
import { createFileLimitRoutes } from "./routes/files.js";
import { createPreferencesRoutes } from "./routes/preferences.js";
import type { AccountLifecycleState, AccountRole } from "./store.js";
import type {
    SocialAdapter,
    SocialAdapterBootstrapCtx,
} from "../../../gateways/social/gateway.js";
import {
    createProfileFileClient,
    createProfileNamespaceClientRequest,
    type ProfileFileClient,
} from "./routes/profile-file-client.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);

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
export function createProfilePageRoutes(
    routeContext?: RouteContext,
    isAdapterEnabled?: () => boolean,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;

        if (isAdapterEnabled && !isAdapterEnabled()) return false;

        if (url.pathname === "/profile") {
            const session = ctx.getCookieSession(req);
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
            if (!ctx.getCookieSession(req)) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }
            try {
                const filePath = path.join(ADAPTER_UI_ROOT, "index.html");
                const file = await readFile(filePath);
                ctx.setPageSecurityHeaders(res);
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
 * `503 file_storage_unavailable` when the files gateway's namespaced
 * capabilities are absent. Avatar/banner uploads register the "profile"
 * namespace and only activate when files:namespace is present.
 */
export async function bootstrapSocialAdapter(
    ctx: SocialAdapterBootstrapCtx,
): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const dbExecutor = ctx.capabilities.get<DbExecutor>("db:executor");

    if (!dbExecutor) {
        ctx.log?.(
            "warn",
            "Profile adapter: no database executor available — profile features disabled.",
            { component: "social-profile-adapter" },
        );
        return;
    }

    const profileStore = new DbProfileStore(dbExecutor);
    await profileStore.ensureSchema();
    ctx.log?.("info", "Profile store schema ready.", {
        component: "social-profile-adapter",
    });

    const prefStore = new DbUserPreferenceStore(dbExecutor);
    await prefStore.ensureSchema();
    /**
     * preferences:store — per-user settings persistence consumed by shared UI
     * and gateways.
     */
    ctx.capabilities.contribute("preferences:store", prefStore);
    /**
     * social:profileStore — profile/search/social-graph storage exported to
     * peer adapters and modules.
     */
    ctx.capabilities.contribute("social:profileStore", profileStore);
    /**
     * social:profileLifecycle — profile-owned lifecycle boundary for account
     * archive/deactivate/reactivate transitions consumed by auth and admin
     * routes without mutating the profile store directly.
     */
    ctx.capabilities.contribute("social:profileLifecycle", {
        getState: async (accountId: string): Promise<AccountLifecycleState> =>
            (await profileStore.getProfile(accountId))?.lifecycleState ??
            "active",
        setState: async (
            accountId: string,
            lifecycleState: AccountLifecycleState,
        ): Promise<void> => {
            const existingProfile = await profileStore.getProfile(accountId);
            if (!existingProfile) {
                await profileStore.createProfile(accountId, accountId);
            }
            const updatedProfile = await profileStore.updateProfile(accountId, {
                lifecycleState,
            });
            if (!updatedProfile) {
                throw new Error(
                    `Unable to persist lifecycle state for account ${accountId}`,
                );
            }
        },
    });
    ctx.capabilities.contribute("social:profile:fileResources", {
        namespaceId: "profile",
    });
    ctx.log?.("info", "Profile preference store schema ready.", {
        component: "social-profile-adapter",
    });

    /**
     * profile:createProfile — creates a profile row for an account during
     * auth/registration flows.
     */
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

    /**
     * profile:setRoleByHandle — synchronizes profile role metadata with account
     * role changes.
     */
    ctx.capabilities.contribute(
        "profile:setRoleByHandle",
        async (handle: string, role: string): Promise<void> => {
            await profileStore.setRoleByHandle(handle, role as AccountRole);
        },
    );

    /**
     * profile:getRole — reads profile-owned role metadata without exposing the
     * profile store to consumers.
     */
    ctx.capabilities.contribute(
        "profile:getRole",
        async (accountId: string): Promise<AccountRole | undefined> =>
            (await profileStore.getProfile(accountId))?.role,
    );

    const registerNamespace = ctx.capabilities.get<
        (definition: {
            id: string;
            ownerComponent: string;
            acl: { visibility: string };
        }) => void
    >("files:registerNamespace");
    const createNamespaceClient =
        ctx.capabilities.get<
            (request: {
                namespaceId: string;
                callerComponent: string;
            }) => Parameters<typeof createProfileFileClient>[0]
        >("files:namespace");

    let fileGateway: ProfileFileClient | undefined;
    if (registerNamespace && createNamespaceClient) {
        registerNamespace({
            id: "profile",
            ownerComponent: "social-profile",
            acl: { visibility: "component-managed" },
        });
        fileGateway = createProfileFileClient(
            createNamespaceClient(createProfileNamespaceClientRequest()),
        );
    }

    const dispatchNotification =
        ctx.capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
                senderName?: string;
                actionUrl?: string;
                metadata?: Record<string, unknown>;
            }) => Promise<unknown>
        >("notify:dispatch");
    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    if (registerNotificationCategory) {
        registerNotificationCategory("social", "Social");
    }
    const onMessagesProfileChanged = ctx.capabilities.get<
        (input: {
            accountId: string;
            handle?: string | null;
            displayName?: string | null;
            displayNameChanged?: boolean;
            avatarChanged?: boolean;
        }) => Promise<void>
    >("social:messages:onProfileChanged");

    if (fileGateway) {
        registerProfileMediaFlowHooks({
            flow: ctx.flow,
            profileStore,
            fileGateway,
            log: ctx.log,
            onProfileChanged: onMessagesProfileChanged ?? undefined,
        });
    }

    ctx.registerRoute(
        createProfileRoutes(
            profileStore,
            fileGateway ?? undefined,
            () => ctx.isGatewayEnabled(),
            ctx.log,
            onMessagesProfileChanged ?? undefined,
            routeContext,
        ),
        "social",
    );

    if (!fileGateway) {
        ctx.log?.(
            "warn",
            "Profile adapter: files:* capabilities not found — avatar/banner uploads unavailable.",
        );
    }

    ctx.registerRoute(
        createFileLimitRoutes(profileStore, routeContext),
        "social",
    );

    ctx.registerRoute(
        createProfilePageRoutes(routeContext, () => ctx.isGatewayEnabled()),
        "social",
    );
    ctx.registerRoute(
        createSocialRoutes(profileStore, routeContext, {
            dispatchNotification: dispatchNotification ?? undefined,
        }),
        "social",
    );
    ctx.registerRoute(createPostRoutes(profileStore, routeContext), "social");
    ctx.registerRoute(
        createPreferencesRoutes(prefStore, routeContext),
        "social",
    );
    ctx.log?.("info", "Profile adapter routes registered.", {
        component: "social-profile-adapter",
        hasFileGateway: Boolean(fileGateway),
    });

    const uiDir = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "ui",
    );
    ctx.registerAdapterStaticDir?.("social", "profile", uiDir);
    ctx.registerSpaRoute?.({
        id: "social-profile-page",
        pattern: "^/profile(?:/[^/]+)?$",
        base: "/profile",
        scriptUrl: "/static/adapters/social/profile/app.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/social/profile/profile.css",
            "/static/adapters/social/profile/crop.css",
            "/static/styles/reuse/char-counter.css",
        ],
        isEnabled: () => ctx.isGatewayEnabled() && ctx.isAdapterEnabled(),
    });
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
