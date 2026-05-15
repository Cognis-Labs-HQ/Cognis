import path from "node:path";
import {
    getAuthClaims,
    requireAuth,
    readJson,
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
    isTokenVerificationFresh,
    recordTokenVerification,
    revokeAccessToken,
    revokeAccessTokensForSubject,
    type AccessRole,
} from "./access-tokens.js";
import { CoreAuthGateway } from "./gateway.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthContext, AuthProviderAdapter } from "./gateway.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { UserPreferenceStore } from "../../api/reuse/preference-store.js";

interface AuthAccountStore {
    ensureSchema(): Promise<void>;
    has(username: string): Promise<boolean>;
    delete(username: string): Promise<void>;
    isFounder(username: string): Promise<boolean>;
    verify(username: string, password: string): Promise<boolean>;
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

function resolveRole(
    sessionRole: string | undefined,
    isAdmin: boolean | undefined,
): AccessRole {
    if (
        sessionRole === "owner" ||
        sessionRole === "admin" ||
        sessionRole === "teacher" ||
        sessionRole === "moderator" ||
        sessionRole === "user"
    ) {
        return sessionRole;
    }
    return isAdmin ? "admin" : "user";
}

type ExternalLifecycleState = "active" | "unlinked" | "deactivated" | "deleted";

function normalizeLifecycleState(value: unknown): ExternalLifecycleState {
    if (value === "unlinked") return "unlinked";
    if (value === "deactivated") return "deactivated";
    if (value === "deleted") return "deleted";
    return "active";
}

async function syncExternalIdentity(
    dbExecutor: DbExecutor,
    session: AuthContext,
    log?: GatewayBootstrapContext["log"],
): Promise<{
    accountId: string;
    displayName: string;
    lifecycleState: ExternalLifecycleState;
}> {
    const lifecycleState = normalizeLifecycleState(session.lifecycleState);
    if (session.provider === "local") {
        return {
            accountId: session.accountId,
            displayName: session.displayName ?? session.accountId,
            lifecycleState,
        };
    }
    const now = new Date().toISOString();
    const existingIdentityResult = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "auth_identities",
        columns: ["account_id"],
        where: [
            { column: "provider", value: session.provider },
            { column: "external_user_id", value: session.externalUserId },
        ],
        limit: 1,
    });
    const persistedAccountId = String(
        existingIdentityResult.rows?.[0]?.account_id ?? "",
    ).trim();
    const accountId = persistedAccountId || session.accountId;
    const displayName = session.displayName ?? accountId;
    const accountResult = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "accounts",
        columns: ["id"],
        where: [{ column: "id", value: accountId }],
        limit: 1,
    });
    const accountExists = Boolean(accountResult.rows?.[0]?.id);
    const role = resolveRole(session.role, session.isAdmin);
    const shouldEnableAccount = lifecycleState === "active";

    if (!accountExists) {
        await dbExecutor.executeCommand({
            option: "INSERT",
            table: "accounts",
            values: {
                id: accountId,
                email: session.email ?? null,
                display_name: displayName,
                is_admin: role === "admin" || role === "owner",
                role,
                enabled: shouldEnableAccount,
                is_founder: false,
                created_at: now,
                updated_at: now,
            },
        });
        log?.("info", "Created external-auth account.", {
            component: "auth-gateway",
            accountId,
            provider: session.provider,
            externalUserId: session.externalUserId,
        });
    } else {
        await dbExecutor.executeCommand({
            option: "UPDATE",
            table: "accounts",
            set: {
                email: session.email ?? null,
                display_name: displayName,
                is_admin: role === "admin" || role === "owner",
                role,
                enabled: shouldEnableAccount,
                updated_at: now,
            },
            where: [{ column: "id", value: accountId }],
        });
    }

    await dbExecutor.executeCommand({
        option: "INSERT",
        table: "auth_identities",
        values: {
            id: `${session.provider}:${session.externalUserId}`,
            account_id: accountId,
            provider: session.provider,
            external_user_id: session.externalUserId,
            display_name: displayName,
            profile_image_url: session.profileImageUrl ?? null,
            lifecycle_state: lifecycleState,
            created_at: now,
            updated_at: now,
            unlinked_at: lifecycleState === "unlinked" ? now : null,
            deactivated_at: lifecycleState === "deactivated" ? now : null,
            deleted_at: lifecycleState === "deleted" ? now : null,
        },
        conflict: {
            action: "update",
            target: ["provider", "external_user_id"],
            update: {
                account_id: accountId,
                display_name: displayName,
                profile_image_url: session.profileImageUrl ?? null,
                lifecycle_state: lifecycleState,
                updated_at: now,
                unlinked_at: lifecycleState === "unlinked" ? now : null,
                deactivated_at: lifecycleState === "deactivated" ? now : null,
                deleted_at: lifecycleState === "deleted" ? now : null,
            },
        },
    });

    return { accountId, displayName, lifecycleState };
}

