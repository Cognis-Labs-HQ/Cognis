import path from "node:path";
import { type GatewayBootstrapContext } from "../../shared.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import type { LocalAccountStore } from "../../../api/reuse/account-store.js";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import {
    parseSecuritySettings,
    SECURITY_SETTINGS_KEY,
} from "../../../api/reuse/security-settings.js";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import { CoreRegistrationGateway } from "../gateway.js";
import { createRegistrationPageRoutes } from "./page-routes.js";
import { createRegistrationRoutes } from "./registration-routes.js";
import { createGatewayAdapterRoutes } from "./adapter-admin-routes.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const dbExecutor = ctx.capabilities.require<DbExecutor>("db:executor");
    const accountStore =
        ctx.capabilities.get<LocalAccountStore>("auth:accountStore");
    if (!accountStore) return;

    const canSendInviteEmail = ctx.capabilities.get<() => boolean>(
        "notify:canSendRegistrationInviteEmail",
    );
    const sendInviteEmail = ctx.capabilities.get<
        (
            to: string,
            inviterDisplayName: string,
            inviteUrl: string,
            theme?: string,
        ) => Promise<void>
    >("notify:sendRegistrationInviteEmail");

    const createProfile = ctx.capabilities.get<
        (
            accountId: string,
            handle: string,
            role?: string,
            displayName?: string,
        ) => Promise<void>
    >("profile:createProfile");
    const isEmailRegistered = ctx.capabilities.get<
        (email: string) => Promise<boolean>
    >("notify:isEmailRegistered");
    const upsertVerifiedPrimaryEmail = ctx.capabilities.get<
        (accountId: string, email: string) => Promise<void>
    >("notify:upsertVerifiedPrimaryEmail");
    const gateway = new CoreRegistrationGateway(dbExecutor);
    await gateway.ensureSchema();
    ctx.log?.("info", "Registration gateway schema ready.", {
        component: "registration-gateway",
    });
    const registrationAdaptersRoot = path.join(
        ctx.adaptersRoot,
        "registration",
    );
    await gateway.discoverAdapters(registrationAdaptersRoot, {
        dbExecutor,
        accountStore,
        log: ctx.log,
        canSendInviteEmail: canSendInviteEmail ?? (() => false),
        sendInviteEmail:
            sendInviteEmail ??
            (async () => {
                throw new Error("smtp_unavailable");
            }),
        createProfile,
        isEmailRegistered: isEmailRegistered ?? (async () => false),
        upsertVerifiedPrimaryEmail:
            upsertVerifiedPrimaryEmail ??
            (async () => {
                throw new Error("smtp_unavailable");
            }),
    });
    await gateway.loadPersistedConfigs();
    ctx.log?.("info", "Registration adapters discovered and configured.", {
        component: "registration-gateway",
        adaptersRoot: registrationAdaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    const preferenceStore =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");

    async function getTrustedDomains(): Promise<string[]> {
        if (!preferenceStore) return [];
        const raw = await preferenceStore
            .get("__system__", SECURITY_SETTINGS_KEY)
            .catch(() => null);
        return parseSecuritySettings(raw)?.trustedDomains ?? [];
    }

    function isGatewayEnabled(): boolean {
        return ctx.gatewayRegistry.get("registration")?.status !== "disabled";
    }

    ctx.routeRegistry.register(
        createRegistrationRoutes(
            gateway,
            accountStore,
            getTrustedDomains,
            isGatewayEnabled,
            ctx.log,
            routeContext,
        ),
        "registration",
    );
    ctx.routeRegistry.register(
        createRegistrationPageRoutes(routeContext),
        "registration",
    );
    ctx.log?.("info", "Registration gateway routes registered.", {
        component: "registration-gateway",
    });
    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "registration",
        "ui",
    );
    ctx.uiRegistry?.registerAdminSection({
        id: "registration",
        label: "Registration",
        scriptUrl: "/static/gateways/registration/admin-section.js",
        stringsBaseUrl: "/static/gateways/registration/languages",
    });
    ctx.uiRegistry?.registerStaticDir("registration", uiDir);
    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/registration/navbar.js",
    });
    ctx.uiRegistry?.registerAuthTypingMessage({
        id: "registration-register-today",
        textKey: "ui.app.login.typing.sample.7",
        ownerType: "adapter",
        ownerId: "public",
        isEnabled: () => isGatewayEnabled() && gateway.isPublicEnabled(),
    });

    ctx.capabilities.contribute(
        "registration:public:isEnabled",
        () => isGatewayEnabled() && gateway.isPublicEnabled(),
    );
    ctx.capabilities.contribute(
        "registration:public:register",
        async (input: {
            username: string;
            password: string;
            email?: string;
            displayName?: string;
        }) => {
            if (!isGatewayEnabled()) throw new Error("gateway_disabled");
            return gateway.registerPublic(input);
        },
    );

    ctx.routeRegistry.register(
        createGatewayAdapterRoutes(
            "registration",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "registration",
    );

    ctx.routeRegistry.registerPrefix("/api/v1/registration", "registration");
    ctx.gatewayRegistry.register({
        id: "registration",
        name: "Registration Gateway",
        version: "1.1.10",
        description:
            "Registration workflows via pluggable invite/public adapters.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });
    ctx.log?.("info", "Registration gateway initialized.", {
        component: "registration-gateway",
        adapterCount: gateway.listAdapters().length,
    });

    if (ctx.flow.exists("bootstrap-platform")) {
        ctx.flow.extend(
            "bootstrap-platform",
            "register-flows",
            { id: "registration-gateway:bootstrap-registration" },
            () => ({ gatewayId: "registration", registeredFlowIds: [] }),
        );
    }
}

export { createRegistrationPageRoutes, createRegistrationRoutes };
