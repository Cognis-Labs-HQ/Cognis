import {
    AUTH_FLOW_CATALOG,
    BOOTSTRAP_FLOW_CATALOG,
    CTX_CAPABILITY,
    USER_LIFECYCLE_FLOW_CATALOG,
    registerCanonicalFlow,
} from "@cognis/core";
import type { Ctx } from "@cognis/core";
import { issueAccessToken, type AccessRole } from "../access-tokens.js";
import {
    LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY,
    resolveLoginSessionTimeoutPreference,
} from "../session-timeout.js";
import { resolveRole } from "./local-account.js";
import type { AuthBootstrapHookContext } from "./index.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9]{2,}$/;
const ACCOUNT_NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function getEnabledLoginMethods(context: AuthBootstrapHookContext): Array<{
    id: string;
    name: string;
    forgotPassword: boolean;
    credential: boolean;
    adapterId: string;
}> {
    return context.authGateway.getEnabledAdapters().flatMap((adapter) => {
        const methods = adapter.getLoginMethods?.() ?? [
            { id: adapter.id, name: adapter.name },
        ];
        return methods.map((method) => ({
            ...method,
            credential:
                method.credential === true ||
                adapter.id === "local" ||
                adapter.id === "ldap",
            adapterId: adapter.id,
            forgotPassword:
                adapter.getLoginUiCapabilities?.().forgotPassword === true,
        }));
    });
}

function getPublicLoginMethods(context: AuthBootstrapHookContext) {
    return getEnabledLoginMethods(context).map(
        ({ adapterId: _adapterId, credential, ...method }) => ({
            ...method,
            ...(credential && method.id !== "local"
                ? { credential: true }
                : {}),
        }),
    );
}

function applyAccountCreationCredentials(
    session: {
        accountId: string;
        provider: string;
        email?: string;
        registrationToken?: string;
        [key: string]: unknown;
    },
    credentials: Record<string, unknown>,
) {
    const registrationToken = String(
        credentials.registrationToken ?? "",
    ).trim();
    const submittedEmail = String(credentials.email ?? "").trim();
    const existingEmail = resolveSessionEmail(session);
    return {
        ...session,
        ...(existingEmail || !submittedEmail ? {} : { email: submittedEmail }),
        ...(registrationToken ? { registrationToken } : {}),
    };
}

function resolveSessionEmail(session: {
    email?: unknown;
    emails?: unknown;
}): string | undefined {
    const directEmail = String(session.email ?? "").trim();
    if (EMAIL_PATTERN.test(directEmail)) return directEmail;
    if (!Array.isArray(session.emails)) return undefined;
    return session.emails
        .map((email) => String(email).trim())
        .find((email) => EMAIL_PATTERN.test(email));
}

function resolveSessionHandle(
    session: Record<string, unknown>,
): string | undefined {
    for (const candidate of [session.handle, session.username]) {
        const handle = String(candidate ?? "")
            .trim()
            .replace(/^@/, "");
        if (handle) return handle;
    }
    return undefined;
}

function resolveExternalAccountKey(
    session: Record<string, unknown>,
    adapterId: string,
): string {
    const requestedNamespace = String(
        session.accountNamespace ?? session.provider ?? adapterId,
    )
        .trim()
        .toLowerCase();
    const providerNamespace = ACCOUNT_NAMESPACE_PATTERN.test(requestedNamespace)
        ? requestedNamespace
        : adapterId.trim().toLowerCase();
    const proposedAccountId = String(session.accountId ?? "").trim();
    const handle = resolveSessionHandle(session);
    const normalizedCandidate = (handle ?? proposedAccountId).toLowerCase();
    const providerPrefix = `${providerNamespace}:`;
    const candidate = normalizedCandidate.startsWith(providerPrefix)
        ? normalizedCandidate.slice(providerPrefix.length)
        : normalizedCandidate;
    return `${providerNamespace}:${candidate}`;
}

