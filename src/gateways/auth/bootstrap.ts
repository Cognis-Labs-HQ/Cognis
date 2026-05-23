import path from "node:path";
import {
    canAccessUserData,
    getAuthClaims,
    getCookieSession,
    hasMinRole,
    registerPageScriptOrigins,
    requireAuth,
    requireRoleAccess,
    readJson,
    setPageSecurityHeaders,
    CapabilityStore,
    type GatewayBootstrapContext,
} from "../shared.js";
import {
    buildAccessTokenCookie,
    extractBearerToken,
    extractCookieToken,
    shouldSetSecureCookie,
} from "../../api/reuse/access-token-http.js";
import {
    issueAccessToken,
    lookupAccessToken,
    isTokenVerificationFresh,
    recordTokenVerification,
    revokeAccessToken,
    revokeAccessTokensForSubject,
    type AccessRole,
} from "./access-tokens.js";
import { CoreAuthGateway } from "./gateway.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    AuthPendingSession,
    AuthProviderAdapter,
    AuthTfaMethodRegistration,
} from "./gateway.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { UserPreferenceStore } from "../../api/reuse/preference-store.js";
import type { RouteContext } from "../../api/reuse/route-context.js";
import { validateUsername } from "../../api/reuse/account-store.js";
import {
    parseSecuritySettings,
    SECURITY_SETTINGS_KEY,
    type SecuritySettings,
} from "../../api/reuse/security-settings.js";
import {
    AUTH_PASSWORD_POLICY_KEY,
    defaultPasswordPolicy,
    parsePasswordPolicy,
} from "./password-policy.js";

interface AuthAccountStore {
    ensureSchema(): Promise<void>;
    has(username: string): Promise<boolean>;
    delete(username: string): Promise<void>;
    isFounder(username: string): Promise<boolean>;
    verify(username: string, password: string): Promise<boolean>;
    getDisplayName(username: string): Promise<string | null>;
}

const TFA_ONBOARDING_PENDING_PREF_KEY = "auth-tfa-onboarding-pending";

interface ResolvedTfaMethod {
    id: string;
    name: string;
    settingsPath: string;
    requiresVerifiedEmail: boolean;
    available: boolean;
    configured: boolean;
}

async function loadLocalAccountStore(
    dbExecutor: DbExecutor,
    log?: GatewayBootstrapContext["log"],
): Promise<AuthAccountStore> {
    const localStorePath = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "auth",
        "local",
        "store.ts",
    );
    const localStoreModule = await import(`${localStorePath}?t=${Date.now()}`);
    const LocalAccountStoreClass = localStoreModule.DbLocalAccountStore as
        | (new (
              dbExecutor: DbExecutor,
              log?: GatewayBootstrapContext["log"],
          ) => AuthAccountStore)
        | undefined;
    if (!LocalAccountStoreClass) {
        throw new Error("local_account_store_missing");
    }
    return new LocalAccountStoreClass(dbExecutor, log);
}

function resolveRole(sessionRole: string | undefined): AccessRole {
    if (
        sessionRole === "owner" ||
        sessionRole === "admin" ||
        sessionRole === "teacher" ||
        sessionRole === "moderator" ||
        sessionRole === "user"
    ) {
        return sessionRole;
    }
    return "user";
}

function isCredentialLoginAdapter(adapter: AuthProviderAdapter): boolean {
    return adapter.supportsCredentialLogin !== false;
}

function isEmailTfaAdapter(
    adapter: AuthProviderAdapter | null,
): adapter is AuthProviderAdapter & {
    shouldRequireEmailTfa(accountId: string): Promise<boolean>;
    beginEmailTfaLoginChallenge(
        session: AuthPendingSession,
    ): Promise<{ challengeId: string }>;
    completeEmailTfaLoginChallenge(
        challengeId: string,
        code: string,
    ): Promise<AuthPendingSession | null>;
    getEmailTfaState(accountId: string): Promise<{
        enabled: boolean;
        enforced: boolean;
        available: boolean;
    }>;
    setEmailTfaEnabled(accountId: string, enabled: boolean): Promise<void>;
} {
    return Boolean(
        adapter &&
        typeof adapter.shouldRequireEmailTfa === "function" &&
        typeof adapter.beginEmailTfaLoginChallenge === "function" &&
        typeof adapter.completeEmailTfaLoginChallenge === "function" &&
        typeof adapter.getEmailTfaState === "function" &&
        typeof adapter.setEmailTfaEnabled === "function",
    );
}

