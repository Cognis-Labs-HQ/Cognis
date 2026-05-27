import path from "node:path";
import { randomBytes } from "node:crypto";
import {
    canAccessUserData,
    getAuthClaims,
    getCookieSession,
    hasMinRole,
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
    consumeAccessToken,
    issueAccessToken,
    lookupAccessToken,
    verifyAccessToken,
    isTokenVerificationFresh,
    recordTokenVerification,
    revokeAccessToken,
    revokeAccessTokensForSubject,
    type AccessRole,
} from "./access-tokens.js";
import { CoreAuthGateway } from "./gateway.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthProviderAdapter } from "./gateway.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { UserPreferenceStore } from "../../api/reuse/preference-store.js";
import type { RouteContext } from "../../api/reuse/route-context.js";
import { validateUsername } from "../../api/reuse/account-store.js";
import { resolveExternalBaseUrl } from "../../api/reuse/url-parts.js";
import {
    runAuthBootstrapHooks,
    runAuthRouteBootstrapHooks,
    type AuthAccountStore,
    type AuthRouteBootstrapRuntime,
    type PendingTfaLoginAttempt,
} from "./bootstrap/index.js";
import {
    AUTH_PASSWORD_POLICY_KEY,
    defaultPasswordPolicy,
    parsePasswordPolicy,
} from "./password-policy.js";

// 18 random bytes provide ample entropy for short-lived login-attempt IDs.
const TFA_LOGIN_ATTEMPT_ID_BYTES = 18;
// Pending TFA login attempts expire after 5 minutes to limit replay windows.
const TFA_LOGIN_ATTEMPT_TTL_MS = 5 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;
const PASSWORD_RESET_RATE_LIMIT_MS = 60_000;
const PASSWORD_RESET_MIN_RESPONSE_MS = 350;
const PASSWORD_RESET_RESPONSE_JITTER_MS = 120;
const PASSWORD_RESET_LOOKUP_JITTER_MS = 40;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPasswordResetResponseFloor(
    startedAt: number,
): Promise<void> {
    const jitterMs = Math.floor(
        Math.random() * PASSWORD_RESET_RESPONSE_JITTER_MS,
    );
    const targetMs = PASSWORD_RESET_MIN_RESPONSE_MS + jitterMs;
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= targetMs) return;
    await sleep(targetMs - elapsedMs);
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