function resolveExternalProfileHandle(
    session: Record<string, unknown>,
    adapterId: string,
): string {
    return resolveExternalAccountKey(session, adapterId);
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

    if (!context.ctx.flow.exists("reconcile-auth-sources")) {
        systemCtx.registerFlow({
            id: "reconcile-auth-sources",
            description:
                "Reconciles sessions and account identities after an authentication source changes.",
            stages: ["reconcile-accounts"],
        });
    }

    context.ctx.flow.extend(
        "reconcile-auth-sources",
        "reconcile-accounts",
        { id: "auth-gateway:adapter-source-reconciler" },
        async (stageCtx) => {
            const input = stageCtx.input as { adapterId?: string };
            const adapterId = String(input.adapterId ?? "");
            const reconcile = context.ctx.capabilities.get<
                (request: Record<string, unknown>) => Promise<unknown>
            >(`auth:source-reconciler:${adapterId}`);
            return reconcile
                ? reconcile(stageCtx.input)
                : { reconciled: false };
        },
    );

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
                enabledMethods: getPublicLoginMethods(context),
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
                authenticatedSession?: {
                    accountId: string;
                    provider: string;
                    externalUserId?: string;
                    email?: string;
                    emails?: string[];
                    displayName?: string;
                    handle?: string;
                    username?: string;
                    accountNamespace?: string;
                    role?: string;
                };
            };
            const resolveResult = (
                (stageCtx.stageResults["resolve-provider"] ?? []) as Array<{
                    defaultProviderId: string | null;
                }>
            )[0];
            const providerId =
                input.provider ?? resolveResult?.defaultProviderId ?? "local";
            const method = getEnabledLoginMethods(context).find(
                (entry) => entry.id === providerId,
            );
            const adapter =
                context.authGateway.getEnabledAdapter(
                    method?.adapterId ?? providerId,
                ) ?? context.authGateway.getEnabledAdapter("local");
            if (!adapter) {
                return { success: false, reason: "provider_unavailable" };
            }
            const credentials: Record<string, unknown> = {
                ...(input.credentials ?? {}),
                authSourceId: method?.id,
            };
            const authenticatedSession =
                input.authenticatedSession ??
                (await adapter.authenticate(credentials));
            const session = authenticatedSession
                ? applyAccountCreationCredentials(
                      authenticatedSession,
                      credentials,
                  )
                : null;
            if (!session) {
                return { success: false, reason: "invalid_credentials" };
            }
            const externalUserId =
                "externalUserId" in session
                    ? String(session.externalUserId)
                    : session.accountId;
            const canonicalAccountId =
                adapter.id === "local"
                    ? session.accountId.trim().toLowerCase()
                    : ((await context.accountStore.resolveExternalAccountId?.(
                          adapter.id,
                          externalUserId,
                      )) ??
                      resolveExternalAccountKey(
                          session as Record<string, unknown>,
                          adapter.id,
                      ));
            session.accountId = canonicalAccountId;
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
            const sessionEmail = resolveSessionEmail(session);

            if (
                adapterId !== "local" &&
                context.accountStore.ensureExternalAccount
            ) {
                const existingAccount = await context.accountStore.getInfo(
                    session.accountId,
                );
                const creatingExternalAccount = !existingAccount;
                if (!existingAccount) {
                    if (!context.ctx.flow.exists("gateAccountCreation")) {
                        return {
                            sessionResult: {
                                outcome: "account_creation_required",
                                emailRequired: !sessionEmail,
                                pendingAccountCreation: {
                                    providerId: adapterId ?? session.provider,
                                    session,
                                },
                            },
                        };
                    }
                    const gateResult = await context.ctx.flow.run(
                        "gateAccountCreation",
                        {
                            accountId: session.accountId,
                            providerId: adapterId ?? session.provider,
                            email: sessionEmail,
                            registrationToken:
                                "registrationToken" in session
                                    ? String(session.registrationToken ?? "") ||
                                      undefined
                                    : undefined,
                        },
                    );
                    const authorizationResults =
                        gateResult.stageResults["authorizeCreation"] ?? [];
                    const authorization = authorizationResults.find(
                        (result) =>
                            (result as { authorized?: unknown }).authorized ===
                            true,
                    ) as
                        | {
                              authorized: true;
                              commit?: () => Promise<boolean>;
                          }
                        | undefined;
                    if (!authorization) {
                        const denial = authorizationResults.find(
                            (result) =>
                                (result as { authorized?: unknown })
                                    .authorized === false,
                        ) as { reason?: unknown } | undefined;
                        return {
                            sessionResult: {
                                outcome: "account_creation_required",
                                authorizationFailureReason:
                                    typeof denial?.reason === "string"
                                        ? denial.reason
                                        : undefined,
                                emailRequired: !sessionEmail,
                                pendingAccountCreation: {
                                    providerId: adapterId ?? session.provider,
                                    session,
                                },
                            },
                        };
                    }
                    stageCtx.data["accountCreationAuthorization"] =
                        authorization;
                }
                session.accountId =
                    await context.accountStore.ensureExternalAccount({
                        accountId: session.accountId,
                        accountNamespace:
                            "accountNamespace" in session
                                ? String(session.accountNamespace)
                                : session.provider,
                        provider: adapterId ?? session.provider,
                        externalUserId:
                            "externalUserId" in session
                                ? String(session.externalUserId)
                                : session.accountId,
                        email: sessionEmail,
                        displayName:
                            "displayName" in session
                                ? String(session.displayName ?? "") || undefined
                                : undefined,
                        role: session.role,
                    });
                if (creatingExternalAccount) {
                    stageCtx.data["newExternalAccountProfileRequest"] = {
                        providerId: adapterId ?? session.provider,
                        accountId: session.accountId,
                        externalUserId:
                            "externalUserId" in session
                                ? String(session.externalUserId)
                                : session.accountId,
                        session: session as Record<string, unknown>,
                    };
                }
                const authorization = stageCtx.data[
                    "accountCreationAuthorization"
                ] as { commit?: () => Promise<boolean> } | undefined;
                if (authorization?.commit) {
                    let committed = false;
                    try {
                        committed = await authorization.commit();
                    } catch (error) {
                        context.ctx.log?.(
                            "warn",
                            "External account authorization could not be committed.",
                            {
                                component: "auth-gateway",
                                accountId: session.accountId,
                                providerId: adapterId ?? session.provider,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                        committed = false;
                    }
                    if (!committed) {
                        await context.accountStore.delete(session.accountId);
                        return {
                            sessionResult: {
                                outcome: "account_creation_required",
                                emailRequired: false,
                                pendingAccountCreation: {
                                    providerId: adapterId ?? session.provider,
                                    session,
                                },
                            },
                        };
                    }
                }
            }

            const account = await context.accountStore.getInfo(
                session.accountId,
            );
            if (account && !account.enabled) {
                return {
                    sessionResult: { outcome: "invalid_credentials" },
                };
            }

            let role: AccessRole = resolveRole(session.role);
            const getProfileRole =
                capabilities.get<
                    (accountId: string) => Promise<string | undefined>
                >("profile:getRole");
            const profileLifecycle = capabilities.get<{
                getState(
                    accountId: string,
                ): Promise<"active" | "deactivated" | "archived">;
                setState(
                    accountId: string,
                    lifecycleState: "active" | "deactivated" | "archived",
                ): Promise<unknown>;
            }>("social:profileLifecycle");
            const profileRole = getProfileRole
                ? await getProfileRole(session.accountId).catch(() => undefined)
                : undefined;
            const lifecycleState = await profileLifecycle
                ?.getState(session.accountId)
                .catch(() => "active");
            if (lifecycleState === "archived") {
                return {
                    sessionResult: { outcome: "account_archived" },
                };
            }
            if (lifecycleState === "deactivated") {
                await profileLifecycle
                    ?.setState(session.accountId, "active")
                    .catch(() => undefined);
            }
            if (profileRole === "owner") {
                role = "owner";
            }

            const isFounder = await context.accountStore
                .isFounder(session.accountId)
                .catch(() => false);
            if (isFounder && (role === "admin" || role === "owner")) {
                role = "owner";
            }

            const globalTtlSeconds =
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
            const sessionHandle = resolveSessionHandle(
                session as Record<string, unknown>,
            );
            const profileHandle =
                adapterId === "local"
                    ? (sessionHandle ?? session.accountId)
                    : resolveExternalProfileHandle(
                          session as Record<string, unknown>,
                          adapterId ?? session.provider,
                      );
            await createProfile?.(
                session.accountId,
                profileHandle,
                role,
                displayName,
            );
            const applyExternalProfile = capabilities.get<
                (
                    accountId: string,
                    profile: Record<string, unknown>,
                ) => Promise<void>
            >("profile:applyExternalProfile");
            if (profileHandle && applyExternalProfile) {
                await applyExternalProfile(session.accountId, {
                    handle: profileHandle,
                }).catch((error) =>
                    context.ctx.log?.(
                        "warn",
                        "External account handle could not be synchronized.",
                        {
                            component: "auth-gateway",
                            accountId: session.accountId,
                            providerId: adapterId ?? session.provider,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    ),
                );
            }
            const externalProfileRequest = stageCtx.data[
                "newExternalAccountProfileRequest"
            ] as
                | {
                      providerId: string;
                      accountId: string;
                      externalUserId: string;
                      session: Record<string, unknown>;
                  }
                | undefined;
            if (externalProfileRequest) {
                const resolveExternalProfile = capabilities.get<
                    (
                        request: typeof externalProfileRequest,
                    ) => Promise<Record<string, unknown> | null>
                >("auth:resolveExternalProfile");
                if (resolveExternalProfile && applyExternalProfile) {
                    try {
                        const externalProfile = await resolveExternalProfile(
                            externalProfileRequest,
                        );
                        if (externalProfile) {
                            const externalProfileHandle =
                                typeof externalProfile.handle === "string"
                                    ? resolveExternalProfileHandle(
                                          {
                                              ...session,
                                              handle: externalProfile.handle,
                                          },
                                          externalProfileRequest.providerId,
                                      )
                                    : profileHandle;
                            await applyExternalProfile(session.accountId, {
                                ...externalProfile,
                                handle: externalProfileHandle,
                            });
                        }
                    } catch (error) {
                        context.ctx.log?.(
                            "warn",
                            "External account profile could not be synchronized.",
                            {
                                component: "auth-gateway",
                                accountId: session.accountId,
                                providerId: externalProfileRequest.providerId,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    }
                }
            }
            await capabilities.get<(username: string) => Promise<void>>(
                "files:quota:provisionUser",
            )?.(session.accountId);

            const securitySettings = await context
                .readSecuritySettings()
                .catch(() => ({
                    registrationsEnabled: false,
                    userValidationMode: "none" as const,
                    loginSessionTimeoutMinutes: globalTtlSeconds / 60,
                }));
            const preferenceStore =
                capabilities.get<
                    import("../../../api/reuse/preference-store.js").UserPreferenceStore
                >("preferences:store");
            const storedTimeout = await preferenceStore
                ?.get(session.accountId, LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY)
                .catch(() => null);
            const { timeoutMinutes, shouldPersist } =
                resolveLoginSessionTimeoutPreference(
                    storedTimeout,
                    securitySettings.loginSessionTimeoutMinutes,
                );
            if (shouldPersist && typeof preferenceStore?.set === "function") {
                await preferenceStore
                    .set(
                        session.accountId,
                        LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY,
                        String(timeoutMinutes),
                    )
                    .catch(() => undefined);
            }
            const ttlSeconds =
                timeoutMinutes === 0 ? null : timeoutMinutes * 60;
            const listedEmails =
                "emails" in session && Array.isArray(session.emails)
                    ? session.emails.map(String)
                    : "email" in session && session.email
                      ? [String(session.email)]
                      : [];
            if (adapterId !== "local" && listedEmails.length > 0) {
                await capabilities.get<
                    (
                        accountId: string,
                        emails: string[],
                        options?: { sendPrimaryVerification?: boolean },
                    ) => Promise<void>
                >("notify:provisionUserEmails")?.(
                    session.accountId,
                    listedEmails,
                    {
                        sendPrimaryVerification:
                            securitySettings.userValidationMode === "smtp",
                    },
                );
            }
            const sharedPayload = {
                accountId: session.accountId,
                displayName: displayName ?? session.accountId,
                provider: session.provider,
                providerId: session.provider ?? adapterId,
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
                    providerId: session.provider ?? adapterId,
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
            methods: getPublicLoginMethods(context),
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
            const sectionAugmentations = (stageCtx.stageResults[
                "augment-sections"
            ] ?? []) as Array<Record<string, unknown>>;
            const uiRegistry = stageCtx.meta["uiRegistry"] as
                { listSettingsSections?: () => unknown[] } | undefined;
            const registrySections = uiRegistry?.listSettingsSections?.() ?? [];
            const uniqueSectionsById = new Map<
                string,
                Record<string, unknown>
            >();
            for (const section of [
                ...flowSections,
                ...sectionAugmentations,
                ...registrySections,
            ]) {
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