function hasEmailTfaRegistrationHook(
    adapter: AuthProviderAdapter,
): adapter is AuthProviderAdapter & {
    onAccountRegistered(accountId: string): Promise<void>;
} {
    return typeof adapter.onAccountRegistered === "function";
}

function hasEmailTfaResetHook(
    adapter: AuthProviderAdapter | null,
): adapter is AuthProviderAdapter & {
    resetEmailTfa(accountId: string): Promise<void>;
} {
    return Boolean(adapter && typeof adapter.resetEmailTfa === "function");
}

function findTfaAdapter(
    authGateway: CoreAuthGateway,
    options: { enabledOnly: boolean },
):
    | (AuthProviderAdapter & {
          shouldRequireEmailTfa(accountId: string): Promise<boolean>;
          beginEmailTfaLoginChallenge(
              session: AuthPendingSession,
          ): Promise<{ challengeId: string }>;
          completeEmailTfaLoginChallenge(
              challengeId: string,
              code: string,
          ): Promise<AuthPendingSession | null>;
          getEmailTfaState(accountId: string): Promise<{
              enabled: boolean;
              enforced: boolean;
              available: boolean;
          }>;
          setEmailTfaEnabled(
              accountId: string,
              enabled: boolean,
          ): Promise<void>;
      })
    | null {
    function getRegisteredAdapters(): AuthProviderAdapter[] {
        return authGateway
            .listAdapters()
            .map((adapterInfo) => authGateway.getAdapter(adapterInfo.id))
            .filter(
                (adapter): adapter is AuthProviderAdapter => adapter !== null,
            );
    }
    const candidateAdapters = options.enabledOnly
        ? authGateway.getEnabledAdapters()
        : getRegisteredAdapters();
    const adapter = candidateAdapters.find((candidateAdapter) =>
        isEmailTfaAdapter(candidateAdapter),
    );
    if (!adapter || !isEmailTfaAdapter(adapter)) {
        return null;
    }
    return adapter;
}

async function readBooleanPreference(
    preferenceStore: UserPreferenceStore | undefined,
    accountId: string,
    key: string,
): Promise<boolean> {
    if (!preferenceStore) return false;
    const rawValue = await preferenceStore.get(accountId, key);
    if (!rawValue) return false;
    try {
        const parsed = JSON.parse(rawValue) as { enabled?: boolean };
        return parsed.enabled === true;
    } catch {
        return false;
    }
}

async function resolveTfaMethodsForAccount(
    methodRegistry: Map<string, AuthTfaMethodRegistration>,
    activeMethodIds: string[],
    accountId: string,
): Promise<ResolvedTfaMethod[]> {
    const methods: ResolvedTfaMethod[] = [];
    for (const methodId of activeMethodIds) {
        const registration = methodRegistry.get(methodId);
        if (!registration) continue;
        const available = (await registration.isAvailable()) === true;
        const configured =
            (await registration.isConfiguredForAccount(accountId)) === true;
        methods.push({
            id: registration.id,
            name: registration.name,
            settingsPath: registration.settingsPath,
            requiresVerifiedEmail: registration.requiresVerifiedEmail === true,
            available,
            configured,
        });
    }
    return methods;
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
    const tfaMethodRegistry = new Map<string, AuthTfaMethodRegistration>();
    ctx.capabilities.contribute(
        "auth:registerTfaMethod",
        (registration: AuthTfaMethodRegistration) => {
            tfaMethodRegistry.set(registration.id, registration);
        },
    );

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
    await authGateway.discoverAdapters(authAdaptersRoot, {
        capabilities: ctx.capabilities,
        log: ctx.log,
    });
    await authGateway.loadPersistedConfigs();
    ctx.log?.("info", "Authentication adapters discovered and configured.", {
        component: "auth-gateway",
        adaptersRoot: authAdaptersRoot,
        adapterCount: authGateway.listAdapters().length,
    });

    ctx.routeRegistry.register(
        createAuthGatewayRoutes(
            authGateway,
            accountStore,
            ctx.capabilities,
            tfaMethodRegistry,
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
        version: "1.4.0",
        description: "Manages authentication providers and user login.",
        publisher: "Cognis Labs",
        required: true,
        hasAdapters: true,
    });

    const uiDir = path.resolve(process.cwd(), "src", "gateways", "auth", "ui");
    ctx.uiRegistry?.registerStaticDir("auth", uiDir);
    ctx.uiRegistry?.registerSettingsSection({
        id: "security",
        label: "Security",
        scriptUrl: "/static/gateways/auth/security-prefs.js",
        stringsBaseUrl: "/static/gateways/auth/languages",
    });

    /**
     * auth:accountStore — account persistence surface consumed by
     * registration, notify, and admin flows.
     */
    ctx.capabilities.contribute("auth:accountStore", accountStore);
    /**
     * auth:registerPageScriptOrigins — CSP script-origin registration hook
     * for module/gateway pages.
     */
    ctx.capabilities.contribute(
        "auth:registerPageScriptOrigins",
        registerPageScriptOrigins,
    );
    /**
     * auth:createLocalAdmin — bootstrap helper that ensures the initial local
     * founder admin exists.
     */
    ctx.capabilities.contribute(
        "auth:createLocalAdmin",
        async (username: string, password: string) => {
            const localAdapter = authGateway.getLocalAdapter();
            if (!localAdapter) throw new Error("local_adapter_unavailable");
            const has = await accountStore.has(username);
            if (!has) {
                await localAdapter.register(username, password, "admin");
            }
            await accountStore.setFounder(username, true);
        },
    );
    /**
     * auth:getLoginMethods — lists enabled authentication adapters for login
     * UI/API consumers.
     */
    ctx.capabilities.contribute("auth:getLoginMethods", () =>
        authGateway
            .getEnabledAdapters()
            .filter((a) => isCredentialLoginAdapter(a))
            .map((a) => ({ id: a.id, name: a.name })),
    );
    ctx.capabilities.contribute(
        "auth:resetEmailTfaForUser",
        async (accountId: string) => {
            const adapter = findTfaAdapter(authGateway, {
                enabledOnly: false,
            });
            if (!hasEmailTfaResetHook(adapter)) return;
            await adapter.resetEmailTfa(accountId);
        },
    );
    /**
     * auth:issueAccessToken — issues an access token using the auth gateway's
     * token policy.
     */
    ctx.capabilities.contribute(
        "auth:issueAccessToken",
        (
            subject: string,
            role: AccessRole,
            ttlSeconds: number | null,
            options?: { issuedAt?: number },
        ) => issueAccessToken(subject, role, ttlSeconds, options),
    );
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
    /**
     * auth:routeContext — request auth/session/token helpers injected into
     * route factories and modules.
     */
    ctx.capabilities.contribute("auth:routeContext", routeContext);
    ctx.log?.("info", "Auth gateway initialized.", {
        component: "auth-gateway",
        adapterCount: authGateway.listAdapters().length,
    });
}

