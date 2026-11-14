import {
    requireBootstrapScope,
    registerBootstrapEntry,
    registerBootstrapFlow,
    type BootstrapRegistrationState,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";
import { extractBearerToken } from "../../../api/reuse/access-token-http.js";
import {
    issueAccessToken,
    captureOnboardingIssuance,
    verifyAccessToken,
    lookupAccessToken,
    revokeOnboardingAccessToken,
    revokeOnboardingAccessTokens,
} from "../access-tokens.js";
import {
    OnboardingError,
    publicOperationError,
    type OnboardingAuthority,
    type OnboardingOperation,
} from "../onboarding/contracts.js";
import { createSessionLifetime } from "./session-lifetime.js";
import type { AuthBootstrapHookContext } from "./index.js";

export async function registerAuthBootstrapHook({
    ctx,
    accountStore,
}: AuthBootstrapHookContext): Promise<void> {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const lifetime = createSessionLifetime(root);
    const operations = new Map<string, Readonly<OnboardingOperation>>();
    const registrations = new WeakMap<object, BootstrapRegistrationState>();
    const permitted = new WeakSet<object>();
    const preparation = registerBootstrapFlow(root, {
        id: "auth:prepareOnboarding",
        stages: ["authorizeOperation"],
    });
    preparation.extend(
        "authorizeOperation",
        { id: "auth:authorizeOnboarding" },
        ({ input }) => {
            if (!input || typeof input !== "object" || !permitted.delete(input))
                throw new OnboardingError(401, "onboarding_unauthorized");
        },
    );
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "auth:onboarding",
        {
            version: 1,
            kind: "object",
            description:
                "Bounded self-onboarding authority and lifecycle-owned operations, never login sessions.",
            members: {
                registerOperation: "function",
                issue: "function",
                listOperations: "function",
                dispatch: "function",
                complete: "function",
                revokeForAccount: "function",
            },
        },
    );
    const assertAccount = async (accountId: string) => {
        if (!(await accountStore.getInfo(accountId)))
            throw new OnboardingError(401, "onboarding_unauthorized");
    };
    const assertLifetime = (revision: number) => {
        if (!lifetime.isCurrent(revision))
            throw new OnboardingError(503, "onboarding_unavailable");
    };
    const prepare = async (action: string, operation?: string) => {
        const envelope = Object.freeze({ action, operation });
        permitted.add(envelope);
        try {
            await root.flow.run("auth:prepareOnboarding", envelope);
            if (permitted.has(envelope))
                throw new OnboardingError(503, "onboarding_unavailable");
        } finally {
            permitted.delete(envelope);
        }
    };
    const api: OnboardingAuthority = {
        registerOperation(input) {
            assertLifetime(lifetime.capture());
            const scope = requireBootstrapScope(root);
            const owner = scope.owner.replace(/^(module|gateway|adapter):/, "");
            if (
                !input ||
                typeof input.id !== "string" ||
                !/^[a-z][a-zA-Z0-9:._-]{0,149}$/.test(input.id) ||
                !input.id.startsWith(`${owner}:`) ||
                typeof input.execute !== "function" ||
                (input.available !== undefined &&
                    typeof input.available !== "function")
            )
                throw new Error("invalid_onboarding_operation");
            const operation = Object.freeze({ ...input });
            registrations.set(
                operation,
                registerBootstrapEntry(
                    root,
                    operations,
                    operation.id,
                    operation,
                    "onboarding_operation_conflict",
                ),
            );
        },
        listOperations() {
            assertLifetime(lifetime.capture());
            return [...operations.keys()].sort();
        },
        async issue(accountId) {
            const revision = lifetime.capture();
            assertLifetime(revision);
            if (
                typeof accountId !== "string" ||
                !accountId.trim() ||
                accountId !== accountId.trim()
            )
                throw new OnboardingError(401, "onboarding_unauthorized");
            const lease = captureOnboardingIssuance(accountId);
            try {
                await prepare("issue");
                await assertAccount(accountId);
                assertLifetime(revision);
                if (!lease.isCurrent())
                    throw new OnboardingError(401, "onboarding_unauthorized");
                const token = issueAccessToken(accountId, "user", 1800, {
                    purpose: "onboarding",
                });
                ctx.log?.("info", "Issued onboarding authority.", {
                    component: "auth",
                    operation: "issueOnboarding",
                    accountId,
                });
                return token;
            } finally {
                lease.release();
            }
        },
        async dispatch(request, operationId, input) {
            const revision = lifetime.capture();
            assertLifetime(revision);
            const token = extractBearerToken(request);
            const claims = token
                ? verifyAccessToken(token, { purpose: "onboarding" })
                : null;
            if (!token || !claims)
                throw new OnboardingError(401, "onboarding_unauthorized");
            const operation = operations.get(operationId);
            const registration = operation && registrations.get(operation);
            if (!operation || !registration)
                throw new OnboardingError(
                    503,
                    "onboarding_operation_unavailable",
                );
            const operationRevision = registration.revision;
            let active = true;
            const assertCurrent = async () => {
                assertLifetime(revision);
                if (
                    !active ||
                    !verifyAccessToken(token, { purpose: "onboarding" })
                )
                    throw new OnboardingError(401, "onboarding_unauthorized");
                if (
                    !registration.active ||
                    registration.revision !== operationRevision ||
                    operations.get(operationId) !== operation
                )
                    throw new OnboardingError(
                        503,
                        "onboarding_operation_unavailable",
                    );
                const readiness = operation.available?.() ?? true;
                const available =
                    typeof readiness === "boolean"
                        ? readiness
                        : await readiness;
                if (available !== true)
                    throw new OnboardingError(
                        503,
                        "onboarding_operation_unavailable",
                    );
                await assertAccount(claims.sub);
                const finalReadiness = operation.available?.() ?? true;
                const stillAvailable =
                    typeof finalReadiness === "boolean"
                        ? finalReadiness
                        : await finalReadiness;
                assertLifetime(revision);
                if (
                    !active ||
                    !verifyAccessToken(token, { purpose: "onboarding" })
                )
                    throw new OnboardingError(401, "onboarding_unauthorized");
                if (
                    stillAvailable !== true ||
                    !registration.active ||
                    registration.revision !== operationRevision ||
                    operations.get(operationId) !== operation
                )
                    throw new OnboardingError(
                        503,
                        "onboarding_operation_unavailable",
                    );
            };
            try {
                await assertCurrent();
                await prepare("dispatch", operationId);
                await assertCurrent();
                let result: unknown;
                try {
                    const { execute: executeOperation } = operation;
                    result = await executeOperation(
                        Object.freeze({ accountId: claims.sub, assertCurrent }),
                        input,
                    );
                } catch (error) {
                    throw publicOperationError(error) ?? error;
                }
                await assertCurrent();
                ctx.log?.("info", "Completed onboarding operation.", {
                    component: "auth",
                    operation: operationId,
                    accountId: claims.sub,
                });
                return result;
            } catch (error) {
                ctx.log?.("error", "Onboarding operation failed.", {
                    component: "auth",
                    operation: operationId,
                    errorName:
                        error instanceof Error ? error.name : "ProviderError",
                });
                if (error instanceof OnboardingError) throw error;
                throw new OnboardingError(503, "onboarding_operation_failed");
            } finally {
                active = false;
            }
        },
        async complete(request) {
            const revision = lifetime.capture();
            assertLifetime(revision);
            const token = extractBearerToken(request);
            const claims = token ? lookupAccessToken(token) : null;
            if (!token || claims?.purpose !== "onboarding")
                throw new OnboardingError(401, "onboarding_unauthorized");
            await prepare("complete");
            assertLifetime(revision);
            if (!revokeOnboardingAccessToken(token))
                throw new OnboardingError(401, "onboarding_unauthorized");
            ctx.log?.("info", "Revoked onboarding authority.", {
                component: "auth",
                operation: "completeOnboarding",
                accountId: claims.sub,
            });
        },
        revokeForAccount(accountId) {
            assertLifetime(lifetime.capture());
            const count = revokeOnboardingAccessTokens(accountId);
            ctx.log?.("info", "Revoked account onboarding authority.", {
                component: "auth",
                operation: "revokeOnboarding",
                accountId,
                count,
            });
            return count;
        },
    };
    ctx.capabilities.contribute("auth:onboarding", api);
    root.contributePublicCapability("auth:onboarding", api);
}
