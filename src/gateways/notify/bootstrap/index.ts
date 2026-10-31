import type { RegisterNotificationAction, SendEmailAction } from "@cognis/core";
import { readGatewayManifestVersion } from "../../reuse/manifest-version.js";
import { emailVerificationKey } from "./email-verification-key.js";
import path from "node:path";
import { readJson, type GatewayBootstrapContext } from "../../shared.js";
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
    const manifestVersion = await readGatewayManifestVersion(
        import.meta.url,
        "../manifest.json",
    );
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

    ctx.capabilities.contribute("notify:isSenderEnabled", (senderId: string) =>
        gateway.isSenderEnabled(senderId),
    );
    ctx.capabilities.contribute(
        "notify:registerAlwaysOnSender",
        (senderId: string) => gateway.registerAlwaysOnSender(senderId),
    );
    ctx.capabilities.contribute(
        "notify:testSender",
        (
            senderId: string,
            recipient: string,
            config?: Record<string, unknown>,
        ) => gateway.testSender(senderId, recipient, config),
    );
    ctx.capabilities.contribute("notify:listSenders", () =>
        gateway.listSenders(),
    );
    await gateway.bootstrapAdapters(notifyAdaptersRoot, {
        capabilities: ctx.capabilities,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "notify"),
        registerNavbarPlugin: (scriptUrl) =>
            ctx.uiRegistry?.registerNavbarPlugin({ scriptUrl }),
        registerStaticDir: (prefix, dir) =>
            ctx.uiRegistry?.registerStaticDir(prefix, dir),
        requireAuth: (req, res, minimumRole) =>
            routeContext?.requireAuth(req, res, minimumRole) ?? false,
        readJson: (req) => readJson(req) as Promise<Record<string, unknown>>,
        log: ctx.log,
        dbExecutor,
    });
    const registerEmailAction =
        ctx.capabilities.get<RegisterNotificationAction>(
            "notify:registerEmailPurpose",
        );
    const emailVerificationPurpose = registerEmailAction
        ? await registerEmailAction("emailVerification", (variables) => ({
              subject: "Verify your Cognis email address",
              body: `Your verification code is ${variables.code}.`,
              actionUrl: variables.verifyUrl || undefined,
              actionLabel: variables.verifyUrl ? "Verify email" : undefined,
          }))
        : undefined;
    const sendEmail =
        ctx.capabilities.get<SendEmailAction>("notify:sendEmail") ??
        (async () => {
            throw new Error("email_delivery_unavailable");
        });
    const emailAvailable = () =>
        ctx.capabilities.get<() => boolean>("notify:emailAvailable")?.() ===
        true;
    ctx.log?.("info", "Notification adapter bootstrapping complete.", {
        component: "notify-gateway",
    });

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const getEmailCodeLength = () =>
        ctx.capabilities.get<() => number | undefined>(
            "notify:emailCodeLength",
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
            emailAvailable,
        }),
        "notify",
    );
    ctx.routeRegistry.register(
        createUserEmailRoutes(
            notifStore,
            tfaService,
            verifyTokenService,
            {
                purpose: emailVerificationPurpose!,
                canSendVerificationEmail: emailAvailable,
                sendEmail,
            },
            externalHost,
            routeContext,
            getEmailCodeLength,
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
        version: manifestVersion,
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
    ctx.uiRegistry?.registerCapabilityProvider({
        scriptUrl: "/static/gateways/notify/email-client.js",
        providesCapabilities: ["notify:emailClient"],
    });
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
    // SSO redirects also establish sessions without visiting the login form.
    ctx.capabilities.contribute(
        "auth:getSetupIntegrations",
        async (accountId: string, role: string) => {
            const settings = parseSecuritySettings(
                (await preferenceStore?.get(
                    "__system__",
                    SECURITY_SETTINGS_KEY,
                )) ?? null,
            );
            const accounts = ctx.capabilities.get<{
                isFounder(id: string): Promise<boolean>;
            }>("auth:accountStore");
            const founder =
                (role === "admin" || role === "owner") &&
                (await accounts?.isFounder(accountId));
            if (
                !isGatewayEnabled() ||
                settings?.userValidationMode !== "email" ||
                founder
            )
                return [];
            const emails = await notifStore.getUserEmails(accountId);
            if (emails.some((email) => email.primary && email.verified))
                return [];
            return [
                {
                    scriptUrl:
                        "/static/gateways/notify/login-required-email-flow.js",
                },
            ];
        },
    );
    if (ctx.flow.exists("login")) {
        ctx.flow.extend(
            "login",
            "establish-session",
            { id: "notify-gateway:emailEnforcement", order: 50 },
            async (stageCtx) => {
                const sessionResult = stageCtx.data["sessionResult"] as
                    Record<string, unknown> | undefined;
                if (sessionResult?.outcome !== "success") {
                    return null;
                }
                const role = String(sessionResult.role ?? "user");
                const isFounder = sessionResult.isFounder === true;
                const isInitialAdmin =
                    (role === "admin" || role === "owner") && isFounder;
                const hasVerifiedEmail = sessionResult.accountId
                    ? (
                          await notifStore.getUserEmails(
                              String(sessionResult.accountId),
                          )
                      ).some(
                          (email) =>
                              email.primary === true && email.verified === true,
                      )
                    : false;
                const requiresUserValidation =
                    isGatewayEnabled() &&
                    sessionResult.userValidationMode === "email" &&
                    !isInitialAdmin &&
                    !hasVerifiedEmail;
                const nextSessionResult = {
                    ...sessionResult,
                    requiredUserValidation: requiresUserValidation,
                };
                stageCtx.data["sessionResult"] = nextSessionResult;
                return { sessionResult: nextSessionResult };
            },
        );
    }

    /**
     * notify:dispatch — one-shot notification dispatch helper for other
     * components.
     */
    ctx.capabilities.contribute(
        "notify:dispatch",
        async (envelope: Parameters<typeof gateway.dispatch>[0]) => {
            const profileIdentity = ctx.capabilities.get<{
                resolveAccountId(handle: unknown): Promise<string | null>;
            }>("social:profile:identity");
            const recipientAccountId = await profileIdentity
                ?.resolveAccountId(envelope.recipientUsername)
                .catch(() => null);
            return gateway.dispatch({
                ...envelope,
                recipientUsername:
                    recipientAccountId ?? envelope.recipientUsername,
            });
        },
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
                        accountId: string;
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
                .map((user) => user.accountId);
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
                emailAvailable()
            ) {
                const key = emailVerificationKey(accountId, primaryEmail);
                const code = tfaService.issueOrGet(
                    key,
                    15 * 60 * 1000,
                    getEmailCodeLength(),
                );
                const watchToken = verifyTokenService.issueOrGet(key);
                const verifyUrl = externalHost
                    ? `${externalHost}/verify-email?token=${watchToken}`
                    : undefined;
                await sendEmail({
                    purpose: emailVerificationPurpose!,
                    recipientEmail: primaryEmail,
                    variables: { code, verifyUrl: verifyUrl ?? "" },
                });
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
