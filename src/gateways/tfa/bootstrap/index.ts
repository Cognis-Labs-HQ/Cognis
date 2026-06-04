import { readdir } from "node:fs/promises";
import path from "node:path";
import {
    registerLimitedAuthPathAllowance,
    type GatewayBootstrapContext,
} from "../../shared.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import { DbTfaStore } from "../reuse/tfa-store.js";
import { CoreTfaGateway } from "../gateway.js";
import { createTfaRoutes } from "./tfa-routes.js";
import { createTfaAdapterAdminRoutes } from "./adapter-admin-routes.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor =
        ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor;
    if (!dbExecutor) {
        throw new Error("db_executor_unavailable");
    }

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
                | "queued"
                | "waiting_rate_limit"
                | "sending"
                | "sent"
                | "failed";
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

    ctx.gatewayRegistry.register({
        id: "tfa",
        name: "Two-Factor Authentication Gateway",
        version: "1.1.1",
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

    ctx.log?.("info", "TFA gateway initialized.", {
        component: "tfa-gateway",
        adapterCount: gateway.listAdapters().length,
    });

    if (ctx.flow.exists("bootstrap-platform")) {
        ctx.flow.extend(
            "bootstrap-platform",
            "register-flows",
            { id: "tfa-gateway:bootstrap-registration" },
            () => ({ gatewayId: "tfa", registeredFlowIds: [] }),
        );
    }
}