async function readIdentityAccountId(
    dbExecutor: DbExecutor,
    provider: string,
    externalUserId: string,
): Promise<string | null> {
    const result = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "auth_identities",
        columns: ["account_id"],
        where: [
            { column: "provider", value: provider },
            { column: "external_user_id", value: externalUserId },
        ],
        limit: 1,
    });
    const accountId = String(result.rows?.[0]?.account_id ?? "").trim();
    return accountId || null;
}

async function touchExternalAccountLastLogin(
    dbExecutor: DbExecutor,
    accountId: string,
): Promise<void> {
    const now = new Date().toISOString();
    await dbExecutor.executeCommand({
        option: "UPDATE",
        table: "accounts",
        set: {
            last_login: now,
            updated_at: now,
        },
        where: [{ column: "id", value: accountId }],
    });
}

async function unlinkExternalIdentity(
    dbExecutor: DbExecutor,
    accountId: string,
    provider: string,
): Promise<{ unlinked: boolean; accountDisabled: boolean }> {
    const now = new Date().toISOString();
    const existing = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "auth_identities",
        columns: ["id", "lifecycle_state", "unlinked_at"],
        where: [
            { column: "account_id", value: accountId },
            { column: "provider", value: provider },
        ],
        limit: 1,
    });
    if (!existing.rows?.[0]?.id) {
        return {
            unlinked: false,
            accountDisabled: false,
        };
    }
    const currentLifecycleState = normalizeLifecycleState(
        existing.rows?.[0]?.lifecycle_state,
    );
    const nextLifecycleState =
        currentLifecycleState === "deleted" ||
        currentLifecycleState === "deactivated"
            ? currentLifecycleState
            : "unlinked";
    await dbExecutor.executeCommand({
        option: "UPDATE",
        table: "auth_identities",
        set: {
            lifecycle_state: nextLifecycleState,
            unlinked_at:
                nextLifecycleState === "unlinked"
                    ? now
                    : (existing.rows?.[0]?.unlinked_at ?? null),
            updated_at: now,
        },
        where: [
            { column: "account_id", value: accountId },
            { column: "provider", value: provider },
        ],
    });
    const identityRows = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "auth_identities",
        columns: ["provider", "lifecycle_state"],
        where: [{ column: "account_id", value: accountId }],
    });
    const hasOtherActiveIdentity = (identityRows.rows ?? []).some((row) => {
        const rowProvider = String(row.provider ?? "");
        const rowLifecycleState = normalizeLifecycleState(row.lifecycle_state);
        return rowProvider !== provider && rowLifecycleState === "active";
    });
    if (!hasOtherActiveIdentity) {
        await dbExecutor.executeCommand({
            option: "UPDATE",
            table: "accounts",
            set: {
                enabled: false,
                updated_at: now,
            },
            where: [{ column: "id", value: accountId }],
        });
    }
    return {
        unlinked: true,
        accountDisabled: !hasOtherActiveIdentity,
    };
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor = (ctx.capabilities.get<DbExecutor>("db:executor") ??
        ctx.dbExecutor)!;

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

    ctx.routeRegistry.register(
        createAuthGatewayRoutes(
            authGateway,
            accountStore,
            dbExecutor,
            ctx.capabilities,
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
        version: "1.5.0",
        description: "Manages authentication providers and user login.",
        publisher: "Cognis Labs",
        required: true,
        hasAdapters: true,
    });

    const uiDir = path.resolve(process.cwd(), "src", "gateways", "auth", "ui");
    ctx.uiRegistry?.registerStaticDir("auth", uiDir);
    ctx.uiRegistry?.registerAdminSection({
        id: "authentication",
        label: "Authentication",
        scriptUrl: "/static/gateways/auth/admin-section.js",
        stringsBaseUrl: "/static/gateways/auth/languages",
    });

    ctx.capabilities.contribute("auth:accountStore", accountStore);
    ctx.capabilities.contribute(
        "auth:createLocalAdmin",
        async (username: string, password: string) => {
            const localAdapter = authGateway.getLocalAdapter();
            if (!localAdapter) throw new Error("local_adapter_unavailable");
            const has = await accountStore.has(username);
            if (!has) {
                await localAdapter.register(username, password, true);
            }
        },
    );
    ctx.capabilities.contribute("auth:getLoginMethods", () =>
        authGateway
            .getEnabledAdapters()
            .map((a) => ({ id: a.id, name: a.name })),
    );
    ctx.log?.("info", "Auth gateway initialized.", {
        component: "auth-gateway",
        adapterCount: authGateway.listAdapters().length,
    });
}

