import { readGatewayManifestVersion } from "../../reuse/manifest-version.js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
    registerLimitedAuthPathAllowance,
    type GatewayBootstrapContext,
} from "../../shared.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import { DbTfaStore } from "../reuse/tfa-store.js";
import { CoreTfaGateway, type TfaMethodAdapter } from "../gateway.js";
import { createTfaRoutes } from "./tfa-routes.js";
import { createTfaAdapterAdminRoutes } from "./adapter-admin-routes.js";

type PendingLoginAttemptInput = {
    accountId: string;
    role: "user" | "teacher" | "moderator" | "admin" | "owner";
    isFounder: boolean;
    provider: string;
    providerId: string;
    displayName: string;
    userValidationMode: "none" | "smtp";
    requiredUserValidation: boolean;
    ttlSeconds: number | null;
};

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const manifestVersion = await readGatewayManifestVersion(
        import.meta.url,
        "../manifest.json",
    );
    const dbExecutor = ctx.capabilities.require<DbExecutor>("db:executor");

    const store = new DbTfaStore(dbExecutor);
    await store.ensureSchema();

    const dispatchNotification =
        ctx.capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
                metadata?: Record<string, unknown>;
            }) => Promise<unknown>
        >("notify:dispatch");
    const canSendVerificationEmail = ctx.capabilities.get<() => boolean>(
        "notify:canSendVerificationEmail",
    );
    const sendVerificationEmail = ctx.capabilities.get<
        (
            to: string,
            code: string,
            verifyUrl?: string,
            theme?: string,
        ) => Promise<void>
    >("notify:sendVerificationEmail");
    const queueVerificationEmail = ctx.capabilities.get<
        (
            to: string,
            code: string,
            verifyUrl?: string,
            theme?: string,
        ) => Promise<{
            notificationId: string;
            status:
                "queued" | "waiting_rate_limit" | "sending" | "sent" | "failed";
            createdAt: string;
            updatedAt: string;
            availableAt?: string;
            error?: string;
            recipientEmail?: string;
        }>
    >("notify:queueVerificationEmail");
    const getPrimaryEmail = ctx.capabilities.get<
        (accountId: string) => Promise<string | null>
    >("notify:getPrimaryEmail");
    const setNotifySenderEnabled = ctx.capabilities.get<
        (senderId: string, enabled: boolean) => Promise<void>
    >("notify:setSenderEnabled");
    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    const gateway = new CoreTfaGateway(store, {
        dispatchNotification,
        adapterFactoryContext: {
            canSendVerificationEmail,
            sendVerificationEmail,
            queueVerificationEmail,
            getPrimaryEmail,
            log: ctx.log,
        },
        log: ctx.log,
    });
    const revokeSetupPendingAccessTokens = ctx.capabilities.get<
        (excludedSubject?: string) => number
    >("auth:revokeSetupPendingAccessTokens");
    const tfaAdaptersRoot = path.join(ctx.adaptersRoot, "tfa");
    await gateway.discoverAdapters(tfaAdaptersRoot);
    await gateway.loadPersistedConfigs();
    const smtpAdapter = gateway.getAdapter("smtp") as
        (TfaMethodAdapter & { getCodeLength?: () => number }) | null;
    if (smtpAdapter) {
        gateway.setAdapterSyncTarget("smtp", {
            gatewayId: "notify",
            adapterId: "smtp",
        });
        if (setNotifySenderEnabled) {
            gateway.onAdapterEnabledChange(
                "tfa-smtp:sync-notify-smtp",
                async (adapterId, enabled) => {
                    if (adapterId === "smtp" && enabled) {
                        await setNotifySenderEnabled("smtp", true);
                    }
                },
            );
            // Adapter change listeners only observe updates made after startup.
            // Reconcile persisted state as well so SMTP setup can send its
            // verification code immediately after a restart.
            if (gateway.isAdapterEnabled("smtp")) {
                await setNotifySenderEnabled("smtp", true);
            }
        }
        ctx.capabilities.contribute("tfa:smtpCodeLength", () =>
            smtpAdapter.getCodeLength?.(),
        );
    }
    ctx.routeRegistry.register(
        createTfaRoutes(gateway, ctx.capabilities, ctx.log),
        "tfa",
    );
    ctx.routeRegistry.register(
        createTfaAdapterAdminRoutes(gateway, ctx.log),
        "tfa",
    );
    if (typeof registerNotificationCategory === "function") {
        registerNotificationCategory("security", "Security");
    }

    ctx.routeRegistry.registerPrefix("/api/v1/tfa", "tfa");
    ctx.gatewayRegistry.register({
        id: "tfa",
        name: "Two-Factor Authentication Gateway",
        version: manifestVersion,
        description:
            "Manages two-factor authentication methods and login checks.",
        publisher: "Cognis Labs HQ",
        required: false,
        hasAdapters: true,
    });
    const gatewayUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "tfa",
        "ui",
    );
    ctx.uiRegistry?.registerStaticDir("tfa", gatewayUiDir);
    const registerSecuritySection = ctx.capabilities.get<
        (section: {
            id: string;
            scriptUrl: string;
            stringsBaseUrl?: string | string[];
        }) => void
    >("auth:registerSecuritySection");
    registerSecuritySection?.({
        id: "tfa",
        scriptUrl: "/static/gateways/tfa/settings-section.js",
        stringsBaseUrl: [
            "/static/gateways/tfa/languages",
            "/static/adapters/tfa/totp/languages",
            "/static/adapters/tfa/smtp/languages",
        ],
    });
    registerLimitedAuthPathAllowance("tfa", (path, _accountId) => {
        if (path === "/api/v1/tfa/status" || path === "/api/v1/tfa/methods") {
            return true;
        }
        if (path.startsWith("/api/v1/tfa/methods/")) {
            return true;
        }
        if (
            path === "/api/v1/tfa/recovery-codes" ||
            path === "/api/v1/tfa/recovery-codes/rotate"
        ) {
            return true;
        }
        return false;
    });
    const adapterDirs = await readdir(tfaAdaptersRoot, {
        withFileTypes: true,
    }).catch(() => []);
    for (const adapterDir of adapterDirs) {
        if (!adapterDir.isDirectory()) continue;
        ctx.uiRegistry?.registerAdapterStaticDir(
            "tfa",
            adapterDir.name,
            path.join(tfaAdaptersRoot, adapterDir.name),
        );
    }
    const isGatewayEnabled = () =>
        ctx.gatewayRegistry.get("tfa")?.status !== "disabled";

    ctx.capabilities.contribute(
        "tfa:getUserStatus",
        async (accountId: string) => gateway.getUserStatus(accountId),
    );
    ctx.capabilities.contribute(
        "tfa:getLoginMethods",
        async (accountId: string) => gateway.getLoginMethods(accountId),
    );
    ctx.capabilities.contribute(
        "tfa:verifyLogin",
        async (
            accountId: string,
            methodId: string,
            payload: Record<string, unknown>,
        ) => gateway.verifyLogin(accountId, methodId, payload),
    );
    ctx.capabilities.contribute(
        "tfa:isSecondFactorEnabled",
        async (accountId: string) => gateway.isSecondFactorEnabled(accountId),
    );
    ctx.capabilities.contribute(
        "tfa:isSetupRequired",
        async (accountId: string) => gateway.isSetupRequired(accountId),
    );
    ctx.capabilities.contribute("tfa:resetUser", async (accountId: string) =>
        gateway.resetUser(accountId),
    );
    ctx.capabilities.contribute("tfa:getEnforceAllUsers", async () =>
        gateway.getEnforceAllUsers(),
    );
    ctx.capabilities.contribute(
        "tfa:setEnforceAllUsers",
        async (required: boolean) => gateway.setEnforceAllUsers(required),
    );
    ctx.capabilities.contribute(
        "tfa:applyEnforcementPolicy",
        async (input: { required: boolean; excludedSubject?: string }) => {
            const previousRequired = await gateway.getEnforceAllUsers();
            await gateway.setEnforceAllUsers(input.required);
            let revokedSetupPendingCount = 0;
            if (previousRequired && !input.required) {
                revokedSetupPendingCount =
                    revokeSetupPendingAccessTokens?.(input.excludedSubject) ??
                    0;
            }
            return {
                required: input.required,
                previousRequired,
                revokedSetupPendingCount,
            };
        },
    );
    if (ctx.flow.exists("construct-login-ui")) {
        ctx.flow.extend(
            "construct-login-ui",
            "compose-form",
            { id: "tfa-gateway:login-ui-integration", order: 100 },
            () => ({
                integrations: isGatewayEnabled()
                    ? [
                          {
                              id: "tfa",
                              scriptUrl: "/static/gateways/tfa/login-flow.js",
                              stringsBaseUrl: [
                                  "/static/gateways/tfa/languages",
                                  "/static/adapters/tfa/smtp/languages",
                                  "/static/adapters/tfa/totp/languages",
                              ],
                          },
                      ]
                    : [],
            }),
        );
    }
    if (ctx.flow.exists("login")) {
        ctx.flow.extend(
            "login",
            "establish-session",
            { id: "tfa-gateway:enforce-second-factor", order: 100 },
            async (stageCtx) => {
                if (!isGatewayEnabled()) {
                    return null;
                }
                const currentSessionResult = stageCtx.data["sessionResult"] as
                    Record<string, unknown> | undefined;
                if (currentSessionResult?.outcome !== "success") {
                    return null;
                }
                const accountId = String(
                    currentSessionResult.accountId ?? "",
                ).trim();
                if (!accountId) {
                    return null;
                }
                const userStatus = await gateway
                    .getUserStatus(accountId)
                    .catch(() => null);
                if (!userStatus) {
                    return null;
                }
                if (userStatus.hasConfiguredMethod) {
                    const methods = await gateway
                        .getLoginMethods(accountId)
                        .catch(() => [])
                        .then((items) =>
                            items.filter(
                                (item) =>
                                    typeof item.id === "string" &&
                                    typeof item.name === "string",
                            ),
                        );
                    if (methods.length < 1) {
                        const unavailableResult = {
                            outcome: "tfa_unavailable",
                        };
                        stageCtx.data["sessionResult"] = unavailableResult;
                        return { sessionResult: unavailableResult };
                    }
                    const createPendingLoginAttempt = ctx.capabilities.get<
                        (input: PendingLoginAttemptInput) => { id: string }
                    >("tfa:createPendingLoginAttempt");
                    if (!createPendingLoginAttempt) {
                        const unavailableResult = {
                            outcome: "tfa_unavailable",
                        };
                        stageCtx.data["sessionResult"] = unavailableResult;
                        return { sessionResult: unavailableResult };
                    }
                    const pendingAttempt = createPendingLoginAttempt({
                        accountId,
                        role:
                            (currentSessionResult.role as
                                | "user"
                                | "teacher"
                                | "moderator"
                                | "admin"
                                | "owner") ?? "user",
                        isFounder: currentSessionResult.isFounder === true,
                        provider: String(currentSessionResult.provider ?? ""),
                        providerId: String(
                            currentSessionResult.providerId ?? "",
                        ),
                        displayName: String(
                            currentSessionResult.displayName ?? accountId,
                        ),
                        userValidationMode:
                            currentSessionResult.userValidationMode === "smtp"
                                ? "smtp"
                                : "none",
                        requiredUserValidation:
                            currentSessionResult.requiredUserValidation ===
                            true,
                        ttlSeconds:
                            typeof currentSessionResult.ttlSeconds === "number"
                                ? currentSessionResult.ttlSeconds
                                : null,
                    });
                    const tfaRequiredResult = {
                        ...currentSessionResult,
                        outcome: "tfa_required",
                        loginAttemptId: pendingAttempt.id,
                        methods,
                    };
                    stageCtx.data["sessionResult"] = tfaRequiredResult;
                    return { sessionResult: tfaRequiredResult };
                }
                if (userStatus.requiresSetup) {
                    const issueAccessTokenFn = ctx.capabilities.get<
                        (
                            subject: string,
                            role:
                                | "user"
                                | "teacher"
                                | "moderator"
                                | "admin"
                                | "owner",
                            ttlSeconds: number | null,
                            options?: Record<string, unknown>,
                        ) => string
                    >("auth:issueAccessToken");
                    if (!issueAccessTokenFn) {
                        const unavailableResult = {
                            outcome: "tfa_unavailable",
                        };
                        stageCtx.data["sessionResult"] = unavailableResult;
                        return { sessionResult: unavailableResult };
                    }
                    const ttlSeconds =
                        typeof currentSessionResult.ttlSeconds === "number"
                            ? currentSessionResult.ttlSeconds
                            : null;
                    const setupToken = issueAccessTokenFn(
                        accountId,
                        (currentSessionResult.role as
                            | "user"
                            | "teacher"
                            | "moderator"
                            | "admin"
                            | "owner") ?? "user",
                        ttlSeconds,
                        {
                            providerId: currentSessionResult.providerId,
                            setupPending: true,
                        },
                    );
                    const tfaSetupRequiredResult = {
                        ...currentSessionResult,
                        outcome: "tfa_setup_required",
                        token: setupToken,
                        ttlSeconds,
                    };
                    stageCtx.data["sessionResult"] = tfaSetupRequiredResult;
                    return { sessionResult: tfaSetupRequiredResult };
                }
                return null;
            },
        );
    }

    ctx.log?.("info", "TFA gateway initialized.", {
        component: "tfa-gateway",
        adapterCount: gateway.listAdapters().length,
    });

    if (ctx.flow.exists("bootstrap-platform")) {
        ctx.flow.extend(
            "bootstrap-platform",
            "register-flows",
            { id: "tfa-gateway:bootstrap-registration" },
            () => ({
                gatewayId: "tfa",
                registeredFlowIds: ["login", "construct-login-ui"],
            }),
        );
    }
}
