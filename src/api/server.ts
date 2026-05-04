import { createServer } from "node:http";
import {
    HealthService,
    ModuleService,
    type ModuleRuntimeGateway,
    type FileStorageGateway,
} from "@cognis/core";
import { createModuleRoutes } from "./routes/modules/index.js";
import { createSystemRoutes } from "./routes/system/index.js";
import { createDocsRoutes } from "./routes/docs/index.js";
import { createUiRoutes } from "./routes/ui/index.js";
import { createAuthRoutes } from "./routes/auth/index.js";
import { createModuleExtensionRoutes } from "./routes/module-extensions/index.js";
import type { AuthGateway } from "@cognis/core";
import type { LocalAccountStore } from "./adapters/local-auth-gateway.js";
import {
    createPreferencesRoutes,
    type UserPreferenceStore,
} from "./routes/preferences/index.js";
import { createUserRoutes } from "./routes/users/index.js";
import { createProfileRoutes } from "./routes/profile/index.js";
import { createSocialRoutes } from "./routes/social/index.js";
import { createPostRoutes } from "./routes/posts/index.js";
import { createFileRoutes } from "./routes/files/index.js";
import type { DbProfileStore } from "./adapters/db/profile-store.js";
import type { DbNotificationStore } from "./adapters/db/notification-store.js";
import type { TfaCodeService } from "./utils/tfa-code.js";
import type { VerifyTokenService } from "./utils/verify-token.js";
import type { VerificationEmailSender } from "./gateways/notification.js";
import type { RouteRegistry } from "./route-registry.js";
import { createGatewayRoutes } from "./routes/gateways/index.js";
import type { GatewayRegistry } from "./gateway-registry.js";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const isDebug = LOG_LEVEL === "debug";
function logEvent(
    level: "debug" | "info" | "warn",
    message: string,
    meta: Record<string, unknown>,
) {
    if (level === "debug" && !isDebug) return;
    if (level === "info" && LOG_LEVEL === "warn") return;
    if (level === "info" && LOG_LEVEL === "error") return;
    if (level === "warn" && LOG_LEVEL === "error") return;
    const sink =
        level === "warn"
            ? console.warn
            : level === "info"
              ? console.info
              : console.debug;
    sink(
        JSON.stringify({
            ts: new Date().toISOString(),
            level,
            component: "api",
            message,
            ...meta,
        }),
    );
}

export interface ApiDependencies {
    moduleRuntimeGateway: ModuleRuntimeGateway;
    authGateway: AuthGateway;
    accountStore: LocalAccountStore;
    preferenceStore: UserPreferenceStore;
    profileStore?: DbProfileStore;
    fileGateway?: FileStorageGateway;
    notifStore?: DbNotificationStore;
    tfaService?: TfaCodeService;
    verificationEmailSender?: VerificationEmailSender;
    verifyTokenService?: VerifyTokenService;
    externalHost?: string;
    routeRegistry?: RouteRegistry;
    gatewayRegistry?: GatewayRegistry;
    moduleIntegrityChecker?: () => Promise<
        Array<{
            moduleId: string;
            file: string;
            expected: string;
            actual: string | null;
            status: "ok" | "mismatch" | "missing";
        }>
    >;
    loadModuleStates?: () => Promise<
        Array<{ moduleId: string; enabled: boolean }>
    >;
    persistModuleState?: (moduleId: string, enabled: boolean) => Promise<void>;
}

