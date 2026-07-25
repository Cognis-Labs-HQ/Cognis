import path from "node:path";
import { type GatewayBootstrapContext } from "../../shared.js";
import { CoreNotificationGateway } from "../gateway.js";
import {
    TfaCodeService,
    InMemoryTfaStore,
} from "../../../api/reuse/tfa-code.js";
import {
    VerifyTokenService,
    InMemoryVerifyTokenStore,
} from "../../../api/reuse/verify-token.js";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import {
    parseSecuritySettings,
    SECURITY_SETTINGS_KEY,
} from "../../../api/reuse/security-settings.js";
import { type RouteContext } from "../../../api/reuse/route-context.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createNotificationRoutes } from "../routes/index.js";
import { loadNotificationStores, serveHtmlPage } from "./stores.js";
import { createUserEmailRoutes } from "./user-email-routes.js";
import { createGatewayAdapterRoutes } from "./adapter-routes.js";

export { createUserEmailRoutes };

/**
 * Standard gateway bootstrap entry point. Discovers notification adapters,
 * wires all notification and user-email routes into the route registry, and
 * registers this gateway in the gateway registry. Core never calls anything
 * inside this module directly.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const { dbExecutor, notifStore, notificationPrefStore } =
        await loadNotificationStores(ctx);
    await notifStore.ensureSchema();
    ctx.log?.("info", "Notification store schema ready.", {
        component: "notify-gateway",
    });

    const gateway = new CoreNotificationGateway(
        notificationPrefStore,
        notifStore,
        notifStore,
    );

    const notifyAdaptersRoot = path.join(ctx.adaptersRoot, "notify");
    await gateway.discoverSenders(notifyAdaptersRoot);
    await gateway.loadPersistedConfigs();
    gateway.registerCategory("system", "System Notifications");
    ctx.log?.("info", "Notification senders discovered and configured.", {
        component: "notify-gateway",
        adaptersRoot: notifyAdaptersRoot,
        senderCount: gateway.listSenders().length,
    });

    await gateway.bootstrapAdapters(notifyAdaptersRoot, {
        gateway,
        capabilities: ctx.capabilities,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "notify"),
        registerNavbarPlugin: (scriptUrl) =>
            ctx.uiRegistry?.registerNavbarPlugin({ scriptUrl }),
        registerStaticDir: (prefix, dir) =>
            ctx.uiRegistry?.registerStaticDir(prefix, dir),
        log: ctx.log,
        dbExecutor,
    });
    ctx.log?.("info", "Notification adapter bootstrapping complete.", {
        component: "notify-gateway",
    });

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const getTfaSmtpCodeLength = () =>
        ctx.capabilities.get<() => number | undefined>(
            "tfa:smtpCodeLength",
        )?.();
    const externalHost =
        process.env.EXTERNAL_HOST ??
        (process.env.HOST ? `http://${process.env.HOST}` : undefined);
    const preferenceStore =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");
    const getTrustedDomains = async (): Promise<string[]> => {
        if (!preferenceStore) return [];
        const raw = await preferenceStore
            .get("__system__", SECURITY_SETTINGS_KEY)
            .catch(() => null);
        return parseSecuritySettings(raw)?.trustedDomains ?? [];
    };

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "notify",
        "ui",
    );

    ctx.routeRegistry.register(
        createNotificationRoutes(gateway, notifStore, {
            getTrustedDomains,
            routeContext,
        }),
        "notify",
    );
    ctx.routeRegistry.register(
        createUserEmailRoutes(
            notifStore,
            tfaService,
            verifyTokenService,
            gateway,
            externalHost,
            routeContext,
            getTfaSmtpCodeLength,
        ),
        "notify",
    );
    ctx.routeRegistry.register(
        async (
            req: IncomingMessage,
            res: ServerResponse,
            url: URL,
        ): Promise<boolean> => {
            if (url.pathname !== "/verify-email" || req.method !== "GET")
                return false;
            await serveHtmlPage(res, path.join(uiDir, "verify-email.html"));
            return true;
        },
        "notify",
    );
    ctx.routeRegistry.register(
        createGatewayAdapterRoutes(
            "notify",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "notify",
    );
    ctx.log?.("info", "Notification gateway routes registered.", {
        component: "notify-gateway",
    });

    ctx.routeRegistry.registerPrefix("/api/v1/notify", "notify");
    ctx.gatewayRegistry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "1.5.0",
        description: "Dispatches notifications via pluggable adapter senders.",
        publisher: "Cognis Labs HQ",
        required: true,
        hasAdapters: true,
    });

    ctx.uiRegistry?.registerAdminSection({
        id: "notifications",
        label: "Notifications",
        scriptUrl: "/static/gateways/notify/admin-section.js",
        stringsBaseUrl: "/static/gateways/notify/languages",
    });
    ctx.uiRegistry?.registerAdminSection({
        id: "broadcasts",
        label: "Broadcasts",
        scriptUrl: "/static/gateways/notify/broadcast-admin-section.js",
        stringsBaseUrl: "/static/gateways/notify/languages",
    });
    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/notify/broadcast-navbar-plugin.js",
    });
    ctx.uiRegistry?.registerStaticDir("notify", uiDir);
    ctx.uiRegistry?.registerSettingsSection({
        id: "notifications",
        label: "Notifications",
        scriptUrl: "/static/gateways/notify/notification-prefs.js",
    });
    const isGatewayEnabled = () =>
        ctx.gatewayRegistry.get("notify")?.status !== "disabled";

    if (ctx.flow.exists("construct-settings-ui")) {
        ctx.flow.extend(
            "construct-settings-ui",
            "resolve-sections",
            { id: "notify-gateway:resolve-sections" },
            () => ({
                gatewayId: "notify",
                sectionId: "notifications",
                scriptUrl: "/static/gateways/notify/notification-prefs.js",
            }),
        );
    }
    if (ctx.flow.exists("construct-login-ui")) {
        ctx.flow.extend(
            "construct-login-ui",
            "compose-form",
            {
                id: "notify-gateway:login-ui-required-email-integration",
                order: 50,
            },
            () => ({
                integrations: isGatewayEnabled()
                    ? [
                          {
                              id: "required-email-enforcement",
                              scriptUrl:
                                  "/static/gateways/notify/login-required-email-flow.js",
                              stringsBaseUrl:
                                  "/static/gateways/notify/languages",
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
            { id: "notify-gateway:smtp-enforcement", order: 50 },
            async (stageCtx) => {
                const sessionResult = stageCtx.data["sessionResult"] as
                    | Record<string, unknown>
                    | undefined;
                if (sessionResult?.outcome !== "success") {
                    return null;
                }
                const role = String(sessionResult.role ?? "user");
                const isFounder = sessionResult.isFounder === true;
                const isInitialAdmin =
                    (role === "admin" || role === "owner") && isFounder;
                const hasVerifiedEmail = sessionResult.accountId
                    ? await notifStore.hasVerifiedEmail(
                          String(sessionResult.accountId),
                      )
                    : false;
                const requiresUserValidation =
                    isGatewayEnabled() &&
                    sessionResult.userValidationMode === "smtp" &&
                    !isInitialAdmin &&
                    !hasVerifiedEmail
                        ? gateway.canSendVerificationEmail()
                        : false;
                const nextSessionResult = {
                    ...sessionResult,
                    requiredUserValidation: requiresUserValidation,
                };
                stageCtx.data["sessionResult"] = nextSessionResult;
                return { sessionResult: nextSessionResult };
            },
        );
    }

    // Expose the notification gateway itself + a thin dispatch helper as
    // capabilities so other adapters (e.g. the social/messages adapter) can
    // hand off delivery without holding a direct reference to this gateway.
    /**
     * notify:gateway — notification gateway surface for advanced sender/category
     * consumers.
     */
    ctx.capabilities.contribute("notify:gateway", gateway);
    /**
     * notify:dispatch — one-shot notification dispatch helper for other
     * components.
     */
    ctx.capabilities.contribute(
        "notify:dispatch",
        (envelope: Parameters<typeof gateway.dispatch>[0]) =>
            gateway.dispatch(envelope),
    );
    /**
     * notify:dispatchToRole — role-based notification fan-out helper for
     * admin/module flows.
     */
    ctx.capabilities.contribute(
        "notify:dispatchToRole",
        async (
            role: "admin" | "teacher" | "user",
            envelope: Omit<
                Parameters<typeof gateway.dispatch>[0],
                "recipientUsername"
            >,
        ) => {
            const accountStore = ctx.capabilities.get<{
                list(): Promise<
                    Array<{
                        username: string;
                        role?: string;
                    }>
                >;
            }>("auth:accountStore");
            if (!accountStore) return { recipients: [], dispatched: [] };
            const users = await accountStore.list();
            const recipients = users
                .filter((user) => {
                    const userRole = user.role ?? "user";
                    if (role === "admin")
                        return userRole === "admin" || userRole === "owner";
                    if (role === "teacher") return userRole === "teacher";
                    return userRole === "user";
                })
                .map((user) => user.username);
            const dispatched: Array<{
                recipientUsername: string;
                result: Awaited<ReturnType<typeof gateway.dispatch>>;
            }> = [];
            for (const recipientUsername of recipients) {
                const result = await gateway.dispatch({
                    ...envelope,
                    recipientUsername,
                });
                dispatched.push({ recipientUsername, result });
            }
            return { recipients, dispatched };
        },
    );
    /**
     * notify:registerCategory — allows other components to register categories
     * through this gateway.
     */
    ctx.capabilities.contribute(
        "notify:registerCategory",
        (id: string, label: string) => gateway.registerCategory(id, label),
    );

    /**
     * notify:canSendRegistrationInviteEmail — reports whether invite-email
     * delivery is currently available.
     */
    ctx.capabilities.contribute("notify:canSendRegistrationInviteEmail", () =>
        gateway.canSendRegistrationInviteEmail(),
    );
    /**
     * notify:canSendVerificationEmail — reports whether verification-email
     * delivery is currently available.
     */
    ctx.capabilities.contribute("notify:canSendVerificationEmail", () =>
        gateway.canSendVerificationEmail(),
    );
    ctx.capabilities.contribute("notify:isSenderEnabled", (senderId: string) =>
        gateway.isSenderEnabled(senderId),
    );
    ctx.capabilities.contribute(
        "notify:setSenderEnabled",
        async (senderId: string, enabled: boolean) => {
            if (enabled) {
                await gateway.enableSender(senderId);
            } else {
                await gateway.disableSender(senderId);
            }
        },
    );
    ctx.capabilities.contribute(
        "notify:onSenderEnabledChange",
        (
            listenerId: string,
            listener: (
                senderId: string,
                enabled: boolean,
            ) => Promise<void> | void,
        ) => gateway.onSenderEnabledChange(listenerId, listener),
    );
    ctx.capabilities.contribute(
        "notify:updateSenderConfig",
        (senderId: string, patch: Record<string, unknown>) =>
            gateway.updateProviderConfig(senderId, patch),
    );
    ctx.capabilities.contribute(
        "notify:onSenderConfigChange",
        (
            listenerId: string,
            listener: (
                senderId: string,
                config: Record<string, unknown>,
            ) => Promise<void> | void,
        ) => gateway.onSenderConfigChange(listenerId, listener),
    );
    ctx.capabilities.contribute(
        "notify:sendVerificationEmail",
        async (to: string, code: string, verifyUrl?: string, theme?: string) =>
            gateway.sendVerificationEmail(to, code, verifyUrl, theme),
    );
    ctx.capabilities.contribute(
        "notify:queueVerificationEmail",
        async (to: string, code: string, verifyUrl?: string, theme?: string) =>
            gateway.queueVerificationEmail(to, code, verifyUrl, theme),
    );
    ctx.capabilities.contribute("notify:canSendOneTimeLoginEmail", () =>
        gateway.canSendOneTimeLoginEmail(),
    );
    /**
     * notify:sendRegistrationInviteEmail — sends a registration invite via the
     * active notification sender.
     */
    ctx.capabilities.contribute(
        "notify:sendRegistrationInviteEmail",
        async (
            to: string,
            inviterDisplayName: string,
            inviteUrl: string,
            theme?: string,
        ) =>
            gateway.sendRegistrationInviteEmail(
                to,
                inviterDisplayName,
                inviteUrl,
                theme,
            ),
    );
    ctx.capabilities.contribute(
        "notify:sendOneTimeLoginEmail",
        async (
            to: string,
            loginUrl: string,
            options?: {
                theme?: string;
                subject?: string;
                body?: string;
                actionLabel?: string;
            },
        ) => gateway.sendOneTimeLoginEmail(to, loginUrl, options),
    );
    /**
     * notify:isEmailRegistered — checks whether an email is already registered
     * in notification-owned identity data.
     */
    ctx.capabilities.contribute(
        "notify:isEmailRegistered",
        async (email: string) => notifStore.isEmailRegistered(email),
    );
    /**
     * notify:upsertVerifiedPrimaryEmail — stores a verified primary email for
     * an account.
     */
    ctx.capabilities.contribute(
        "notify:upsertVerifiedPrimaryEmail",
        async (accountId: string, email: string) =>
            notifStore.upsertVerifiedPrimaryEmail(accountId, email),
    );
    ctx.capabilities.contribute(
        "notify:provisionUserEmails",
        async (
            accountId: string,
            listedEmails: string[],
            options?: { sendPrimaryVerification?: boolean },
        ) => {
            const emails = Array.from(
                new Set(
                    listedEmails
                        .map((email) => email.trim().toLowerCase())
                        .filter(Boolean),
                ),
            );
            const acceptedEmails: string[] = [];
            for (const email of emails) {
                if (
                    await notifStore.isEmailRegisteredByOtherUser(
                        email,
                        accountId,
                    )
                ) {
                    continue;
                }
                await notifStore.addUserEmail(accountId, email);
                acceptedEmails.push(email);
            }
            const primaryEmail = acceptedEmails[0];
            if (!primaryEmail) return;
            await notifStore.setPrimaryEmail(accountId, primaryEmail);
            const provisionedEmails = await notifStore.getUserEmails(accountId);
            const primaryIsVerified = provisionedEmails.some(
                (entry) =>
                    entry.email === primaryEmail && entry.verified === true,
            );
            if (
                options?.sendPrimaryVerification === true &&
                !primaryIsVerified &&
                gateway.canSendVerificationEmail()
            ) {
                const key = `${accountId}:${primaryEmail}`;
                const code = tfaService.issueOrGet(
                    key,
                    15 * 60 * 1000,
                    getTfaSmtpCodeLength(),
                );
                const watchToken = verifyTokenService.issueOrGet(key);
                const verifyUrl = externalHost
                    ? `${externalHost}/verify-email?token=${watchToken}`
                    : undefined;
                await gateway.sendVerificationEmail(
                    primaryEmail,
                    code,
                    verifyUrl,
                );
            }
        },
    );
    /**
     * notify:hasVerifiedEmail — indicates whether an account currently has a
     * verified email on file.
     */
    ctx.capabilities.contribute(
        "notify:hasVerifiedEmail",
        async (accountId: string) => notifStore.hasVerifiedEmail(accountId),
    );
    ctx.capabilities.contribute(
        "notify:getPrimaryEmail",
        async (accountId: string) => notifStore.getPrimaryEmail(accountId),
    );
    ctx.capabilities.contribute(
        "notify:getAccountIdByEmail",
        async (email: string) => notifStore.getAccountIdByEmail(email),
    );
    if (ctx.flow.exists("bootstrap-platform")) {
        ctx.flow.extend(
            "bootstrap-platform",
            "register-flows",
            { id: "notify-gateway:bootstrap-registration" },
            () => ({
                gatewayId: "notify",
                registeredFlowIds: ["login", "construct-login-ui"],
            }),
        );
    }
    ctx.log?.("info", "Notification gateway initialized.", {
        component: "notify-gateway",
        senderCount: gateway.listSenders().length,
    });
}
