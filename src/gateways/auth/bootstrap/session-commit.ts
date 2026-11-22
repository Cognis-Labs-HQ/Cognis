import { createSessionLifetime } from "./session-lifetime.js";
import {
    registerBootstrapFlow,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";
import {
    issueAccessToken,
    revokeAccessToken,
    type AccessRole,
} from "../access-tokens.js";
import type { AuthBootstrapHookContext } from "./index.js";
import { sessionGateResult } from "./session-results.js";

export interface SessionCommitInput {
    accountId: string;
    role: AccessRole;
    ttlSeconds: number | null;
    providerId?: string;
    isAssuranceCurrent?: () => boolean;
}
export type SessionCommitResult =
    | { outcome: "success"; token: string }
    | {
          outcome:
              "account_archived" | "account_disabled" | "session_unavailable";
      };
interface ProfileLifecycle {
    getState(accountId: string): Promise<"active" | "deactivated" | "archived">;
    setState(accountId: string, state: "active"): Promise<unknown>;
}

export async function registerAuthBootstrapHook({
    ctx,
    accountStore,
}: AuthBootstrapHookContext): Promise<void> {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const lifetime = createSessionLifetime(root);
    const pending = new Map<string, Promise<unknown>>();
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "auth:completeSession",
        {
            version: 1,
            kind: "function",
            description:
                "Prepare policy gates, then terminally commit an owner-verified session.",
        },
    );
    const flow = registerBootstrapFlow(root, {
        id: "auth:prepareSession",
        stages: ["validateAccount", "validateLifecycle", "authorizeSession"],
    });
    flow.extend(
        "validateAccount",
        { id: "auth:validateSessionAccount" },
        async ({ input, data }) => {
            const session = input as SessionCommitInput;
            const info = await accountStore.getInfo(session.accountId);
            if (!info?.enabled) data.result = { outcome: "account_disabled" };
        },
    );
    flow.extend(
        "validateLifecycle",
        { id: "auth:validateSessionLifecycle" },
        async ({ input, data }) => {
            const session = input as SessionCommitInput;
            const lifecycle = ctx.capabilities.get<ProfileLifecycle>(
                "social:profileLifecycle",
            );
            if (!lifecycle) return;
            const state = await lifecycle.getState(session.accountId);
            if (state === "archived")
                data.result = { outcome: "account_archived" };
            else if (state !== "active" && state !== "deactivated")
                throw new Error("invalid_profile_lifecycle");
            data.lifecycleState = state;
        },
    );
    const complete = async (
        session: SessionCommitInput,
    ): Promise<SessionCommitResult> => {
        const expected = lifetime.capture();
        const previous = pending.get(session.accountId);
        const assertCurrent = () => {
            lifetime.assertCurrent(expected);
            if (session.isAssuranceCurrent && !session.isAssuranceCurrent())
                throw new Error("session_assurance_expired");
        };
        const operation = (async (): Promise<SessionCommitResult> => {
            let issuedToken: string | undefined;
            try {
                await previous;
                assertCurrent();
                const prepared = await root.flow.run(
                    "auth:prepareSession",
                    session,
                );
                assertCurrent();
                const gate = sessionGateResult(prepared, "result", "ready");
                if (gate && gate.outcome !== "ready") {
                    if (
                        gate.outcome === "account_disabled" ||
                        gate.outcome === "account_archived"
                    )
                        return { outcome: gate.outcome };
                    return { outcome: "session_unavailable" };
                }
                // All extensible policy stages have finished. No hook runs after this boundary.
                const lifecycle = ctx.capabilities.get<ProfileLifecycle>(
                    "social:profileLifecycle",
                );
                if (prepared.data.lifecycleState === "deactivated") {
                    if (!lifecycle)
                        throw new Error("profile_lifecycle_unavailable");
                    await lifecycle.setState(session.accountId, "active");
                }
                assertCurrent();
                await accountStore
                    .updateLastLogin(session.accountId)
                    .catch((error) => {
                        ctx.log?.("error", "Could not record login time.", {
                            component: "auth-gateway",
                            operation: "updateLastLogin",
                            errorName:
                                error instanceof Error
                                    ? error.name
                                    : "UnknownError",
                        });
                    });
                assertCurrent();
                issuedToken = issueAccessToken(
                    session.accountId,
                    session.role,
                    session.ttlSeconds,
                    { providerId: session.providerId },
                );
                assertCurrent();
                return { outcome: "success", token: issuedToken };
            } catch (error) {
                if (issuedToken) revokeAccessToken(issuedToken);
                ctx.log?.("error", "Authenticated session commit failed.", {
                    component: "auth-gateway",
                    operation: "completeSession",
                    accountId: session.accountId,
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
                return { outcome: "session_unavailable" };
            }
        })();
        pending.set(session.accountId, operation);
        try {
            return await operation;
        } finally {
            if (pending.get(session.accountId) === operation)
                pending.delete(session.accountId);
        }
    };
    ctx.capabilities.contribute("auth:completeSession", complete);
    root.contributePublicCapability("auth:completeSession", complete);
}
