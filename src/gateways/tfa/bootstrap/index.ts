import { requireBootstrapScope } from "@cognis/core";
import type { TfaChallengeLifetime } from "../contracts/method.js";
import { registerEnforcementPolicy } from "./enforcement-policy.js";
import { createRouteLifetime } from "./route-lifetime.js";
import { registerSessionAssessment } from "./session-assessment.js";
import { readGatewayManifestVersion } from "../../reuse/manifest-version.js";
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
    const manifestVersion = await readGatewayManifestVersion(
        import.meta.url,
        "../manifest.json",
    );
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
    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    const gateway = new CoreTfaGateway(store, {
        dispatchNotification,
        adapterFactoryContext: { log: ctx.log },
        log: ctx.log,
    });
    requireBootstrapScope().registerDisposer(() => gateway.disposeChallenges());
    const tfaAdaptersRoot = path.join(ctx.adaptersRoot, "tfa");
    await gateway.discoverAdapters(tfaAdaptersRoot);
    await gateway.loadPersistedConfigs();
    await gateway.bootstrapAdapters(ctx.capabilities);
    const routeLifetime = createRouteLifetime(ctx);
    routeLifetime.register(
        createTfaRoutes(gateway, ctx.capabilities, ctx.log, routeLifetime),
    );
    routeLifetime.register(createTfaAdapterAdminRoutes(gateway, ctx.log));
    if (typeof registerNotificationCategory === "function") {
        registerNotificationCategory("security", "Security");
    }

    ctx.routeRegistry.registerPrefix("/api/v1/tfa", "tfa");
    ctx.uiRegistry?.registerCapabilityProvider({
        scriptUrl: "/static/gateways/tfa/tutorials.js",
        providesCapabilities: ["tfa:pageTutorials"],
        access: { minRole: "user" },
    });
    const gatewayUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "tfa",
        "ui",
    );
    ctx.uiRegistry?.registerStaticDir("tfa", gatewayUiDir);
    const adapterLanguageResources = gateway
        .listAdapters()
        .map((adapter) => adapter.stringsBaseUrl)
        .filter((url): url is string => Boolean(url));
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
            ...adapterLanguageResources,
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
        async (accountId: string, lifetime: TfaChallengeLifetime) =>
            gateway.getLoginMethods(accountId, lifetime),
    );
    ctx.capabilities.contribute(
        "tfa:verifyLogin",
        async (
            accountId: string,
            methodId: string,
            payload: Record<string, unknown>,
            lifetime: TfaChallengeLifetime,
        ) => gateway.verifyLogin(accountId, methodId, payload, lifetime),
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
                                  ...adapterLanguageResources,
                              ],
                          },
                      ]
                    : [],
            }),
        );
    }
    const suspendAssessments = registerSessionAssessment(ctx, gateway);
    registerEnforcementPolicy(ctx, gateway, suspendAssessments);

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