function createAuthGatewayRoutes(
    authGateway: CoreAuthGateway,
    accountStore: AuthAccountStore,
    dbExecutor: DbExecutor,
    capabilities: CapabilityStore,
    log?: GatewayBootstrapContext["log"],
) {
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
            const registerPublic = capabilities.get<
                (input: {
                    username: string;
                    password: string;
                    email?: string;
                    displayName?: string;
                }) => Promise<{
                    username: string;
                    isAdmin: boolean;
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
                result.isAdmin ? "admin" : "user",
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
            if (session.provider !== "local") {
                const linkedAccountId = await readIdentityAccountId(
                    dbExecutor,
                    session.provider,
                    session.externalUserId,
                );
                const getPublicRegistrationEnabled = capabilities.get<
                    () => boolean
                >("registration:public:isEnabled");
                const publicRegistrationEnabled = Boolean(
                    getPublicRegistrationEnabled?.(),
                );
                const registrationRequestByIdentity = capabilities.get<
                    (input: {
                        provider: string;
                        externalUserId: string;
                    }) => Promise<{ status: "pending" | "approved" | "rejected" } | null>
                >("registration:requests:getByIdentity");
                const existingRequest = await registrationRequestByIdentity?.({
                    provider: session.provider,
                    externalUserId: session.externalUserId,
                });
                if (existingRequest?.status === "pending") {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "registration_pending_approval",
                                message:
                                    "Your registration request is pending admin approval",
                            },
                        }),
                    );
                    return true;
                }
                if (existingRequest?.status === "rejected") {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "registration_request_rejected",
                                message:
                                    "Your registration request was rejected by an admin",
                            },
                        }),
                    );
                    return true;
                }
                if (
                    !linkedAccountId &&
                    !publicRegistrationEnabled &&
                    existingRequest?.status !== "approved"
                ) {
                    const submitRegistrationRequest = capabilities.get<
                        (input: {
                            provider: string;
                            externalUserId: string;
                            requestedAccountId: string;
                            requestedDisplayName: string;
                            requestedEmail?: string;
                            requestedProfileImageUrl?: string;
                        }) => Promise<{ id: string }>
                    >("registration:requests:submit");
                    if (!submitRegistrationRequest) {
                        res.writeHead(503, { "content-type": "application/json" });
                        res.end(
                            JSON.stringify({
                                error: {
                                    code: "registration_unavailable",
                                    message:
                                        "Registration requests are unavailable",
                                },
                            }),
                        );
                        return true;
                    }
                    await submitRegistrationRequest({
                        provider: session.provider,
                        externalUserId: session.externalUserId,
                        requestedAccountId: session.accountId,
                        requestedDisplayName:
                            session.displayName ?? session.accountId,
                        requestedEmail: session.email,
                        requestedProfileImageUrl: session.profileImageUrl,
                    });
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "registration_pending_approval",
                                message:
                                    "Your registration request is pending admin approval",
                            },
                        }),
                    );
                    return true;
                }
            }
            const syncedSession = await syncExternalIdentity(
                dbExecutor,
                session,
                log,
            );
            if (syncedSession.lifecycleState !== "active") {
                revokeAccessTokensForSubject(syncedSession.accountId);
                log?.(
                    "warn",
                    "Blocked login for non-active external identity.",
                    {
                        ...logMeta,
                        accountId: syncedSession.accountId,
                        provider: session.provider,
                        lifecycleState: syncedSession.lifecycleState,
                    },
                );
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "account_inactive",
                            message:
                                "This account is unavailable due to provider lifecycle state",
                        },
                    }),
                );
                return true;
            }
            let role = resolveRole(session.role, session.isAdmin);
            const profileStore = capabilities.get<{
                getProfile(
                    accountId: string,
                ): Promise<{ role?: string } | null>;
            }>("social:profileStore");
            if (profileStore) {
                const existingProfile = await profileStore
                    .getProfile(syncedSession.accountId)
                    .catch(() => null);
                if (existingProfile?.role === "owner") {
                    role = "owner";
                }
            }
            const parsedTtlSeconds = Number.parseInt(
                process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS ?? "43200",
                10,
            );
            const accessTokenTtlSeconds =
                Number.isFinite(parsedTtlSeconds) && parsedTtlSeconds >= 1
                    ? parsedTtlSeconds
                    : 43200;
            const apiToken = issueAccessToken(
                syncedSession.accountId,
                role,
                accessTokenTtlSeconds,
            );
            const localAdapter = authGateway.getLocalAdapter();
            if (session.provider === "local") {
                if (localAdapter) {
                    await localAdapter
                        .updateLastLogin(syncedSession.accountId)
                        .catch(() => undefined);
                }
            } else {
                await touchExternalAccountLastLogin(
                    dbExecutor,
                    syncedSession.accountId,
                ).catch(() => undefined);
            }
            const createProfile = capabilities.get<
                (
                    accountId: string,
                    handle: string,
                    role?: string,
                    displayName?: string,
                ) => Promise<void>
            >("profile:createProfile");
            await createProfile?.(
                syncedSession.accountId,
                syncedSession.accountId,
                role,
                syncedSession.displayName,
            );
            const isFounder = await accountStore
                .isFounder(syncedSession.accountId)
                .catch((error) => {
                    ctx.log?.(
                        "warn",
                        "Failed to resolve founder status during login.",
                        {
                            component: "auth-gateway",
                            accountId: syncedSession.accountId,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                    // Founder status only affects optional UI routing; keep login available on lookup failure.
                    return false;
                });
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
            log?.("info", "Login succeeded.", {
                ...logMeta,
                accountId: syncedSession.accountId,
                provider: session.provider,
                role,
                requiresUserValidation,
            });
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
                        accountId: syncedSession.accountId,
                        displayName: syncedSession.displayName,
                        provider: session.provider,
                        role,
                        isFounder,
                        profileImageUrl: session.profileImageUrl ?? null,
                        token: apiToken,
                        userValidationMode: securitySettings.userValidationMode,
                        requiredUserValidation: requiresUserValidation,
                    },
                }),
            );
            return true;
        }

        const unlinkMatch = url.pathname.match(
            /^\/api\/v1\/auth\/providers\/([^/]+)\/unlink$/,
        );
        if (unlinkMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const provider = decodeURIComponent(unlinkMatch[1]);
            if (provider === "local") {
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unsupported_provider",
                            message:
                                "Local authentication cannot be unlinked; use password reset or account deletion instead",
                        },
                    }),
                );
                return true;
            }
            const unlinkResult = await unlinkExternalIdentity(
                dbExecutor,
                claims.sub,
                provider,
            );
            if (!unlinkResult.unlinked) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Linked provider identity not found",
                        },
                    }),
                );
                return true;
            }
            const cookieToken = extractCookieToken(req);
            if (cookieToken) {
                revokeAccessToken(cookieToken);
            }
            const bearerToken = extractBearerToken(req);
            if (bearerToken && bearerToken !== cookieToken) {
                revokeAccessToken(bearerToken);
            }
            const revokedTokenCount = revokeAccessTokensForSubject(claims.sub);
            log?.(
                "info",
                "Unlinked external auth provider identity and disabled account.",
                {
                    ...logMeta,
                    accountId: claims.sub,
                    provider,
                    revokedTokenCount,
                    accountDisabled: unlinkResult.accountDisabled,
                },
            );
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": buildAccessTokenCookie(
                    "",
                    0,
                    shouldSetSecureCookie(req),
                ),
            });
            res.end(
                JSON.stringify({
                    data: {
                        unlinked: true,
                        provider,
                        accountDisabled: unlinkResult.accountDisabled,
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