function createAuthRouteBootstrapRuntime(): AuthRouteBootstrapRuntime {
    const pendingTfaLoginAttempts = new Map<string, PendingTfaLoginAttempt>();

    function pruneExpiredTfaLoginAttempts(now = Date.now()): void {
        for (const [
            loginAttemptId,
            entry,
        ] of pendingTfaLoginAttempts.entries()) {
            if (entry.expiresAt < now) {
                pendingTfaLoginAttempts.delete(loginAttemptId);
            }
        }
    }

    return {
        buildAccessTokenCookie(
            req: IncomingMessage,
            rawToken: string,
            ttlSeconds: number | null,
        ): string {
            return buildAccessTokenCookie(
                rawToken,
                ttlSeconds,
                shouldSetSecureCookie(req),
            );
        },
        clearPendingTfaLoginAttempt(loginAttemptId: string): void {
            pendingTfaLoginAttempts.delete(loginAttemptId);
        },
        createPendingTfaLoginAttempt(
            input: Omit<PendingTfaLoginAttempt, "id" | "expiresAt">,
        ): PendingTfaLoginAttempt {
            pruneExpiredTfaLoginAttempts();
            const pendingAttempt: PendingTfaLoginAttempt = {
                ...input,
                id: `tfa_login_${randomBytes(TFA_LOGIN_ATTEMPT_ID_BYTES).toString("base64url")}`,
                expiresAt: Date.now() + TFA_LOGIN_ATTEMPT_TTL_MS,
            };
            pendingTfaLoginAttempts.set(pendingAttempt.id, pendingAttempt);
            return pendingAttempt;
        },
        getAccessTokenTtlSeconds(): number {
            const parsedTtlSeconds = Number.parseInt(
                process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS ?? "43200",
                10,
            );
            return Number.isFinite(parsedTtlSeconds) && parsedTtlSeconds >= 1
                ? parsedTtlSeconds
                : 43200;
        },
        getPendingTfaLoginAttempt(
            loginAttemptId: string,
        ): PendingTfaLoginAttempt | null {
            pruneExpiredTfaLoginAttempts();
            return pendingTfaLoginAttempts.get(loginAttemptId) ?? null;
        },
    };
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

// NOTE: This limiter keeps state in-process for single-instance deployments.
// In multi-instance setups (for example, behind a load balancer), use a shared
// store-backed limiter (such as Redis) to enforce global throttling.
class MemoryRateLimiter {
    private readonly lastSeenAt = new Map<string, number>();

    constructor(
        private readonly minIntervalMs: number,
        private readonly now: () => number = () => Date.now(),
    ) {}

    private pruneExpiredEntries(): void {
        const now = this.now();
        for (const [key, lastSeenAt] of this.lastSeenAt.entries()) {
            if (now - lastSeenAt >= this.minIntervalMs) {
                this.lastSeenAt.delete(key);
            }
        }
    }

    isThrottled(key: string): boolean {
        this.pruneExpiredEntries();
        const normalizedKey = key.trim();
        if (!normalizedKey) return false;
        const lastSeenAt = this.lastSeenAt.get(normalizedKey);
        if (lastSeenAt === undefined) return false;
        return this.now() - lastSeenAt < this.minIntervalMs;
    }

    record(key: string): void {
        this.pruneExpiredEntries();
        const normalizedKey = key.trim();
        if (!normalizedKey) return;
        this.lastSeenAt.set(normalizedKey, this.now());
    }
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

interface SecuritySubsection {
    id: string;
    scriptUrl: string;
    stringsBaseUrl?: string | string[];
}

function createAuthGatewayRoutes(
    authGateway: CoreAuthGateway,
    accountStore: AuthAccountStore,
    capabilities: CapabilityStore,
    authRouteBootstrapRuntime: AuthRouteBootstrapRuntime,
    securitySubsections: SecuritySubsection[],
    log?: GatewayBootstrapContext["log"],
) {
    const dispatchNotification =
        capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
            }) => Promise<unknown>
        >("notify:dispatch");
    async function readSecuritySettings(): Promise<{
        registrationsEnabled: boolean;
        userValidationMode: "none" | "smtp";
    }> {
        const prefStore =
            capabilities.get<UserPreferenceStore>("preferences:store");
        if (!prefStore) {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
        const raw = await prefStore.get("__system__", "security-settings");
        if (!raw) {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
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
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
    }

    async function registrationsEnabled(): Promise<boolean> {
        const isPublicRegistrationEnabled = capabilities.get<() => boolean>(
            "registration:public:isEnabled",
        );
        return Boolean(isPublicRegistrationEnabled?.());
    }

    const oneTimeLoginAccountRateLimiter = new MemoryRateLimiter(
        PASSWORD_RESET_RATE_LIMIT_MS,
    );
    const oneTimeLoginIpRateLimiter = new MemoryRateLimiter(
        PASSWORD_RESET_RATE_LIMIT_MS,
    );

    function resolveRequestAddress(req: IncomingMessage): string {
        const forwardedFor = req.headers["x-forwarded-for"];
        if (typeof forwardedFor === "string") {
            const firstHop = forwardedFor.split(",")[0]?.trim();
            if (firstHop) return firstHop;
        }
        return String(req.socket?.remoteAddress ?? "unknown");
    }

    async function respondToSuccessfulLogin(
        req: IncomingMessage,
        res: ServerResponse,
        session: {
            accountId: string;
            provider: string;
            role?: string;
        },
        providerId: string,
        logMeta: Record<string, unknown>,
    ): Promise<true> {
        let role = resolveRole(session.role);
        const profileStore = capabilities.get<{
            getProfile(accountId: string): Promise<{ role?: string } | null>;
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
                return false;
            });
        if (isFounder && (role === "admin" || role === "owner")) {
            role = "owner";
        }
        const accessTokenTtlSeconds =
            authRouteBootstrapRuntime.getAccessTokenTtlSeconds();
        const localAdapter = authGateway.getLocalAdapter();
        if (localAdapter) {
            await localAdapter
                .updateLastLogin(session.accountId)
                .catch(() => undefined);
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
            (await accountStore.getDisplayName(session.accountId))?.trim() ||
            undefined;
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
            securitySettings.userValidationMode === "smtp" && !isInitialAdmin;
        const requiresUserValidation = shouldRequireSmtpValidation
            ? Boolean(canSendVerificationEmail?.())
            : false;
        const getTfaUserStatus = capabilities.get<
            (accountId: string) => Promise<{
                requiresSetup: boolean;
                hasConfiguredMethod: boolean;
            }>
        >("tfa:getUserStatus");
        const getTfaLoginMethods = capabilities.get<
            (accountId: string) => Promise<Array<{ id: string; name: string }>>
        >("tfa:getLoginMethods");
        const tfaStatus = getTfaUserStatus
            ? await getTfaUserStatus(session.accountId).catch(() => null)
            : null;
        const requiresTfa = tfaStatus?.hasConfiguredMethod === true;
        const requiresTfaSetup = tfaStatus?.requiresSetup === true;
        if (requiresTfa && getTfaLoginMethods) {
            const methods = await getTfaLoginMethods(session.accountId)
                .catch(() => [])
                .then((items) =>
                    items.filter(
                        (item) =>
                            typeof item.id === "string" &&
                            typeof item.name === "string",
                    ),
                );
            if (methods.length > 0) {
                const pendingAttempt =
                    authRouteBootstrapRuntime.createPendingTfaLoginAttempt({
                        accountId: session.accountId,
                        role,
                        isFounder,
                        provider: session.provider,
                        providerId,
                        displayName: accountDisplayName ?? session.accountId,
                        userValidationMode: securitySettings.userValidationMode,
                        requiredUserValidation: requiresUserValidation,
                    });
                log?.("info", "Login entered TFA challenge flow.", {
                    ...logMeta,
                    accountId: session.accountId,
                    provider: session.provider,
                    role,
                    methodCount: methods.length,
                });
                res.writeHead(200, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        data: {
                            tfaRequired: true,
                            loginAttemptId: pendingAttempt.id,
                            methods,
                            accountId: session.accountId,
                            displayName:
                                accountDisplayName ?? session.accountId,
                            provider: session.provider,
                            providerId,
                            role,
                            isFounder,
                            userValidationMode:
                                securitySettings.userValidationMode,
                            requiredUserValidation: requiresUserValidation,
                        },
                    }),
                );
                return true;
            }
        }
        if (requiresTfaSetup) {
            const pendingSetupToken = issueAccessToken(
                session.accountId,
                role,
                accessTokenTtlSeconds,
                {
                    providerId,
                    setupPending: true,
                },
            );
            log?.("info", "Login succeeded with pending TFA setup gate.", {
                ...logMeta,
                accountId: session.accountId,
                provider: session.provider,
                role,
            });
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": authRouteBootstrapRuntime.buildAccessTokenCookie(
                    req,
                    pendingSetupToken,
                    accessTokenTtlSeconds,
                ),
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: session.accountId,
                        displayName: accountDisplayName ?? session.accountId,
                        provider: session.provider,
                        providerId,
                        role,
                        isFounder,
                        token: pendingSetupToken,
                        userValidationMode: securitySettings.userValidationMode,
                        requiredUserValidation: requiresUserValidation,
                        tfaSetupRequired: true,
                    },
                }),
            );
            return true;
        }
        log?.("info", "Login succeeded.", {
            ...logMeta,
            accountId: session.accountId,
            provider: session.provider,
            role,
            requiresUserValidation,
        });
        const apiToken = issueAccessToken(
            session.accountId,
            role,
            accessTokenTtlSeconds,
            { providerId },
        );
        res.writeHead(200, {
            "content-type": "application/json",
            "set-cookie": authRouteBootstrapRuntime.buildAccessTokenCookie(
                req,
                apiToken,
                accessTokenTtlSeconds,
            ),
        });
        res.end(
            JSON.stringify({
                data: {
                    accountId: session.accountId,
                    displayName: accountDisplayName ?? session.accountId,
                    provider: session.provider,
                    providerId,
                    role,
                    isFounder,
                    token: apiToken,
                    userValidationMode: securitySettings.userValidationMode,
                    requiredUserValidation: requiresUserValidation,
                },
            }),
        );
        return true;
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
            const methods = authGateway.getEnabledAdapters().map((a) => ({
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
            url.pathname === "/api/v1/auth/security-sections" &&
            req.method === "GET"
        ) {
            if (!requireAuth(req, res, "user")) return true;
            log?.("debug", "Listed auth security sections.", {
                ...logMeta,
                count: securitySubsections.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: securitySubsections }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/registration-config" &&
            req.method === "GET"
        ) {
            const enabled = await registrationsEnabled();
            const { userValidationMode } = await readSecuritySettings();
            log?.("debug", "Read registration config.", {
                ...logMeta,
                registrationsEnabled: enabled,
                userValidationMode,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        registrationsEnabled: enabled,
                        userValidationMode,
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
            const verifyToken = issueAccessToken(
                result.username,
                result.role ?? "user",
                1800,
            );

            const { userValidationMode: registrationValidationMode } =
                await readSecuritySettings();
            const hasVerifiedEmail = capabilities.get<
                (accountId: string) => Promise<boolean>
            >("notify:hasVerifiedEmail");
            if (hasVerifiedEmail && registrationValidationMode === "smtp") {
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
            url.pathname === "/api/v1/auth/login-link-status" &&
            req.method === "GET"
        ) {
            const canSendOneTimeLoginEmail = capabilities.get<() => boolean>(
                "notify:canSendOneTimeLoginEmail",
            );
            const contactEmail = String(process.env.CONTACT_EMAIL ?? "").trim();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        available: Boolean(canSendOneTimeLoginEmail?.()),
                        contactEmail,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/request-login-link" &&
            req.method === "POST"
        ) {
            const requestStartedAt = Date.now();
            const respondWithPasswordResetEnvelope = async (
                statusCode: number,
                payload: unknown,
            ) => {
                await waitForPasswordResetResponseFloor(requestStartedAt);
                res.writeHead(statusCode, {
                    "content-type": "application/json",
                });
                res.end(JSON.stringify(payload));
                return true;
            };
            const body = await readJson(req);
            const email = String(body.email ?? "")
                .trim()
                .toLowerCase();
            if (!email) {
                return respondWithPasswordResetEnvelope(400, {
                    error: {
                        code: "email_required",
                        message: "Email is required",
                    },
                });
            }
            const requestAddress = resolveRequestAddress(req);
            const addressRateLimitKey = `address:${requestAddress}`;
            const emailRateLimitKey = `email:${email}`;
            if (
                oneTimeLoginAccountRateLimiter.isThrottled(emailRateLimitKey) ||
                oneTimeLoginIpRateLimiter.isThrottled(addressRateLimitKey)
            ) {
                return respondWithPasswordResetEnvelope(429, {
                    error: {
                        code: "rate_limited",
                        message:
                            "A password reset link was requested too recently. Please wait before trying again.",
                    },
                });
            }
            oneTimeLoginAccountRateLimiter.record(emailRateLimitKey);
            oneTimeLoginIpRateLimiter.record(addressRateLimitKey);
            const contactEmail = String(process.env.CONTACT_EMAIL ?? "").trim();
            const canSendOneTimeLoginEmail = capabilities.get<() => boolean>(
                "notify:canSendOneTimeLoginEmail",
            );
            const sendOneTimeLoginEmail = capabilities.get<
                (
                    to: string,
                    loginUrl: string,
                    options?: {
                        theme?: string;
                        subject?: string;
                        body?: string;
                        actionLabel?: string;
                    },
                ) => Promise<void>
            >("notify:sendOneTimeLoginEmail");
            const getAccountIdByEmail = capabilities.get<
                (email: string) => Promise<string | null>
            >("notify:getAccountIdByEmail");
            const externalBaseUrl = resolveExternalBaseUrl();
            if (
                !canSendOneTimeLoginEmail?.() ||
                typeof sendOneTimeLoginEmail !== "function" ||
                typeof getAccountIdByEmail !== "function" ||
                !externalBaseUrl
            ) {
                return respondWithPasswordResetEnvelope(200, {
                    data: {
                        outcome: "contact_support",
                        contactEmail,
                    },
                });
            }
            await sleep(
                Math.floor(Math.random() * PASSWORD_RESET_LOOKUP_JITTER_MS),
            );
            const accountId = await getAccountIdByEmail(email).catch(
                () => null,
            );
            const accountInfo = accountId
                ? await accountStore.getInfo(accountId).catch(() => null)
                : null;
            if (!accountInfo || accountInfo.enabled === false) {
                return respondWithPasswordResetEnvelope(200, {
                    data: {
                        outcome: "email_sent",
                    },
                });
            }
            const loginToken = issueAccessToken(
                accountId,
                resolveRole(accountInfo.role),
                PASSWORD_RESET_TOKEN_TTL_SECONDS,
                {
                    providerId: "local",
                    purpose: "password-reset",
                },
            );
            const loginUrl = `${externalBaseUrl}/login?passwordResetToken=${encodeURIComponent(loginToken)}`;
            try {
                await sendOneTimeLoginEmail(email, loginUrl, {
                    subject: "Your Cognis password reset link",
                    body: `Use this secure password reset link to choose a new Cognis password:\n${loginUrl}\n\nThis link expires in 15 minutes and can only be used once.`,
                    actionLabel: "Reset Password",
                });
            } catch (error) {
                revokeAccessToken(loginToken);
                const message =
                    error instanceof Error ? error.message : String(error);
                if (message === "smtp_rate_limited") {
                    return respondWithPasswordResetEnvelope(429, {
                        error: {
                            code: "rate_limited",
                            message:
                                "A password reset link was requested too recently. Please wait before trying again.",
                        },
                    });
                }
                log?.("warn", "Failed to send password reset email.", {
                    ...logMeta,
                    error: message,
                });
                return respondWithPasswordResetEnvelope(200, {
                    data: {
                        outcome: "contact_support",
                        contactEmail,
                    },
                });
            }
            log?.("info", "Sent password reset email.", {
                ...logMeta,
            });
            return respondWithPasswordResetEnvelope(200, {
                data: { outcome: "email_sent" },
            });
        }

        if (
            url.pathname === "/api/v1/auth/check-login-link" &&
            req.method === "GET"
        ) {
            const rawToken = String(url.searchParams.get("token") ?? "").trim();
            const claims = rawToken
                ? verifyAccessToken(rawToken, { purpose: "password-reset" })
                : null;
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { valid: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/consume-login-link" &&
            req.method === "POST"
        ) {
            const body = await readJson(req);
            const rawToken = String(body.token ?? "").trim();
            const nextPassword = String(body.password ?? "").trim();
            if (!rawToken) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
                        },
                    }),
                );
                return true;
            }
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
            const claims = consumeAccessToken(rawToken, {
                purpose: "password-reset",
            });
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
                        },
                    }),
                );
                return true;
            }
            const accountInfo = await accountStore
                .getInfo(claims.sub)
                .catch(() => null);
            if (!accountInfo || accountInfo.enabled === false) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
                        },
                    }),
                );
                return true;
            }
            if (claims.providerId !== "local") {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unsupported",
                            message:
                                "Password reset by email is unavailable for this account.",
                        },
                    }),
                );
                return true;
            }
            const localAdapter = authGateway.getLocalAdapter();
            if (!localAdapter?.store) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unsupported",
                            message:
                                "Password reset by email is unavailable for this account.",
                        },
                    }),
                );
                return true;
            }
            try {
                await localAdapter.store.setPassword(claims.sub, nextPassword);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
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
            const revokedSubjectTokens = revokeAccessTokensForSubject(
                claims.sub,
            );
            if (revokedSubjectTokens < 1) {
                log?.(
                    "warn",
                    "No additional active subject tokens were revoked after password reset.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                    },
                );
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const provider = String(body.provider ?? "local");
            const adapter =
                authGateway.getEnabledAdapter(provider) ??
                authGateway.getEnabledAdapter("local");
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
            return respondToSuccessfulLogin(
                req,
                res,
                session,
                adapter.id,
                logMeta,
            );
        }

        if (
            url.pathname === "/api/v1/auth/setup-status" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const getTfaUserStatus =
                capabilities.get<
                    (accountId: string) => Promise<{ requiresSetup: boolean }>
                >("tfa:getUserStatus");
            const status = getTfaUserStatus
                ? await getTfaUserStatus(claims.sub).catch(() => null)
                : null;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        requiresSetup: status?.requiresSetup === true,
                    },
                }),
            );
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
            const currentPassword = String(body.currentPassword ?? "");
            const nextPassword = String(body.password ?? "").trim();
            if (currentPassword.length === 0) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "Current password is required",
                        },
                    }),
                );
                return true;
            }
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
                    currentPassword,
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
            if (typeof dispatchNotification === "function") {
                // Server-side notification strings are plain English following the
                // same pattern as TFA security notifications (see gateway.ts). There
                // is no server-side i18n infrastructure; the notification adapter
                // renders these strings directly into outgoing messages (e.g. emails).
                dispatchNotification({
                    category: "security",
                    recipientUsername: claims.sub,
                    subject: "Password Changed",
                    body: "Your account password was changed. If you did not make this change, contact your administrator immediately.",
                }).catch((error) => {
                    log?.(
                        "error",
                        "Failed to dispatch password change notification.",
                        {
                            ...logMeta,
                            accountId: claims.sub,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                });
            }
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
