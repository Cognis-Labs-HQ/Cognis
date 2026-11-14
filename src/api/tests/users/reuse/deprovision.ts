import {
    requireBootstrapScope,
    runBootstrapScope,
    type BootstrapDisposer,
    type CapabilityContracts,
    type CapabilityStore,
    type Ctx,
    type LocalAccountStore,
} from "@cognis/core";
import {
    isAccountTargetDenial,
    type AuthorizeAccountTarget,
} from "../../../routes/users/account-target.js";
import type {
    DeprovisionOutcome,
    DeprovisionOutcomeReader,
} from "../../../routes/users/deprovision-outcome.js";

type Input = {
    username?: string;
    action?: "delete" | "disable" | "archive";
    callerRole?: string;
    targetRole?: string;
    targetIsFounder?: boolean;
    isAuthorizationCurrent?: () => boolean;
    actor?: Parameters<AuthorizeAccountTarget>[0]["actor"];
};

type Operation = {
    input: object;
    request: Readonly<Input>;
    revision: number;
    authorized: boolean;
    reason?: string;
    outcome?: DeprovisionOutcome;
};

const unavailable = (): DeprovisionOutcome =>
    Object.freeze({
        persisted: false,
        status: 503,
        reason: "account_policy_unavailable",
    });

/** Public-contract fake with real staged effects and owner-private, invocation-bound receipts. */
export async function registerDeprovisionFixture(
    root: Ctx,
    capabilities: CapabilityStore,
    accounts: LocalAccountStore,
): Promise<BootstrapDisposer[]> {
    const operations = new WeakMap<object, Operation>();
    const latest = new WeakMap<object, object>();
    const disposers: BootstrapDisposer[] = [];
    let active = true;
    let revision = 0;
    const read = (
        input: unknown,
        results: object,
    ): DeprovisionOutcome | undefined => {
        const operation = operations.get(results);
        if (
            !active ||
            !operation ||
            operation.input !== input ||
            operation.revision !== revision ||
            latest.get(operation.input) !== results
        )
            return undefined;
        return operation.outcome;
    };
    const reader: DeprovisionOutcomeReader = Object.freeze({
        read,
        deletedAccount(input: unknown, results: object) {
            const result = read(input, results);
            return result?.persisted && result.action === "delete"
                ? result.username
                : undefined;
        },
    });
    root.contributePublicCapability("auth:deprovisionOutcome", reader);
    await runBootstrapScope(
        root,
        "gateway:auth",
        async () => {
            root.requireCapability<CapabilityContracts>(
                "system:contracts",
            ).define("auth:deprovisionOutcome", {
                version: 1,
                kind: "object",
                description: "Test owner-bound account lifecycle receipts.",
                members: { read: "function", deletedAccount: "function" },
            });
            const dispose = () => {
                active = false;
                revision += 1;
            };
            dispose.reactivate = () => {
                active = true;
                revision += 1;
            };
            requireBootstrapScope(root).registerDisposer(dispose);
        },
        (dispose) => disposers.push(dispose),
    );

    root.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:authorize-deprovision" },
        (stage) => {
            const input = stage.input as Input;
            const request = Object.freeze({
                ...input,
                actor: input.actor
                    ? Object.freeze({ ...input.actor })
                    : undefined,
            });
            const reason = request.targetIsFounder
                ? "protected_founder_account"
                : request.callerRole === "admin" &&
                    ["admin", "owner"].includes(request.targetRole ?? "")
                  ? "protected_admin_account"
                  : undefined;
            operations.set(stage.stageResults, {
                input,
                request,
                revision,
                authorized: !reason,
                reason,
            });
            latest.set(input, stage.stageResults);
            return Object.freeze({
                authorized: !reason,
                ...(reason ? { reason } : {}),
            });
        },
    );

    root.flow.extend(
        "deprovision-user",
        "persist-state",
        { id: "test:apply-deprovision" },
        async (stage) => {
            const operation = operations.get(stage.stageResults);
            if (!operation) return unavailable();
            const record = (outcome: DeprovisionOutcome) => {
                operation.outcome = Object.freeze({ ...outcome });
                return operation.outcome;
            };
            if (
                !active ||
                operation.revision !== revision ||
                latest.get(operation.input) !== stage.stageResults ||
                operation.input !== stage.input
            )
                return record(unavailable());
            if (root.getCapability("auth:deprovisionOutcome") !== reader)
                return record(unavailable());
            if (!operation.authorized)
                return record({
                    persisted: false,
                    status: 403,
                    reason: operation.reason!,
                });
            const input = operation.request;
            if (input.isAuthorizationCurrent !== undefined) {
                try {
                    if (!input.actor || input.isAuthorizationCurrent() !== true)
                        return record(unavailable());
                    const authorize = root
                        .requireCapability<CapabilityContracts>(
                            "system:contracts",
                        )
                        .resolve<AuthorizeAccountTarget>(
                            "auth:authorizeAccountTarget",
                            1,
                        );
                    const decision = await authorize(
                        Object.freeze({
                            actor: input.actor,
                            accountId: String(input.username ?? ""),
                            allowSelf: false,
                            allowFounder: false,
                        }),
                    );
                    if (input.isAuthorizationCurrent() !== true)
                        return record(unavailable());
                    if (isAccountTargetDenial(decision))
                        return record({
                            persisted: false,
                            status: decision.status,
                            reason: decision.code,
                        });
                    if (
                        decision?.allowed !== true ||
                        decision.accountId !== input.username ||
                        decision.isCurrent() !== true ||
                        input.isAuthorizationCurrent() !== true
                    )
                        return record(unavailable());
                } catch {
                    return record(unavailable());
                }
            }
            const username = String(input.username ?? "");
            if (input.action === "archive") {
                const revoke = capabilities.get<(subject: string) => number>(
                    "auth:revokeAccessTokensForSubject",
                );
                if (typeof revoke !== "function") return record(unavailable());
                return record({
                    persisted: true,
                    username,
                    action: "archive",
                    revokedTokenCount: revoke(username),
                });
            }
            if (input.action === "delete") await accounts.delete(username);
            else if (input.action === "disable")
                await accounts.setEnabled(username, false);
            else
                return record({
                    persisted: false,
                    status: 400,
                    reason: "bad_request",
                });
            return record({ persisted: true, username, action: input.action });
        },
    );

    root.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:revoke-tokens" },
        (stage) => {
            const result = read(stage.input, stage.stageResults);
            if (!result?.persisted)
                return { cleaned: false, revokedTokenCount: 0 };
            if (result.action === "archive")
                return {
                    cleaned: true,
                    revokedTokenCount: result.revokedTokenCount ?? 0,
                };
            const revoke = capabilities.get<(subject: string) => number>(
                "auth:revokeAccessTokensForSubject",
            );
            const count = revoke?.(result.username) ?? 0;
            operations.get(stage.stageResults)!.outcome = Object.freeze({
                ...result,
                revokedTokenCount: count,
            });
            return { cleaned: true, revokedTokenCount: count };
        },
    );
    return disposers;
}