function createAuthGatewayRoutes(
    authGateway: CoreAuthGateway,
    accountStore: AuthAccountStore,
    capabilities: CapabilityStore,
    tfaMethodRegistry: Map<string, AuthTfaMethodRegistration>,
    log?: GatewayBootstrapContext["log"],
) {
    async function readSecuritySettings(): Promise<SecuritySettings> {
        const prefStore =
            capabilities.get<UserPreferenceStore>("preferences:store");
        if (!prefStore) {
            return (
                parseSecuritySettings(null) ?? {
                    trustedDomains: [],
                    registrationsEnabled: false,
                    userValidationMode: "none",
                    requireTeacherManualApproval: true,
                    activeTfaMethods: [],
                    enforceTfaForNewUsers: false,
                }
            );
        }
        const raw = await prefStore.get("__system__", SECURITY_SETTINGS_KEY);
        return (
            parseSecuritySettings(raw) ?? {
                trustedDomains: [],
                registrationsEnabled: false,
                userValidationMode: "none",
                requireTeacherManualApproval: true,
                activeTfaMethods: [],
                enforceTfaForNewUsers: false,
            }
        );
    }

    async function registrationsEnabled(): Promise<boolean> {
        const isPublicRegistrationEnabled = capabilities.get<() => boolean>(
            "registration:public:isEnabled",
        );
        return Boolean(isPublicRegistrationEnabled?.());
    }

    function getEnabledEmailTfaAdapter() {
        return findTfaAdapter(authGateway, { enabledOnly: true });
    }

    async function listRegisteredTfaMethodsForAdmin() {
        const methods = Array.from(tfaMethodRegistry.values());
        const rows = await Promise.all(
            methods.map(async (method) => ({
                id: method.id,
                name: method.name,
                settingsPath: method.settingsPath,
                requiresVerifiedEmail: method.requiresVerifiedEmail === true,
                available: (await method.isAvailable()) === true,
            })),
        );
        return rows;
    }

    async function resolveAccountTfaSetupState(accountId: string): Promise<{
        methods: ResolvedTfaMethod[];
        hasAvailableMethod: boolean;
        hasConfiguredMethod: boolean;
    }> {
        const securitySettings = await readSecuritySettings();
        const methods = await resolveTfaMethodsForAccount(
            tfaMethodRegistry,
            securitySettings.activeTfaMethods,
            accountId,
        );
        const hasAvailableMethod = methods.some((method) => method.available);
        const hasConfiguredMethod = methods.some((method) => method.configured);
        return { methods, hasAvailableMethod, hasConfiguredMethod };
    }

    async function clearPendingTfaOnboardingIfConfigured(accountId: string) {
        const preferenceStore =
            capabilities.get<UserPreferenceStore>("preferences:store");
        if (!preferenceStore) return;
        const setupState = await resolveAccountTfaSetupState(accountId);
        if (!setupState.hasConfiguredMethod) return;
        await preferenceStore.set(
            accountId,
            TFA_ONBOARDING_PENDING_PREF_KEY,
            JSON.stringify({ enabled: false }),
        );
    }

    const parsedTtlSeconds = Number.parseInt(
        process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS ?? "43200",
        10,
    );
    const accessTokenTtlSeconds =
        Number.isFinite(parsedTtlSeconds) && parsedTtlSeconds >= 1
            ? parsedTtlSeconds
            : 43200;

    function respondWithAuthSession(
        req: IncomingMessage,
        res: ServerResponse,
        session: AuthPendingSession,
        options?: {
            requiresTfaSetup?: boolean;
            tfaSetupMethods?: ResolvedTfaMethod[];
        },
    ) {
        const apiToken = issueAccessToken(
            session.accountId,
            session.role,
            accessTokenTtlSeconds,
            {
                providerId: session.providerId,
            },
        );
        res.writeHead(200, {
            "content-type": "application/json",
            "set-cookie": buildAccessTokenCookie(
                apiToken,
                accessTokenTtlSeconds,
                shouldSetSecureCookie(req),
            ),
        });
        res.end(
            JSON.stringify({
                data: {
                    accountId: session.accountId,
                    displayName: session.displayName,
                    provider: session.provider,
                    providerId: session.providerId,
                    role: session.role,
                    isFounder: session.isFounder,
                    token: apiToken,
                    userValidationMode: session.userValidationMode,
                    requiredUserValidation: session.requiredUserValidation,
                    requiresTfaSetup: options?.requiresTfaSetup === true,
                    tfaSetupMethods: options?.tfaSetupMethods ?? [],
                },
            }),
        );
    }

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta = {
            component: "auth-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
        };
        if (
            url.pathname === "/api/v1/auth/login-methods" &&
            req.method === "GET"
        ) {
            const methods = authGateway
                .getEnabledAdapters()
                .filter((a) => isCredentialLoginAdapter(a))
                .map((a) => ({
                    id: a.id,
                    name: a.name,
                }));
            log?.("debug", "Listed login methods.", {
                ...logMeta,
                count: methods.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: methods }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/tfa/methods" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const methods = await listRegisteredTfaMethodsForAdmin();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: methods }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/tfa/setup-status" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const securitySettings = await readSecuritySettings();
            const setupState = await resolveAccountTfaSetupState(claims.sub);
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            const pendingOnboarding = await readBooleanPreference(
                preferenceStore,
                claims.sub,
                TFA_ONBOARDING_PENDING_PREF_KEY,
            );
            const requiresSetup =
                pendingOnboarding &&
                securitySettings.enforceTfaForNewUsers === true &&
                setupState.hasAvailableMethod &&
                !setupState.hasConfiguredMethod;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        required: requiresSetup,
                        enforceForNewUsers:
                            securitySettings.enforceTfaForNewUsers === true,
                        methods: setupState.methods,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/registration-config" &&
            req.method === "GET"
        ) {
            const enabled = await registrationsEnabled();
            log?.("debug", "Read registration config.", {
                ...logMeta,
                registrationsEnabled: enabled,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        registrationsEnabled: enabled,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/password-policy" &&
            req.method === "GET"
        ) {
            const prefStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            let policy = defaultPasswordPolicy();
            if (prefStore) {
                const raw = await prefStore
                    .get("__system__", AUTH_PASSWORD_POLICY_KEY)
                    .catch(() => null);
                if (raw) {
                    try {
                        policy = parsePasswordPolicy(JSON.parse(raw));
                    } catch {
                        policy = defaultPasswordPolicy();
                    }
                }
            }
            log?.("debug", "Served password policy.", logMeta);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: policy }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/password-policy" &&
            req.method === "PUT"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            const policy = parsePasswordPolicy(body);
            const prefStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            if (prefStore) {
                await prefStore.set(
                    "__system__",
                    AUTH_PASSWORD_POLICY_KEY,
                    JSON.stringify(policy),
                );
            }
            log?.("info", "Updated password policy.", {
                ...logMeta,
                accountId: claims.sub,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/register" && req.method === "POST") {
            if (!(await registrationsEnabled())) {
                log?.(
                    "warn",
                    "Blocked public registration because registrations are disabled.",
                    logMeta,
                );
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "registrations_disabled",
                            message: "Open registration is disabled",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            const username = String(body.username ?? "");
            const password = String(body.password ?? "");
            const email = String(body.email ?? "");
            const displayName = String(body.displayName ?? "").trim();
            if (!username || !password) {
                log?.(
                    "warn",
                    "Rejected public registration with missing credentials.",
                    {
                        ...logMeta,
                        username,
                    },
                );
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "username and password are required",
                        },
                    }),
                );
                return true;
            }
            const usernameError = validateUsername(username);
            if (usernameError) {
                log?.(
                    "warn",
                    "Rejected public registration with invalid username.",
                    { ...logMeta, username, usernameError },
                );
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: usernameError,
                            message: "Invalid username format.",
                        },
                    }),
                );
                return true;
            }
            const registerPublic = capabilities.get<
                (input: {
                    username: string;
                    password: string;
                    email?: string;
                    displayName?: string;
                }) => Promise<{
                    username: string;
                    role?: string;
                    enabled: boolean;
                }>
            >("registration:public:register");
            if (!registerPublic) {
                log?.(
                    "warn",
                    "Blocked public registration because registration capability is unavailable.",
                    logMeta,
                );
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "registration_unavailable",
                            message: "Public registration is not available",
                        },
                    }),
                );
                return true;
            }
            const result = await registerPublic({
                username,
                password,
                email,
                displayName: displayName || undefined,
            });
            const emailTfaAdapter = findTfaAdapter(authGateway, {
                enabledOnly: false,
            });
            if (
                emailTfaAdapter &&
                hasEmailTfaRegistrationHook(emailTfaAdapter)
            ) {
                await emailTfaAdapter.onAccountRegistered(result.username);
            }
            const securitySettings = await readSecuritySettings();
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            if (
                preferenceStore &&
                securitySettings.enforceTfaForNewUsers === true
            ) {
                const setupState = await resolveAccountTfaSetupState(
                    result.username,
                );
                await preferenceStore.set(
                    result.username,
                    TFA_ONBOARDING_PENDING_PREF_KEY,
                    JSON.stringify({
                        enabled: setupState.hasAvailableMethod,
                    }),
                );
            }
            const verifyToken = issueAccessToken(
                result.username,
                result.role ?? "user",
                1800,
            );

            const hasVerifiedEmail = capabilities.get<
                (accountId: string) => Promise<boolean>
            >("notify:hasVerifiedEmail");
            if (hasVerifiedEmail) {
                const FIVE_MINUTES_MS = 5 * 60 * 1000;
                const timer = setTimeout(async () => {
                    try {
                        const verified = await hasVerifiedEmail(
                            result.username,
                        );
                        if (!verified) {
                            await accountStore.delete(result.username);
                            ctx.log?.(
                                "info",
                                "Deleted unverified account after 5-minute window.",
                                {
                                    component: "auth-gateway",
                                    accountId: result.username,
                                },
                            );
                        }
                    } catch (error) {
                        ctx.log?.(
                            "warn",
                            "Failed to clean up unverified account after 5-minute window.",
                            {
                                component: "auth-gateway",
                                accountId: result.username,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    }
                }, FIVE_MINUTES_MS);
                timer.unref();
            }

            log?.("info", "Registered public account.", {
                ...logMeta,
                accountId: result.username,
                hasEmail: Boolean(email),
                hasDisplayName: Boolean(displayName),
            });
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ...result, verifyToken } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/smtp-tfa/settings" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const adapter = getEnabledEmailTfaAdapter();
            if (!adapter) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: {
                            enabled: false,
                            enforced: false,
                            available: false,
                        },
                    }),
                );
                return true;
            }
            const state = await adapter.getEmailTfaState(claims.sub);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: state }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/smtp-tfa/settings" &&
            req.method === "PUT"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const adapter = getEnabledEmailTfaAdapter();
            if (!adapter) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Email TFA adapter is not enabled",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            await adapter.setEmailTfaEnabled(claims.sub, body.enabled === true);
            if (body.enabled === true) {
                await clearPendingTfaOnboardingIfConfigured(claims.sub);
            }
            const state = await adapter.getEmailTfaState(claims.sub);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: state }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/smtp-tfa/verify-login" &&
            req.method === "POST"
        ) {
            const adapter = getEnabledEmailTfaAdapter();
            if (!adapter) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Email TFA adapter is not enabled",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            const challengeId = String(body.challengeId ?? "").trim();
            const code = String(body.code ?? "").trim();
            if (!challengeId || !code) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "challengeId and code are required",
                        },
                    }),
                );
                return true;
            }
            const pendingSession = await adapter.completeEmailTfaLoginChallenge(
                challengeId,
                code,
            );
            if (!pendingSession) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_credentials",
                            message:
                                "Invalid or expired login verification code",
                        },
                    }),
                );
                return true;
            }
            const localAdapter = authGateway.getLocalAdapter();
            if (localAdapter) {
                await localAdapter
                    .updateLastLogin(pendingSession.accountId)
                    .catch(() => undefined);
            }
            await clearPendingTfaOnboardingIfConfigured(
                pendingSession.accountId,
            );
            const securitySettings = await readSecuritySettings();
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            const pendingOnboarding = await readBooleanPreference(
                preferenceStore,
                pendingSession.accountId,
                TFA_ONBOARDING_PENDING_PREF_KEY,
            );
            const tfaSetupState = await resolveAccountTfaSetupState(
                pendingSession.accountId,
            );
            const requiresTfaSetup =
                pendingOnboarding &&
                securitySettings.enforceTfaForNewUsers === true &&
                tfaSetupState.hasAvailableMethod &&
                !tfaSetupState.hasConfiguredMethod;
            log?.("info", "Login succeeded after email TFA challenge.", {
                ...logMeta,
                accountId: pendingSession.accountId,
                provider: pendingSession.provider,
                role: pendingSession.role,
                requiresTfaSetup,
            });
            respondWithAuthSession(req, res, pendingSession, {
                requiresTfaSetup,
                tfaSetupMethods: tfaSetupState.methods,
            });
            return true;
        }

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const provider = String(body.provider ?? "local");
            const requestedAdapter = authGateway.getEnabledAdapter(provider);
            const fallbackAdapter = authGateway.getEnabledAdapter("local");
            const adapter =
                (requestedAdapter && isCredentialLoginAdapter(requestedAdapter)
                    ? requestedAdapter
                    : null) ??
                (fallbackAdapter && isCredentialLoginAdapter(fallbackAdapter)
                    ? fallbackAdapter
                    : null);
            if (!adapter) {
                log?.(
                    "warn",
                    "Login failed because no authentication adapter was available.",
                    {
                        ...logMeta,
                        provider,
                    },
                );
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unavailable",
                            message: "Auth provider not available",
                        },
                    }),
                );
                return true;
            }
            const credentials: Record<string, unknown> = { ...body };
            delete credentials.provider;
            const session = await adapter.authenticate(credentials);
            if (!session) {
                log?.("warn", "Login failed due to invalid credentials.", {
                    ...logMeta,
                    provider,
                });
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_credentials",
                            message: "Invalid credentials",
                        },
                    }),
                );
                return true;
            }
            let role = resolveRole(session.role);
            const profileStore = capabilities.get<{
                getProfile(
                    accountId: string,
                ): Promise<{ role?: string } | null>;
            }>("social:profileStore");
            if (profileStore) {
                const existingProfile = await profileStore
                    .getProfile(session.accountId)
                    .catch(() => null);
                if (existingProfile?.role === "owner") {
                    role = "owner";
                }
            }
            const isFounder = await accountStore
                .isFounder(session.accountId)
                .catch((error) => {
                    ctx.log?.(
                        "warn",
                        "Failed to resolve founder status during login.",
                        {
                            component: "auth-gateway",
                            accountId: session.accountId,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                    // Founder status only affects owner elevation and optional UI routing; keep login available on lookup failure.
                    return false;
                });
            if (isFounder && (role === "admin" || role === "owner")) {
                role = "owner";
            }
            const createProfile = capabilities.get<
                (
                    accountId: string,
                    handle: string,
                    role?: string,
                    displayName?: string,
                ) => Promise<void>
            >("profile:createProfile");
            const accountDisplayName =
                (
                    await accountStore.getDisplayName(session.accountId)
                )?.trim() || undefined;
            await createProfile?.(
                session.accountId,
                session.accountId,
                role,
                accountDisplayName,
            );
            const securitySettings = await readSecuritySettings();
            const canSendVerificationEmail = capabilities.get<() => boolean>(
                "notify:canSendVerificationEmail",
            );
            const isInitialAdmin =
                (role === "admin" || role === "owner") && isFounder;
            const shouldRequireSmtpValidation =
                securitySettings.userValidationMode === "smtp" &&
                !isInitialAdmin;
            const requiresUserValidation = shouldRequireSmtpValidation
                ? Boolean(canSendVerificationEmail?.())
                : false;
            const pendingSession: AuthPendingSession = {
                accountId: session.accountId,
                provider: session.provider,
                providerId: adapter.id,
                role,
                isFounder,
                displayName: accountDisplayName ?? session.accountId,
                userValidationMode: securitySettings.userValidationMode,
                requiredUserValidation: requiresUserValidation,
                accountDisplayName,
            };
            const emailTfaAdapter = getEnabledEmailTfaAdapter();
            if (
                emailTfaAdapter &&
                (await emailTfaAdapter.shouldRequireEmailTfa(session.accountId))
            ) {
                try {
                    const challenge =
                        await emailTfaAdapter.beginEmailTfaLoginChallenge(
                            pendingSession,
                        );
                    log?.("info", "Login requires email TFA challenge.", {
                        ...logMeta,
                        accountId: session.accountId,
                        provider: session.provider,
                    });
                    res.writeHead(202, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            data: {
                                requiresEmailTfa: true,
                                challengeId: challenge.challengeId,
                                accountId: session.accountId,
                            },
                        }),
                    );
                    return true;
                } catch (error) {
                    log?.(
                        "warn",
                        "Email TFA challenge failed to initialize; continuing without challenge.",
                        {
                            ...logMeta,
                            accountId: session.accountId,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                }
            }
            await clearPendingTfaOnboardingIfConfigured(session.accountId);
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            const pendingOnboarding = await readBooleanPreference(
                preferenceStore,
                session.accountId,
                TFA_ONBOARDING_PENDING_PREF_KEY,
            );
            const tfaSetupState = await resolveAccountTfaSetupState(
                session.accountId,
            );
            const requiresTfaSetup =
                pendingOnboarding &&
                securitySettings.enforceTfaForNewUsers === true &&
                tfaSetupState.hasAvailableMethod &&
                !tfaSetupState.hasConfiguredMethod;
            const localAdapter = authGateway.getLocalAdapter();
            if (localAdapter) {
                await localAdapter
                    .updateLastLogin(session.accountId)
                    .catch(() => undefined);
            }
            log?.("info", "Login succeeded.", {
                ...logMeta,
                accountId: session.accountId,
                provider: session.provider,
                role,
                requiresUserValidation,
                requiresTfaSetup,
            });
            respondWithAuthSession(req, res, pendingSession, {
                requiresTfaSetup,
                tfaSetupMethods: tfaSetupState.methods,
            });
            return true;
        }

        if (url.pathname === "/api/v1/auth/verify" && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const rawToken = extractBearerToken(req) ?? "";
            const oneHourMs = 60 * 60 * 1000;
            if (rawToken && isTokenVerificationFresh(rawToken, oneHourMs)) {
                log?.(
                    "debug",
                    "Password verification reused freshness window.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                    },
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { verified: true } }));
                return true;
            }
            const body = await readJson(req);
            const password = String(body.password ?? "");
            const verified = await accountStore.verify(claims.sub, password);
            if (!verified) {
                log?.("warn", "Password verification failed.", {
                    ...logMeta,
                    accountId: claims.sub,
                });
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_credentials",
                            message: "Incorrect password",
                        },
                    }),
                );
                return true;
            }
            if (rawToken) {
                recordTokenVerification(rawToken);
            }
            log?.("info", "Password verification succeeded.", {
                ...logMeta,
                accountId: claims.sub,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { verified: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/password-change-capability" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const support = authGateway.getPasswordResetSupport(
                claims.providerId,
            );
            log?.("debug", "Read password change support.", {
                ...logMeta,
                accountId: claims.sub,
                providerId: claims.providerId,
                supported: support.supported,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: support }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/reset-password" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const body = await readJson(req);
            const nextPassword = String(body.password ?? "").trim();
            if (!nextPassword) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "Password is required",
                        },
                    }),
                );
                return true;
            }
            if (nextPassword.length < 8) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "password_too_short",
                            message: "Password must be at least 8 characters",
                        },
                    }),
                );
                return true;
            }
            const support = authGateway.getPasswordResetSupport(
                claims.providerId,
            );
            if (!support.supported) {
                log?.(
                    "warn",
                    "Blocked password reset for unsupported provider.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        providerId: claims.providerId,
                        reason: support.reason,
                    },
                );
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unsupported",
                            message:
                                support.reason ||
                                "Password reset is not supported for this provider.",
                        },
                    }),
                );
                return true;
            }
            try {
                await authGateway.resetPasswordForAccount(
                    claims.providerId,
                    claims.sub,
                    nextPassword,
                );
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                log?.("error", "Password reset failed.", {
                    ...logMeta,
                    accountId: claims.sub,
                    providerId: claims.providerId,
                    error: message,
                });
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "password_reset_failed",
                            message,
                        },
                    }),
                );
                return true;
            }
            revokeAccessTokensForSubject(claims.sub);
            log?.("info", "Password reset succeeded.", {
                ...logMeta,
                accountId: claims.sub,
                providerId: claims.providerId,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/emergency-token" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const ttlSeconds = 60 * 60;
            const token = issueAccessToken(claims.sub, claims.role, ttlSeconds);
            const expiresAt = new Date(
                Date.now() + ttlSeconds * 1000,
            ).toISOString();
            log?.("warn", "Issued emergency API token.", {
                ...logMeta,
                accountId: claims.sub,
                role: claims.role,
                ttlSeconds,
                expiresAt,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        token,
                        role: claims.role,
                        ttlSeconds,
                        expiresAt,
                    },
                }),
            );
            return true;
        }

        if (url.pathname === "/api/v1/auth/logout" && req.method === "POST") {
            const cookieToken = extractCookieToken(req);
            if (cookieToken) {
                revokeAccessToken(cookieToken);
            }
            const bearerToken = extractBearerToken(req);
            if (bearerToken && bearerToken !== cookieToken) {
                revokeAccessToken(bearerToken);
            }
            log?.("info", "User logged out.", {
                ...logMeta,
                hadCookieToken: Boolean(cookieToken),
                hadBearerToken: Boolean(bearerToken),
            });
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": buildAccessTokenCookie(
                    "",
                    0,
                    shouldSetSecureCookie(req),
                ),
            });
            res.end(JSON.stringify({ data: { success: true } }));
            return true;
        }

        return false;
    };
}

