import { readLoginLifetime } from "./login-lifetime.js";
import { assertLiveChallenge } from "../challenge-lifetimes.js";
import {
    registerBootstrapFlow,
    requireBootstrapScope,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreTfaGateway } from "../gateway.js";

interface SessionCandidate {
    accountId: string;
    role: "user" | "teacher" | "moderator" | "admin" | "owner";
    ttlSeconds: number | null;
    providerId: string;
    [key: string]: unknown;
}

export function registerSessionAssessment(
    ctx: GatewayBootstrapContext,
    gateway: CoreTfaGateway,
): () => () => void {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const log = ctx.log;
    const createdAttempts = new WeakMap<
        SessionCandidate,
        { id: string; clear: (id: string) => void }
    >();
    let active = true;
    let revision = 0;
    let policyChanging = false;
    const dispose = () => {
        active = false;
        revision += 1;
    };
    dispose.reactivate = () => {
        active = true;
        revision += 1;
    };
    requireBootstrapScope(root).registerDisposer(dispose);
    const assertActive = (expected: unknown) => {
        if (!active || policyChanging || expected !== revision)
            throw new Error("tfa_assessment_unavailable");
    };
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "tfa:assessSession",
        {
            version: 1,
            kind: "function",
            description:
                "Evaluate persisted second-factor policy before Auth commits a session.",
        },
    );
    const flow = registerBootstrapFlow(root, {
        id: "tfa:assessSession",
        stages: ["readPolicy", "resolveChallenge"],
    });
    flow.extend(
        "readPolicy",
        { id: "tfa:readSessionPolicy" },
        async ({ input, data }) => {
            data.revision = revision;
            assertActive(data.revision);
            data.status = await gateway.getUserStatus(
                (input as SessionCandidate).accountId,
            );
        },
    );
    flow.extend(
        "resolveChallenge",
        { id: "tfa:resolveSessionChallenge" },
        async ({ input, data }) => {
            assertActive(data.revision);
            const candidate = input as SessionCandidate;
            const status = data.status as Awaited<
                ReturnType<CoreTfaGateway["getUserStatus"]>
            >;
            if (status.hasConfiguredMethod) {
                const createAttempt = ctx.capabilities.require<
                    (input: SessionCandidate) => { id: string }
                >("tfa:createPendingLoginAttempt");
                const clearAttempt = ctx.capabilities.require<
                    (id: string) => void
                >("tfa:clearPendingLoginAttempt");
                const attempt = createAttempt(candidate);
                createdAttempts.set(candidate, {
                    id: attempt.id,
                    clear: clearAttempt,
                });
                try {
                    const lifetime = readLoginLifetime(
                        ctx.capabilities,
                        attempt.id,
                        candidate.accountId,
                    );
                    const methods = await gateway.getLoginMethods(
                        candidate.accountId,
                        lifetime,
                    );
                    assertActive(data.revision);
                    assertLiveChallenge(lifetime);
                    if (!methods.length)
                        throw new Error("tfa_method_unavailable");
                    data.result = {
                        ...candidate,
                        outcome: "tfa_required",
                        loginAttemptId: attempt.id,
                        methods,
                    };
                } catch (error) {
                    clearAttempt(attempt.id);
                    throw error;
                }
                return;
            }
            if (status.requiresSetup) {
                const issueToken = ctx.capabilities.require<
                    (
                        subject: string,
                        role: SessionCandidate["role"],
                        ttlSeconds: number | null,
                        options: { providerId: string; setupPending: boolean },
                    ) => string
                >("auth:issueAccessToken");
                data.result = {
                    ...candidate,
                    outcome: "tfa_setup_required",
                    token: issueToken(
                        candidate.accountId,
                        candidate.role,
                        candidate.ttlSeconds,
                        {
                            providerId: candidate.providerId,
                            setupPending: true,
                        },
                    ),
                };
                return;
            }
            data.result = { ...candidate, outcome: "assured" };
        },
    );
    const assess = async (
        candidate: SessionCandidate,
    ): Promise<Record<string, unknown>> => {
        const expected = revision;
        const flowCandidate = { ...candidate };
        let retainedAttempt = false;
        try {
            if (!active || policyChanging)
                throw new Error("tfa_assessment_unavailable");
            const result = await root.flow.run(
                "tfa:assessSession",
                flowCandidate,
            );
            if (
                !active ||
                policyChanging ||
                revision !== expected ||
                !result.data.result
            ) {
                throw new Error("tfa_assessment_unavailable");
            }
            const current = result.data.result as Record<string, unknown>;
            const returned = Object.values(result.stageResults)
                .flat()
                .flatMap((entry) => {
                    if (
                        !entry ||
                        typeof entry !== "object" ||
                        !("result" in entry) ||
                        !entry.result ||
                        typeof entry.result !== "object"
                    )
                        return [];
                    return [entry.result as Record<string, unknown>];
                });
            const assessment =
                current.outcome !== "assured"
                    ? current
                    : (returned.findLast(
                          (gate) => gate.outcome !== "assured",
                      ) ?? current);
            retainedAttempt =
                assessment.outcome === "tfa_required" &&
                assessment.loginAttemptId ===
                    createdAttempts.get(flowCandidate)?.id;
            return assessment.outcome === "assured"
                ? {
                      ...assessment,
                      isAssuranceCurrent: () =>
                          active &&
                          !policyChanging &&
                          revision === expected &&
                          ctx.gatewayRegistry.get("tfa")?.status !== "disabled",
                  }
                : assessment;
        } catch (error) {
            log?.("error", "Second-factor session assessment failed.", {
                component: "tfa-gateway",
                operation: "assessSession",
                accountId: candidate.accountId,
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            return { outcome: "tfa_unavailable" };
        } finally {
            const attempt = createdAttempts.get(flowCandidate);
            createdAttempts.delete(flowCandidate);
            if (attempt && !retainedAttempt) attempt.clear(attempt.id);
        }
    };
    ctx.capabilities.contribute("tfa:assessSession", assess);
    root.contributePublicCapability("tfa:assessSession", assess);
    return () => {
        policyChanging = true;
        revision += 1;
        return () => {
            policyChanging = false;
            revision += 1;
        };
    };
}