export function buildServer(deps: ApiDependencies) {
    const moduleService = new ModuleService(deps.moduleRuntimeGateway);
    const healthService = new HealthService();
    const enabledModules = new Set<string>();

    const moduleExtensionRoutes = createModuleExtensionRoutes(
        deps.moduleRuntimeGateway,
        (moduleId) => enabledModules.has(moduleId),
    );

    const moduleRoutes = createModuleRoutes(moduleService, {
        onEnabled: async (moduleId) => {
            enabledModules.add(moduleId);
            await deps.persistModuleState?.(moduleId, true);
            await moduleExtensionRoutes.refresh();
        },
        onDisabled: async (moduleId) => {
            enabledModules.delete(moduleId);
            await deps.persistModuleState?.(moduleId, false);
            await moduleExtensionRoutes.refresh();
        },
        getStatus: (moduleId) =>
            enabledModules.has(moduleId) ? "enabled" : "disabled",
        getIntegrityReport: deps.moduleIntegrityChecker,
    });
    const systemRoutes = createSystemRoutes(
        healthService,
        deps.preferenceStore,
    );
    const docsRoutes = createDocsRoutes();
    const uiRoutes = createUiRoutes(deps.moduleRuntimeGateway);
    const authRoutes = createAuthRoutes(
        deps.authGateway,
        deps.accountStore,
        deps.profileStore,
    );
    const preferencesRoutes = createPreferencesRoutes(deps.preferenceStore);
    const userRoutes = createUserRoutes(
        deps.accountStore,
        deps.preferenceStore,
        deps.profileStore,
        deps.notifStore,
        deps.tfaService,
        deps.verificationEmailSender,
        deps.verifyTokenService,
        deps.externalHost,
    );
    const profileRoutes =
        deps.profileStore && deps.fileGateway
            ? createProfileRoutes(deps.profileStore, deps.fileGateway)
            : null;
    const socialRoutes = deps.profileStore
        ? createSocialRoutes(deps.profileStore)
        : null;
    const postRoutes = deps.profileStore
        ? createPostRoutes(deps.profileStore)
        : null;
    const fileRoutes =
        deps.profileStore && deps.fileGateway
            ? createFileRoutes(deps.profileStore, deps.fileGateway)
            : null;
    const gatewayRoutes = deps.gatewayRegistry
        ? createGatewayRoutes(deps.gatewayRegistry)
        : null;

    Promise.all([
        deps.moduleRuntimeGateway.listManifests(),
        deps.loadModuleStates?.() ?? Promise.resolve([]),
    ])
        .then(([manifests, savedStates]) => {
            const saved = new Map(
                savedStates.map((row) => [row.moduleId, row.enabled]),
            );
            for (const manifest of manifests) {
                const persisted = saved.get(manifest.id);
                if (manifest.class === "core" || persisted === true)
                    enabledModules.add(manifest.id);
            }
            return moduleExtensionRoutes.refresh();
        })
        .catch(() => undefined);

    return createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const startedAt = Date.now();
        logEvent("debug", "Incoming API request.", {
            method: req.method ?? "GET",
            path: url.pathname,
        });

        try {
            const handledByModule = await moduleRoutes(req, res, url);
            if (handledByModule) {
                logEvent(
                    (req.method ?? "GET") === "GET" ? "debug" : "info",
                    "Request handled by module routes.",
                    {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    },
                );
                return;
            }

            const handledBySystem = await systemRoutes(req, res, url);
            if (handledBySystem) {
                logEvent(
                    (req.method ?? "GET") === "GET" ? "debug" : "info",
                    "Request handled by system routes.",
                    {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    },
                );
                return;
            }

            const handledByAuth = await authRoutes(req, res, url);
            if (handledByAuth) {
                logEvent("info", "Request handled by auth routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByPreferences = await preferencesRoutes(req, res, url);
            if (handledByPreferences) {
                logEvent("info", "Request handled by preferences routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByUsers = await userRoutes(req, res, url);
            if (handledByUsers) {
                logEvent("info", "Request handled by user routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            if (gatewayRoutes) {
                const handledByGateways = await gatewayRoutes(req, res, url);
                if (handledByGateways) {
                    logEvent("info", "Request handled by gateway routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            // Gateway-registered route handlers run after core routes but before
            // profile/social/post/file routes. Precedence: core → gateway registry
            // → profile/social/posts/files → module extensions → docs → UI.
            for (const handler of deps.routeRegistry?.getHandlers() ?? []) {
                const handledByRegistry = await handler(req, res, url);
                if (handledByRegistry) {
                    logEvent("info", "Request handled by registered route.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            if (profileRoutes) {
                const handledByProfile = await profileRoutes(req, res, url);
                if (handledByProfile) {
                    logEvent("info", "Request handled by profile routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            if (socialRoutes) {
                const handledBySocial = await socialRoutes(req, res, url);
                if (handledBySocial) {
                    logEvent("info", "Request handled by social routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            if (postRoutes) {
                const handledByPosts = await postRoutes(req, res, url);
                if (handledByPosts) {
                    logEvent("info", "Request handled by post routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            if (fileRoutes) {
                const handledByFiles = await fileRoutes(req, res, url);
                if (handledByFiles) {
                    logEvent("info", "Request handled by file routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            const handledByExtensions = await moduleExtensionRoutes.handle(
                req,
                res,
                url,
            );
            if (handledByExtensions) {
                logEvent(
                    "info",
                    "Request handled by module extension routes.",
                    {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    },
                );
                return;
            }

            const handledByDocs = await docsRoutes(req, res, url);
            if (handledByDocs) {
                logEvent("debug", "Request handled by docs routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByUi = await uiRoutes(req, res, url);
            if (handledByUi) {
                logEvent("debug", "Request handled by UI routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Route not found" },
                }),
            );
            logEvent("warn", "Request resulted in 404.", {
                method: req.method ?? "GET",
                path: url.pathname,
                durationMs: Date.now() - startedAt,
            });
        } catch (error) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    },
                }),
            );
            logEvent("warn", "Request failed with handled error response.", {
                method: req.method ?? "GET",
                path: url.pathname,
                durationMs: Date.now() - startedAt,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
}
