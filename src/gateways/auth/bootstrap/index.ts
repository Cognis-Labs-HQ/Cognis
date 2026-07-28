import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import {
    createDefaultRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import {
    type CapabilityStore,
    type GatewayBootstrapContext,
} from "../../shared.js";
import { type AccessRole } from "../access-tokens.js";
import { CoreAuthGateway } from "../gateway.js";
import { DbKeyringVaultStore } from "../keyring-store.js";
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
    ensureExternalAccount?(identity: {
        accountId: string;
        provider: string;
        externalUserId: string;
        email?: string;
        displayName?: string;
        role?: string;
    }): Promise<void>;
    getInfo(username: string): Promise<{
        username: string;
        enabled: boolean;
        role?: string;
    } | null>;
    setFounder(username: string, isFounder: boolean): Promise<void>;
    /**
     * Registers a new account. Optional — only implemented by stores that
     * support local account creation (e.g. local/LDAP adapters). Absent on
     * read-only or SSO-only stores. Returns the created account record.
     */
    register?(
        username: string,
        password: string,
        isAdmin: boolean,
    ): Promise<{ username: string; role?: string }>;
    /**
     * Enables or disables an account. Optional — only available on stores that
     * support toggling account status. Absent on read-only stores.
     */
    setEnabled?(username: string, enabled: boolean): Promise<void>;
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

export interface SecuritySettings {
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
}

export interface AuthBootstrapHookContext {
    accountStore: AuthAccountStore;
    authGateway: CoreAuthGateway;
    ctx: GatewayBootstrapContext;
    routeContext: RouteContext;
    authRouteBootstrapRuntime: AuthRouteBootstrapRuntime;
    readSecuritySettings: () => Promise<SecuritySettings>;
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
    const dbExecutor = ctx.capabilities.require<DbExecutor>("db:executor");

    const accountStore = await loadLocalAccountStore(dbExecutor, ctx.log);
    await accountStore.ensureSchema();
    ctx.log?.("info", "Auth gateway account schema ready.", {
        component: "auth-gateway",
    });

    const authGateway = new CoreAuthGateway(dbExecutor);
    await authGateway.ensureSchema();
    const keyringVaultStore = new DbKeyringVaultStore(dbExecutor);
    await keyringVaultStore.ensureSchema();
    ctx.capabilities.contribute("auth:keyringVaultStore", keyringVaultStore);
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
            const packageRaw = await readFile(
                path.resolve(localAdapterPath, "..", "package.json"),
                "utf8",
            );
            const packageJson = JSON.parse(packageRaw) as { version?: string };
            if (packageJson.version) {
                Object.assign(localAdapter, { version: packageJson.version });
            }
            const manifestRaw = await readFile(
                path.resolve(localAdapterPath, "..", "manifest.json"),
                "utf8",
            );
            const manifest = JSON.parse(manifestRaw) as {
                publisher?: string;
            };
            if (manifest.publisher) {
                Object.assign(localAdapter, { publisher: manifest.publisher });
            }
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
    for (const adapter of authGateway.listAdapters()) {
        const adapterUiDirectory = path.join(
            authAdaptersRoot,
            adapter.id,
            "ui",
        );
        if (existsSync(adapterUiDirectory)) {
            ctx.uiRegistry?.registerAdapterStaticDir(
                "auth",
                adapter.id,
                adapterUiDirectory,
            );
        }
    }
    await authGateway.loadPersistedConfigs();
    ctx.log?.("info", "Authentication adapters discovered and configured.", {
        component: "auth-gateway",
        adaptersRoot: authAdaptersRoot,
        adapterCount: authGateway.listAdapters().length,
    });

    ctx.capabilities.contribute(
        "auth:confirmPassword",
        (accountId: string, password: string, providerId?: string) =>
            authGateway.confirmPassword(accountId, password, providerId),
    );

    const authRouteBootstrapRuntime = createAuthRouteBootstrapRuntime();
    await runAuthRouteBootstrapHooks({
        capabilities: ctx.capabilities,
        runtime: authRouteBootstrapRuntime,
    });

    async function readSecuritySettings(): Promise<SecuritySettings> {
        const preferenceStore =
            ctx.capabilities.get<UserPreferenceStore>("preferences:store");
        if (!preferenceStore) {
            return { registrationsEnabled: false, userValidationMode: "none" };
        }
        const raw = await preferenceStore.get(
            "__system__",
            "security-settings",
        );
        if (!raw) {
            return { registrationsEnabled: false, userValidationMode: "none" };
        }
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            return {
                registrationsEnabled:
                    typeof parsed.registrationsEnabled === "boolean"
                        ? parsed.registrationsEnabled
                        : false,
                userValidationMode:
                    parsed.userValidationMode === "smtp" ? "smtp" : "none",
            };
        } catch {
            return { registrationsEnabled: false, userValidationMode: "none" };
        }
    }

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
            readSecuritySettings,
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

    ctx.routeRegistry.registerPrefix("/api/v1/auth", "auth");
    ctx.gatewayRegistry.register({
        id: "auth",
        name: "Authentication Gateway",
        version: "1.7.15",
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
    ctx.uiRegistry?.registerSettingsSection({
        id: "keyring",
        label: "Keyring",
        scriptUrl: "/static/gateways/auth/keyring-settings.js",
        stringsBaseUrl: "/static/gateways/auth/languages",
    });

    const routeContext: RouteContext = createDefaultRouteContext({
        getCapability: ctx.capabilities.get.bind(ctx.capabilities),
        requireCapability: ctx.capabilities.require.bind(ctx.capabilities),
        flow: ctx.flow,
    });
    await runAuthBootstrapHooks({
        accountStore,
        authGateway,
        ctx,
        routeContext,
        authRouteBootstrapRuntime,
        readSecuritySettings,
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
