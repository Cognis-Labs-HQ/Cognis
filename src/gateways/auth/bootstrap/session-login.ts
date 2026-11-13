import { createSessionLifetime } from "./session-lifetime.js";
import {
    isAccessRole,
    registerBootstrapFlow,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";
import type { AuthBootstrapHookContext } from "./index.js";
import type {
    SessionCommitInput,
    SessionCommitResult,
} from "./session-commit.js";
import { sessionGateResult } from "./session-results.js";

export async function registerAuthBootstrapHook({
    ctx,
}: AuthBootstrapHookContext): Promise<void> {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const lifetime = createSessionLifetime(root);
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "auth:login",
        {
            version: 1,
            kind: "function",
            description:
                "Prepare primary login and assurance, then terminally commit the session.",
        },
    );
    const flow = registerBootstrapFlow(root, {
        id: "auth:prepareLogin",
        stages: ["authenticate", "assessSession", "authorizeSession"],
    });
    flow.extend(
        "authenticate",
        { id: "auth:prepareLogin" },
        async ({ input, data }) => {
            lifetime.assertCurrent(data.revision);
            const prepared = await root.flow.run("login", input);
            lifetime.assertCurrent(data.revision);
            const selected = sessionGateResult(
                prepared,
                "sessionResult",
                "authenticated",
            );
            data.sessionResult =
                selected?.outcome === "success" ||
                selected?.outcome === "assured"
                    ? { outcome: "session_unavailable" }
                    : selected;
            if (!data.sessionResult)
                throw new Error("login_preparation_incomplete");
        },
    );
    flow.extend(
        "assessSession",
        { id: "auth:assessLoginSession" },
        async ({ data }) => {
            lifetime.assertCurrent(data.revision);
            const candidate = data.sessionResult as Record<string, unknown>;
            if (candidate.outcome !== "authenticated") return;
            const tfa = ctx.gatewayRegistry.get("tfa");
            if (
                tfa?.status !== "disabled" &&
                ctx.gatewayRegistry.hasBootstrapFailure("tfa")
            ) {
                data.sessionResult = { outcome: "tfa_unavailable" };
                return;
            }
            const assess =
                ctx.capabilities.get<
                    (
                        input: Record<string, unknown>,
                    ) => Promise<Record<string, unknown>>
                >("tfa:assessSession");
            if (tfa?.status === "disabled" || (!tfa && !assess)) {
                data.sessionResult = { ...candidate, outcome: "assured" };
                return;
            }
            if (!assess) {
                data.sessionResult = { outcome: "tfa_unavailable" };
                return;
            }
            try {
                const assessment = await assess(candidate);
                lifetime.assertCurrent(data.revision);
                if (assessment.outcome === "assured") {
                    if (typeof assessment.isAssuranceCurrent !== "function")
                        throw new Error("session_assurance_missing");
                    data.assuranceLease = assessment.isAssuranceCurrent;
                    data.sessionResult = { ...candidate, outcome: "assured" };
                } else data.sessionResult = assessment;
            } catch (error) {
                ctx.log?.("error", "Login assurance assessment failed.", {
                    component: "auth-gateway",
                    operation: "assessSession",
                    accountId: candidate.accountId,
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
                data.sessionResult = { outcome: "tfa_unavailable" };
            }
        },
    );
    const login = async (
        input: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
        const revision = lifetime.capture();
        try {
            lifetime.assertCurrent(revision);
            const prepared = await root.flow.run("auth:prepareLogin", input, {
                data: { revision },
            });
            lifetime.assertCurrent(revision);
            const candidate = sessionGateResult(
                prepared,
                "sessionResult",
                "assured",
            );
            if (!candidate) throw new Error("login_preparation_incomplete");
            if (candidate.outcome !== "assured") {
                return candidate.outcome === "success" ||
                    candidate.outcome === "authenticated"
                    ? { outcome: "session_unavailable" }
                    : candidate;
            }
            if (
                typeof candidate.accountId !== "string" ||
                !isAccessRole(candidate.role) ||
                !(
                    candidate.ttlSeconds === null ||
                    (typeof candidate.ttlSeconds === "number" &&
                        Number.isFinite(candidate.ttlSeconds))
                )
            )
                throw new Error("invalid_session_candidate");
            const complete = ctx.capabilities.require<
                (session: SessionCommitInput) => Promise<SessionCommitResult>
            >("auth:completeSession");
            const lease = prepared.data.assuranceLease;
            const result = await complete({
                accountId: candidate.accountId,
                role: candidate.role,
                ttlSeconds: candidate.ttlSeconds,
                ...(typeof candidate.providerId === "string"
                    ? { providerId: candidate.providerId }
                    : {}),
                isAssuranceCurrent: () =>
                    lifetime.isCurrent(revision) &&
                    (typeof lease !== "function" || lease() === true),
            });
            return { ...candidate, ...result };
        } catch (error) {
            ctx.log?.("error", "Login preparation failed.", {
                component: "auth-gateway",
                operation: "prepareLogin",
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            return { outcome: "session_unavailable" };
        }
    };
    ctx.capabilities.contribute("auth:login", login);
    root.contributePublicCapability("auth:login", login);
}
