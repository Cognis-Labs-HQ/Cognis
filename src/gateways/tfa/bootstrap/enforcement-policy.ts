import {
    registerBootstrapFlow,
    requireBootstrapScope,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreTfaGateway } from "../gateway.js";

export interface EnforcementPolicyResult {
    required: boolean;
    previousRequired: boolean;
    revokedSetupPendingCount: number;
}

export type ApplyEnforcementPolicy = (input: {
    required: boolean;
}) => Promise<EnforcementPolicyResult>;

export function registerEnforcementPolicy(
    ctx: GatewayBootstrapContext,
    gateway: CoreTfaGateway,
    suspendAssessments: () => () => void,
): void {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const log = ctx.log;
    let active = true;
    let revision = 0;
    let pending: Promise<unknown> = Promise.resolve();
    const changes = new WeakMap<
        object,
        {
            required: boolean;
            revision: number;
            data: Record<string, unknown>;
            stage:
                | "readPolicy"
                | "revokeRestrictedSessions"
                | "persistPolicy"
                | "finished";
        }
    >();
    const dispose = () => {
        active = false;
        revision += 1;
    };
    dispose.reactivate = () => {
        active = true;
        revision += 1;
    };
    requireBootstrapScope(root).registerDisposer(dispose);
    const assertCurrent = (expected: number) => {
        if (
            !active ||
            expected !== revision ||
            ctx.gatewayRegistry.get("tfa")?.status === "disabled"
        )
            throw new Error("tfa_policy_unavailable");
    };
    const enterStage = (
        input: unknown,
        data: Record<string, unknown>,
        stage: "readPolicy" | "revokeRestrictedSessions" | "persistPolicy",
        nextStage: "revokeRestrictedSessions" | "persistPolicy" | "finished",
    ) => {
        const change =
            input !== null && typeof input === "object"
                ? changes.get(input)
                : undefined;
        if (!change || change.data !== data || change.stage !== stage)
            throw new Error("tfa_policy_unavailable");
        assertCurrent(change.revision);
        change.stage = nextStage;
        return change;
    };
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "tfa:applyEnforcementPolicy",
        {
            version: 1,
            kind: "function",
            description:
                "Revoke restricted sessions before disabling mandatory enrollment.",
        },
    );
    const flow = registerBootstrapFlow(root, {
        id: "tfa:applyEnforcementPolicy",
        stages: ["readPolicy", "revokeRestrictedSessions", "persistPolicy"],
    });
    flow.extend(
        "readPolicy",
        { id: "tfa:readEnforcementPolicy" },
        async ({ input, data }) => {
            enterStage(input, data, "readPolicy", "revokeRestrictedSessions");
            data.previousRequired = await gateway.getEnforceAllUsers();
        },
    );
    flow.extend(
        "revokeRestrictedSessions",
        { id: "tfa:revokeRestrictedSessions" },
        ({ input, data }) => {
            const change = enterStage(
                input,
                data,
                "revokeRestrictedSessions",
                "persistPolicy",
            );
            data.revokedSetupPendingCount = change.required
                ? 0
                : ctx.capabilities.require<() => number>(
                      "auth:revokeSetupPendingAccessTokens",
                  )();
        },
    );
    flow.extend(
        "persistPolicy",
        { id: "tfa:persistEnforcementPolicy" },
        async ({ input, data }) => {
            const change = enterStage(input, data, "persistPolicy", "finished");
            await gateway.setEnforceAllUsers(change.required);
            assertCurrent(change.revision);
        },
    );
    const apply: ApplyEnforcementPolicy = async ({ required }) => {
        if (typeof required !== "boolean")
            throw new Error("invalid_tfa_policy");
        const expected = revision;
        const previous = pending;
        const operation = (async () => {
            await previous;
            let resumeAssessments: (() => void) | undefined;
            const input = Object.freeze({ required });
            const data: Record<string, unknown> = {};
            try {
                assertCurrent(expected);
                resumeAssessments = suspendAssessments();
                changes.set(input, {
                    required,
                    revision: expected,
                    data,
                    stage: "readPolicy",
                });
                const result = await root.flow.run(
                    "tfa:applyEnforcementPolicy",
                    input,
                    { data },
                );
                assertCurrent(expected);
                const previousRequired = result.data.previousRequired;
                const revokedSetupPendingCount =
                    result.data.revokedSetupPendingCount;
                if (
                    typeof previousRequired !== "boolean" ||
                    typeof revokedSetupPendingCount !== "number"
                )
                    throw new Error("tfa_policy_incomplete");
                log?.("info", "Updated mandatory TFA enforcement policy.", {
                    component: "tfa-gateway",
                    operation: "applyEnforcementPolicy",
                    required,
                    previousRequired,
                    revokedSetupPendingCount,
                });
                return { required, previousRequired, revokedSetupPendingCount };
            } catch (error) {
                log?.("error", "Mandatory TFA enforcement policy failed.", {
                    component: "tfa-gateway",
                    operation: "applyEnforcementPolicy",
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
                throw new Error("tfa_policy_unavailable");
            } finally {
                changes.delete(input);
                resumeAssessments?.();
            }
        })();
        pending = operation.then(
            () => undefined,
            () => undefined,
        );
        return operation;
    };
    ctx.capabilities.contribute("tfa:applyEnforcementPolicy", apply);
    root.contributePublicCapability("tfa:applyEnforcementPolicy", apply);
    ctx.capabilities.contribute(
        "tfa:setEnforceAllUsers",
        async (required: boolean) => {
            await apply({ required });
        },
    );
}
