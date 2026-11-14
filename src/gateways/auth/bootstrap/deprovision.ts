import {
    requireBootstrapScope,
    type AccessRole,
    type CapabilityContracts,
    type Ctx,
    type FlowStageContext,
} from "@cognis/core";
import type { AuthBootstrapHookContext } from "./index.js";
import type {
    DeprovisionOutcome,
    DeprovisionOutcomes,
} from "../contracts/deprovision-outcome.js";
import type { AuthorizeAccountTarget } from "../contracts/account-target.js";

interface Request {
    username: string;
    action: unknown;
    callerRole: unknown;
    targetRole: unknown;
    targetIsFounder: unknown;
    actor?: { sub: string; role: AccessRole };
    guarded: boolean;
    isAuthorizationCurrent: unknown;
}

interface Operation {
    input: unknown;
    outcome?: Readonly<DeprovisionOutcome>;
    request: Readonly<Request>;
    revision: number;
    authorized: boolean;
    reason?: string;
    started: boolean;
    persisted: boolean;
    revokedTokenCount?: number;
}

const POLICY_DENIALS = new Set([
    "400:bad_request",
    "403:forbidden",
    "403:protected_self_account",
    "403:protected_admin_account",
    "403:protected_founder_account",
    "404:not_found",
    "503:account_policy_unavailable",
]);