function createAdapterAdminRoutes(
    gatewayId: string,
    authGateway: CoreAuthGateway,
    log?: GatewayBootstrapContext["log"],
) {
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = getAuthClaims(req);
        const logMeta = {
            component: "auth-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };
        if (url.pathname === base && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            log?.("debug", "Listed auth adapters.", {
                ...logMeta,
                count: authGateway.listAdapters().length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: authGateway.listAdapters() }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = authGateway.getAdapter(adapterId);

            if (req.method === "GET") {
                if (!requireAuth(req, res, "admin")) return true;
                if (!adapter) {
                    log?.(
                        "warn",
                        "Auth adapter config lookup failed because adapter was not found.",
                        {
                            ...logMeta,
                            adapterId,
                        },
                    );
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found",
                            },
                        }),
                    );
                    return true;
                }
                const storedConfig =
                    await authGateway.getPersistedConfig(adapterId);
                const schema = adapter.getConfigSchema();
                const requiredFields = schema
                    .filter((f) => f.required)
                    .map((f) => f.key);
                log?.("debug", "Read auth adapter config.", {
                    ...logMeta,
                    adapterId,
                    requiredFieldCount: requiredFields.length,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: storedConfig,
                        schema,
                        requiredFields,
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!requireAuth(req, res, "admin")) return true;
                if (!adapter) {
                    log?.(
                        "warn",
                        "Auth adapter config update failed because adapter was not found.",
                        {
                            ...logMeta,
                            adapterId,
                        },
                    );
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found",
                            },
                        }),
                    );
                    return true;
                }
                const body = await readJson(req);
                await authGateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                log?.("info", "Saved auth adapter config.", {
                    ...logMeta,
                    adapterId,
                    fieldCount: Object.keys(body as Record<string, unknown>)
                        .length,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }
        }

        const enableMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (enableMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(enableMatch[1]);
            const action = enableMatch[2];
            if (adapterId === "local" && action === "disable") {
                log?.(
                    "warn",
                    "Blocked attempt to disable locked auth adapter.",
                    {
                        ...logMeta,
                        adapterId,
                    },
                );
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "locked_adapter",
                            message:
                                "The local authentication adapter cannot be disabled",
                        },
                    }),
                );
                return true;
            }
            if (!authGateway.getAdapter(adapterId)) {
                log?.(
                    "warn",
                    "Auth adapter toggle failed because adapter was not found.",
                    {
                        ...logMeta,
                        adapterId,
                        action,
                    },
                );
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (action === "enable") {
                await authGateway.enableAdapter(adapterId);
            } else {
                await authGateway.disableAdapter(adapterId);
            }
            log?.("info", `Auth adapter ${action}d.`, {
                ...logMeta,
                adapterId,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        return false;
    };
}
