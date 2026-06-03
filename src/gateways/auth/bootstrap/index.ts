import path from "node:path";
import type { IncomingMessage } from "node:http";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import {
    canAccessUserData,
    getAuthClaims,
    getCookieSession,
    hasMinRole,
    requireAuth,
    requireRoleAccess,
    setPageSecurityHeaders,
    type CapabilityStore,
    type GatewayBootstrapContext,
} from "../../shared.js";
import {
    lookupAccessToken,
    revokeAccessTokensForSubject,
    type AccessRole,
} from "../access-tokens.js";
import { CoreAuthGateway } from "../gateway.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import { createAdapterAdminRoutes } from "./adapter-admin-routes.js";
import {
    createAuthGatewayRoutes,
    type SecuritySubsection,
} from "./auth-routes.js";
import { loadLocalAccountStore } from "./local-account.js";
import { createAuthRouteBootstrapRuntime } from "./route-runtime.js";
import { runBootstrapDirectoryHooks } from "../../reuse/bootstrap-loader.js";

export interface AuthAccountStore {
    ensureSchema(): Promise<void>;
    has(username: string): Promise<boolean>;
    delete(username: string): Promise<void>;
    isFounder(username: string): Promise<boolean>;
    verify(username: string, password: string): Promise<boolean>;
    getDisplayName(username: string): Promise<string | null>;
    getInfo(username: string): Promise<{
        username: string;
        enabled: boolean;
        role?: string;
    } | null>;
    setFounder(username: string, isFounder: boolean): Promise<void>;
}

export interface PendingTfaLoginAttempt {
    id: string;
    accountId: string;
    role: AccessRole;
    isFounder: boolean;
    provider: string;
    providerId: string;
    displayName: string;
    userValidationMode: "none" | "smtp";
    requiredUserValidation: boolean;
    expiresAt: number;
}

export interface AuthBootstrapHookContext {
    accountStore: AuthAccountStore;
    authGateway: CoreAuthGateway;
    ctx: GatewayBootstrapContext;
    routeContext: RouteContext;
}

export interface AuthRouteBootstrapRuntime {
    buildAccessTokenCookie: (
        req: IncomingMessage,
        rawToken: string,
        ttlSeconds: number | null,
    ) => string;
    clearPendingTfaLoginAttempt: (loginAttemptId: string) => void;
    createPendingTfaLoginAttempt: (
        input: Omit<PendingTfaLoginAttempt, "id" | "expiresAt">,
    ) => PendingTfaLoginAttempt;
    getAccessTokenTtlSeconds: () => number;
    getPendingTfaLoginAttempt: (
        loginAttemptId: string,
    ) => PendingTfaLoginAttempt | null;
}

export interface AuthRouteBootstrapHookContext {
    capabilities: CapabilityStore;
    runtime: AuthRouteBootstrapRuntime;
}

const bootstrapDirectoryUrl = new URL(".", import.meta.url);

export async function runAuthBootstrapHooks(
    context: AuthBootstrapHookContext,
): Promise<void> {
    await runBootstrapDirectoryHooks({
        context,
        directoryUrl: bootstrapDirectoryUrl,
        exportName: "registerAuthBootstrapHook",
    });
}

export async function runAuthRouteBootstrapHooks(
    context: AuthRouteBootstrapHookContext,
): Promise<void> {
    await runBootstrapDirectoryHooks({
        context,
        directoryUrl: bootstrapDirectoryUrl,
        exportName: "registerAuthRouteBootstrapHook",
    });
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor =
        ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor;
    if (!dbExecutor) {
        throw new Error("db_executor_unavailable");
    }

    const accountStore = await loadLocalAccountStore(dbExecutor, ctx.log);
    await accountStore.ensureSchema();
    ctx.log?.("info", "Auth gateway account schema ready.", {
        component: "auth-gateway",
    });

    const authGateway = new CoreAuthGateway(dbExecutor);
    await authGateway.ensureSchema();
    ctx.log?.("info", "Auth gateway adapter schema ready.", {
        component: "auth-gateway",
    });

    const localAdapterPath = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "auth",
        "local",
        "index.ts",
    );
    try {
        const mod = await import(`${localAdapterPath}?t=${Date.now()}`);
        if (typeof mod.createAdapter === "function") {
            const localAdapter = mod.createAdapter(accountStore);
            authGateway.setLocalAdapter(localAdapter);
            ctx.log?.("info", "Loaded local authentication adapter.", {
                component: "auth-gateway",
                adapterId: "local",
            });
        }
    } catch (error) {
        ctx.log?.("warn", "Local authentication adapter could not be loaded.", {
            component: "auth-gateway",
            adapterId: "local",
            error: error instanceof Error ? error.message : String(error),
        });
    }

    const authAdaptersRoot = path.join(ctx.adaptersRoot, "auth");
    await authGateway.discoverAdapters(authAdaptersRoot);
    await authGateway.loadPersistedConfigs();
    ctx.log?.("info", "Authentication adapters discovered and configured.", {
        component: "auth-gateway",
        adaptersRoot: authAdaptersRoot,
        adapterCount: authGateway.listAdapters().length,
    });

    const authRouteBootstrapRuntime = createAuthRouteBootstrapRuntime();
    await runAuthRouteBootstrapHooks({
        capabilities: ctx.capabilities,
        runtime: authRouteBootstrapRuntime,
    });

    const securitySubsections: SecuritySubsection[] = [];
    ctx.capabilities.contribute(
        "auth:registerSecuritySection",
        (section: SecuritySubsection) => {
            securitySubsections.push(section);
        },
    );

    ctx.routeRegistry.register(
        createAuthGatewayRoutes(
            authGateway,
            accountStore,
            ctx.capabilities,
            authRouteBootstrapRuntime,
            securitySubsections,
            ctx.log,
        ),
        "auth",
    );
    ctx.routeRegistry.register(
        createAdapterAdminRoutes("auth", authGateway, ctx.log),
        "auth",
    );
    ctx.log?.("info", "Auth gateway routes registered.", {
        component: "auth-gateway",
    });

    ctx.gatewayRegistry.register({
        id: "auth",
        name: "Authentication Gateway",
        version: "1.4.6",
        description: "Manages authentication providers and user login.",
        publisher: "Cognis Labs HQ",
        required: true,
        hasAdapters: true,
    });

    const uiDir = path.resolve(process.cwd(), "src", "gateways", "auth", "ui");
    ctx.uiRegistry?.registerStaticDir("auth", uiDir);
    ctx.uiRegistry?.registerSettingsSection({
        id: "security",
        label: "Security",
        scriptUrl: "/static/gateways/auth/security-prefs/index.js",
        stringsBaseUrl: "/static/gateways/auth/languages",
    });

    const routeContext: RouteContext = {
        getAuthClaims,
        requireAuth,
        requireRoleAccess,
        canAccessUserData,
        hasMinRole,
        getCookieSession,
        setPageSecurityHeaders,
        lookupAccessToken,
        revokeAccessTokensForSubject,
    };
    await runAuthBootstrapHooks({
        accountStore,
        authGateway,
        ctx,
        routeContext,
    });

    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    if (typeof registerNotificationCategory === "function") {
        registerNotificationCategory("security", "Security");
    }

    ctx.log?.("info", "Auth gateway initialized.", {
        component: "auth-gateway",
        adapterCount: authGateway.listAdapters().length,
    });
}