export function registerDeprovisionFlow(
    context: Pick<AuthBootstrapHookContext, "ctx" | "accountStore">,
): void {
    const { ctx, accountStore } = context;
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const log = ctx.log;
    const operations = new WeakMap<object, Operation>();
    const latestInvocations = new WeakMap<object, object>();
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    const outcomeId = "auth:deprovisionOutcome";
    let active = true;
    let revision = 0;
    const dispose = () => {
        active = false;
        revision++;
    };
    dispose.reactivate = () => {
        active = true;
        revision++;
    };
    requireBootstrapScope(root).registerDisposer(dispose);
    const ownerIsCurrent = () =>
        active &&
        ctx.capabilities.get("system:ctx") === root &&
        ctx.gatewayRegistry.get("auth")?.status !== "disabled" &&
        root.getCapability("system:contracts") === contracts &&
        contracts.describe(outcomeId) === declaration &&
        root.isPublicCapability(outcomeId) &&
        root.getCapability(outcomeId) === outcomes &&
        ctx.capabilities.get(outcomeId) === outcomes;
    const current = (operation: Operation) =>
        ownerIsCurrent() &&
        operation.revision === revision &&
        (!operation.request.guarded ||
            ctx.capabilities.get("auth:accountStore") === accountStore);
    const unavailable = (error?: unknown): DeprovisionOutcome => {
        log?.("error", "Account lifecycle authorization unavailable.", {
            component: "auth-gateway",
            operation: "deprovisionUser",
            errorName:
                error instanceof Error
                    ? error.name
                    : "AuthorizationUnavailable",
        });
        return {
            persisted: false,
            reason: "account_policy_unavailable",
            status: 503,
        };
    };
    const acceptsEnvelope = (stage: FlowStageContext): boolean => {
        if (Object.isFrozen(stage)) return true;
        // An unsupported runner cannot reuse receipts issued by an earlier supported invocation.
        revision += 1;
        unavailable();
        return false;
    };
    const guardCurrent = (operation: Operation): boolean =>
        current(operation) &&
        (!operation.request.guarded ||
            (typeof operation.request.isAuthorizationCurrent === "function" &&
                operation.request.isAuthorizationCurrent() === true));

    contracts.define(outcomeId, {
        version: 1,
        kind: "object",
        members: { read: "function", deletedAccount: "function" },
        description:
            "Read an immutable Auth-owned outcome bound to the original deprovision input and invocation identity.",
    });
    const read: DeprovisionOutcomes["read"] = (input, stageResults) => {
        if (
            !input ||
            typeof input !== "object" ||
            !stageResults ||
            typeof stageResults !== "object"
        )
            return undefined;
        const operation = operations.get(stageResults);
        if (
            !ownerIsCurrent() ||
            !operation ||
            operation.revision !== revision ||
            operation.input !== input ||
            latestInvocations.get(input) !== stageResults
        )
            return undefined;
        return operation.outcome;
    };
    const outcomes: DeprovisionOutcomes = Object.freeze({
        read,
        deletedAccount(input: unknown, stageResults: object) {
            const outcome = read(input, stageResults);
            return outcome?.persisted === true && outcome.action === "delete"
                ? outcome.username
                : undefined;
        },
    });
    const publish = () => {
        if (
            (ctx.capabilities.has(outcomeId) &&
                ctx.capabilities.get(outcomeId) !== outcomes) ||
            (root.hasCapability(outcomeId) &&
                root.getCapability(outcomeId) !== outcomes)
        )
            throw new Error("deprovision_outcome_conflict");
        ctx.capabilities.contribute(outcomeId, outcomes);
        root.contributePublicCapability(outcomeId, outcomes);
    };
    publish();
    const unpublish = () => {
        if (ctx.capabilities.get(outcomeId) === outcomes)
            ctx.capabilities.remove(outcomeId);
        if (root.getCapability(outcomeId) === outcomes)
            root.removeCapability(outcomeId);
    };
    unpublish.reactivate = publish;
    requireBootstrapScope(root).registerDisposer(unpublish);
    const declaration = contracts.describe(outcomeId);

    ctx.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "auth-gateway:authorize-deprovision" },
        (stage) => {
            if (!acceptsEnvelope(stage))
                return {
                    authorized: false,
                    reason: "account_policy_unavailable",
                };
            const input = (stage.input ?? {}) as Record<string, unknown>;
            const actor = input.actor as Request["actor"];
            const request: Readonly<Request> = Object.freeze({
                username: String(input.username ?? ""),
                action: input.action,
                callerRole: input.callerRole,
                targetRole: input.targetRole,
                targetIsFounder: input.targetIsFounder,
                actor: actor
                    ? Object.freeze({ sub: actor.sub, role: actor.role })
                    : undefined,
                guarded: "isAuthorizationCurrent" in input,
                isAuthorizationCurrent: input.isAuthorizationCurrent,
            });
            const reason = request.targetIsFounder
                ? "protected_founder_account"
                : request.callerRole === "admin" &&
                    ["admin", "owner"].includes(String(request.targetRole))
                  ? "protected_admin_account"
                  : undefined;
            if (stage.input && typeof stage.input === "object")
                latestInvocations.set(stage.input, stage.stageResults);
            operations.set(stage.stageResults, {
                input: stage.input,
                request,
                revision,
                authorized: !reason,
                reason,
                started: false,
                persisted: false,
            });
            return Object.freeze({
                authorized: !reason,
                ...(reason ? { reason } : {}),
            });
        },
    );

    const persist = async (
        operation: Operation,
    ): Promise<DeprovisionOutcome> => {
        if (!operation.authorized)
            return {
                persisted: false,
                reason: operation.reason ?? "forbidden",
                status: 403,
            };
        const { request } = operation;
        if (
            !request.username ||
            !["delete", "disable", "archive"].includes(String(request.action))
        )
            return { persisted: false, reason: "bad_request", status: 400 };
        try {
            if (!guardCurrent(operation)) return unavailable();
            if (request.guarded) {
                const contracts =
                    root.requireCapability<CapabilityContracts>(
                        "system:contracts",
                    );
                const decision =
                    await contracts.resolve<AuthorizeAccountTarget>(
                        "auth:authorizeAccountTarget",
                        1,
                    )({
                        actor: request.actor!,
                        accountId: request.username,
                        allowSelf: false,
                        allowFounder: false,
                    });
                if (!guardCurrent(operation)) return unavailable();
                if (
                    decision?.allowed === false &&
                    typeof decision.status === "number" &&
                    typeof decision.code === "string" &&
                    POLICY_DENIALS.has(`${decision.status}:${decision.code}`)
                )
                    return {
                        persisted: false,
                        reason: decision.code,
                        status: decision.status,
                    };
                if (
                    decision?.allowed !== true ||
                    decision.accountId !== request.username ||
                    typeof decision.isCurrent !== "function" ||
                    decision.isCurrent() !== true
                )
                    return unavailable();
            }
            if (!guardCurrent(operation)) return unavailable();
        } catch (error) {
            return unavailable(error);
        }
        if (request.action === "delete")
            await accountStore.delete(request.username);
        else if (request.action === "disable")
            await accountStore.setEnabled?.(request.username, false);
        else if (request.action === "archive") {
            const revokeTokens = ctx.capabilities.get<
                (subject: string) => number
            >("auth:revokeAccessTokensForSubject");
            if (typeof revokeTokens !== "function") return unavailable();
            operation.revokedTokenCount = revokeTokens(request.username);
        }
        operation.persisted = true;
        return {
            persisted: true,
            username: request.username,
            action: request.action as "delete" | "disable" | "archive",
            ...(operation.revokedTokenCount === undefined
                ? {}
                : { revokedTokenCount: operation.revokedTokenCount }),
        };
    };

    ctx.flow.extend(
        "deprovision-user",
        "persist-state",
        { id: "auth-gateway:apply-deprovision" },
        async (stage) => {
            if (!acceptsEnvelope(stage)) return unavailable();
            const operation = operations.get(stage.stageResults);
            if (!operation || operation.started) return unavailable();
            operation.started = true;
            operation.outcome = Object.freeze(await persist(operation));
            return operation.outcome;
        },
    );

    ctx.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "auth-gateway:revoke-tokens" },
        (stage) => {
            if (!acceptsEnvelope(stage)) return { cleaned: false };
            const operation = operations.get(stage.stageResults);
            if (!operation?.persisted) return { cleaned: false };
            const revokeTokens = ctx.capabilities.get<
                (subject: string) => number
            >("auth:revokeAccessTokensForSubject");
            const revokedCount =
                operation.request.action === "archive"
                    ? (operation.revokedTokenCount ?? 0)
                    : (revokeTokens?.(operation.request.username) ?? 0);
            if (operation.outcome?.persisted)
                operation.outcome = Object.freeze({
                    ...operation.outcome,
                    revokedTokenCount: revokedCount,
                });
            return { cleaned: true, revokedTokenCount: revokedCount };
        },
    );
}
