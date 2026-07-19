import {
    AUTH_FLOW_CATALOG,
    BOOTSTRAP_FLOW_CATALOG,
    CTX_CAPABILITY,
    USER_LIFECYCLE_FLOW_CATALOG,
    registerCanonicalFlow,
} from "@cognis/core";
import type { Ctx } from "@cognis/core";
import { issueAccessToken, type AccessRole } from "../access-tokens.js";
import { resolveRole } from "./local-account.js";
import type { AuthBootstrapHookContext } from "./index.js";

function getEnabledLoginMethods(context: AuthBootstrapHookContext): Array<{
    id: string;
    name: string;
}> {
    return context.authGateway.getEnabledAdapters().map((adapter) => ({
        id: adapter.id,
        name: adapter.name,
    }));
}

export async function registerAuthBootstrapHook(
    context: AuthBootstrapHookContext,
): Promise<void> {
    // Canonical flow registration requires the full Ctx handle; use ctx.flow
    // for all subsequent stage hook injection.
    const systemCtx = context.ctx.capabilities.get<Ctx>(CTX_CAPABILITY)!;

    for (const flow of [
        ...BOOTSTRAP_FLOW_CATALOG,
        ...AUTH_FLOW_CATALOG,
        ...USER_LIFECYCLE_FLOW_CATALOG,
    ]) {
        registerCanonicalFlow(systemCtx, flow);
    }

    context.ctx.flow.extend(
        "bootstrap-platform",
        "register-flows",
        { id: "auth-gateway:bootstrap-registration" },
        () => ({
            gatewayId: "auth",
            registeredFlowIds: [
                ...AUTH_FLOW_CATALOG.map((flow) => flow.id),
                ...USER_LIFECYCLE_FLOW_CATALOG.map((flow) => flow.id),
            ],
        }),
    );

    context.ctx.flow.extend(
        "login",
        "resolve-provider",
        { id: "auth-gateway:enabled-providers" },
        () => {
            const enabledMethods = getEnabledLoginMethods(context);
            return {
                defaultProviderId: enabledMethods[0]?.id ?? null,
                enabledMethods,
            };
        },
    );

    context.ctx.flow.extend(
        "login",
        "authenticate",
        { id: "auth-gateway:authenticate" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                provider?: string;
                credentials?: Record<string, unknown>;
            };
            const resolveResult = (
                (stageCtx.stageResults["resolve-provider"] ?? []) as Array<{
                    defaultProviderId: string | null;
                }>
            )[0];
            const providerId =
                input.provider ?? resolveResult?.defaultProviderId ?? "local";
            const adapter =
                context.authGateway.getEnabledAdapter(providerId) ??
                context.authGateway.getEnabledAdapter("local");
            if (!adapter) {
                return { success: false, reason: "provider_unavailable" };
            }
            const credentials: Record<string, unknown> = {
                ...(input.credentials ?? {}),
            };
            const session = await adapter.authenticate(credentials);
            if (!session) {
                return { success: false, reason: "invalid_credentials" };
            }
            return { success: true, session, adapterId: adapter.id };
        },
    );

    context.ctx.flow.extend(
        "login",
        "establish-session",
        { id: "auth-gateway:establish-session" },
        async (stageCtx) => {
            const authResult = (
                (stageCtx.stageResults["authenticate"] ?? []) as Array<{
                    success: boolean;
                    reason?: string;
                    session?: {
                        accountId: string;
                        provider: string;
                        role?: string;
                    };
                    adapterId?: string;
                }>
            )[0];

            if (!authResult?.success || !authResult.session) {
                return {
                    sessionResult: {
                        outcome: authResult?.reason ?? "invalid_credentials",
                    },
                };
            }

            const { session, adapterId } = authResult;
            const capabilities = context.ctx.capabilities;

            let role: AccessRole = resolveRole(session.role);
            const profileStore = capabilities.get<{
                getProfile(accountId: string): Promise<{
                    role?: string;
                    lifecycleState?: "active" | "deactivated" | "archived";
                } | null>;
            }>("social:profileStore");
            if (profileStore) {
                const existingProfile = await profileStore
                    .getProfile(session.accountId)
                    .catch(() => null);
                if (existingProfile?.lifecycleState === "archived") {
                    return {
                        sessionResult: { outcome: "account_archived" },
                    };
                }
                if (existingProfile?.lifecycleState === "deactivated") {
                    return {
                        sessionResult: { outcome: "account_deactivated" },
                    };
                }
                if (existingProfile?.role === "owner") {
                    role = "owner";
                }
            }

            const isFounder = await context.accountStore
                .isFounder(session.accountId)
                .catch(() => false);
            if (isFounder && (role === "admin" || role === "owner")) {
                role = "owner";
            }

            const ttlSeconds =
                context.authRouteBootstrapRuntime.getAccessTokenTtlSeconds();
            const localAdapter = context.authGateway.getLocalAdapter();
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
            const displayName =
                (
                    await context.accountStore
                        .getDisplayName(session.accountId)
                        .catch(() => null)
                )?.trim() || undefined;
            await createProfile?.(
                session.accountId,
                session.accountId,
                role,
                displayName,
            );
            await capabilities.get<(username: string) => Promise<void>>(
                "files:quota:provisionUser",
            )?.(session.accountId);

            const securitySettings = await context
                .readSecuritySettings()
                .catch(() => ({
                    registrationsEnabled: false,
                    userValidationMode: "none" as const,
                }));
            const sharedPayload = {
                accountId: session.accountId,
                displayName: displayName ?? session.accountId,
                provider: session.provider,
                providerId: adapterId ?? session.provider,
                role,
                isFounder,
                userValidationMode: securitySettings.userValidationMode,
                // Baseline default; optional notify flow hooks can override this.
                requiredUserValidation: false,
            };
            const token = issueAccessToken(
                session.accountId,
                role,
                ttlSeconds,
                {
                    providerId: adapterId ?? session.provider,
                },
            );
            const sessionResult = {
                outcome: "success",
                token,
                ttlSeconds,
                ...sharedPayload,
            };
            stageCtx.data["sessionResult"] = sessionResult;
            return {
                sessionResult: {
                    ...sessionResult,
                },
            };
        },
    );

    context.ctx.flow.extend(
        "construct-login-ui",
        "resolve-methods",
        { id: "auth-gateway:login-methods" },
        () => ({
            methods: getEnabledLoginMethods(context),
        }),
    );

    context.ctx.flow.extend(
        "construct-login-ui",
        "compose-form",
        { id: "auth-gateway:compose-login-form" },
        () => ({
            integrations: [],
        }),
    );

    context.ctx.flow.extend(
        "construct-settings-ui",
        "resolve-sections",
        { id: "auth-gateway:security-section" },
        () => ({
            gatewayId: "auth",
            sectionId: "security",
            scriptUrl: "/static/gateways/auth/security-prefs/index.js",
            stringsBaseUrl: "/static/gateways/auth/languages",
        }),
    );

    context.ctx.flow.extend(
        "construct-settings-ui",
        "compose-page",
        { id: "auth-gateway:compose-settings-page" },
        (stageCtx) => {
            const flowSections = (stageCtx.stageResults["resolve-sections"] ??
                []) as Array<Record<string, unknown>>;
            const uiRegistry = stageCtx.meta["uiRegistry"] as
                | { listSettingsSections?: () => unknown[] }
                | undefined;
            const registrySections = uiRegistry?.listSettingsSections?.() ?? [];
            const uniqueSectionsById = new Map<
                string,
                Record<string, unknown>
            >();
            for (const section of [...flowSections, ...registrySections]) {
                if (!section || typeof section !== "object") {
                    continue;
                }
                const sectionRecord = section as Record<string, unknown>;
                const id = String(
                    sectionRecord["id"] ?? sectionRecord["sectionId"] ?? "",
                ).trim();
                if (!id) {
                    continue;
                }
                const existing = uniqueSectionsById.get(id);
                if (
                    existing &&
                    (existing["scriptUrl"] !== sectionRecord["scriptUrl"] ||
                        existing["label"] !== sectionRecord["label"])
                ) {
                    context.ctx.log?.(
                        "warn",
                        "Duplicate settings section has conflicting descriptor fields.",
                        {
                            component: "auth-gateway",
                            sectionId: id,
                            existingScriptUrl: existing["scriptUrl"],
                            nextScriptUrl: sectionRecord["scriptUrl"],
                            existingLabel: existing["label"],
                            nextLabel: sectionRecord["label"],
                        },
                    );
                }
                uniqueSectionsById.set(id, {
                    ...(existing ?? {}),
                    ...sectionRecord,
                    id,
                    sectionId: id,
                });
            }
            const allSections = Array.from(uniqueSectionsById.values());
            stageCtx.data["sections"] = allSections;
            return { sections: allSections };
        },
    );

    context.ctx.flow.extend(
        "provision-user",
        "validate-request",
        { id: "auth-gateway:validate-account-input" },
        (stageCtx) => {
            const input = (stageCtx.input ?? {}) as { role?: string };
            const VALID_ROLES = new Set([
                "user",
                "teacher",
                "moderator",
                "admin",
            ]);
            const role = String(input.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                return { valid: false, reason: "invalid_role", role };
            }
            return { valid: true, role };
        },
    );

    context.ctx.flow.extend(
        "provision-user",
        "persist-account",
        { id: "auth-gateway:create-account" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                username?: string;
                password?: string;
            };
            const validateResult = (
                (stageCtx.stageResults["validate-request"] ?? []) as Array<{
                    valid: boolean;
                    reason?: string;
                    role?: string;
                }>
            )[0];
            if (!validateResult?.valid) {
                return {
                    persisted: false,
                    reason: validateResult?.reason ?? "validation_failed",
                };
            }
            const username = String(input.username ?? "");
            const password = String(input.password ?? "").trim();
            const role = validateResult.role ?? "user";
            if (!password.trim()) {
                return { persisted: false, reason: "missing_password" };
            }
            if (!context.accountStore.register) {
                return { persisted: false, reason: "register_unavailable" };
            }
            const created = await context.accountStore.register(
                username,
                password,
                role === "admin",
            );
            return { persisted: true, created, role };
        },
    );

    context.ctx.flow.extend(
        "provision-user",
        "emit-events",
        { id: "auth-gateway:provision-emit" },
        (stageCtx) => {
            const persistResult = (
                (stageCtx.stageResults["persist-account"] ?? []) as Array<{
                    persisted: boolean;
                    created?: { username: string };
                    role?: string;
                }>
            )[0];
            if (!persistResult?.persisted) {
                return { emitted: false };
            }
            return {
                emitted: true,
                accountId: persistResult.created?.username,
                role: persistResult.role,
            };
        },
    );

    context.ctx.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "auth-gateway:authorize-deprovision" },
        (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                callerRole?: string;
                targetRole?: string;
                targetIsFounder?: boolean;
            };
            if (input.targetIsFounder) {
                return {
                    authorized: false,
                    reason: "protected_founder_account",
                };
            }
            if (
                input.callerRole === "admin" &&
                (input.targetRole === "admin" || input.targetRole === "owner")
            ) {
                return { authorized: false, reason: "protected_admin_account" };
            }
            return { authorized: true };
        },
    );

    context.ctx.flow.extend(
        "deprovision-user",
        "persist-state",
        { id: "auth-gateway:apply-deprovision" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                username?: string;
                action?: "delete" | "disable" | "archive";
            };
            const authorizeResult = (
                (stageCtx.stageResults["authorize-request"] ?? []) as Array<{
                    authorized: boolean;
                    reason?: string;
                }>
            )[0];
            if (!authorizeResult?.authorized) {
                return {
                    persisted: false,
                    reason: authorizeResult?.reason ?? "authorization_failed",
                };
            }
            const username = String(input.username ?? "");
            if (input.action === "delete") {
                await context.accountStore.delete(username);
            } else if (input.action === "disable") {
                await context.accountStore.setEnabled?.(username, false);
            }
            return { persisted: true, username, action: input.action };
        },
    );

    context.ctx.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "auth-gateway:revoke-tokens" },
        (stageCtx) => {
            const persistResult = (
                (stageCtx.stageResults["persist-state"] ?? []) as Array<{
                    persisted: boolean;
                    username?: string;
                }>
            )[0];
            if (!persistResult?.persisted || !persistResult.username) {
                return { cleaned: false };
            }
            const revokeTokens = context.ctx.capabilities.get<
                (subject: string) => number
            >("auth:revokeAccessTokensForSubject");
            const revokedCount = revokeTokens?.(persistResult.username) ?? 0;
            return { cleaned: true, revokedTokenCount: revokedCount };
        },
    );

    const enabledLdapAdapter = context.authGateway.getEnabledAdapter("ldap");
    const ldapAdapter =
        enabledLdapAdapter ?? context.authGateway.getAdapter("ldap");
    if (typeof ldapAdapter?.registerFlowHooks === "function") {
        ldapAdapter.registerFlowHooks(context.ctx.flow, {
            enabled: enabledLdapAdapter !== null,
        });
    }
}
