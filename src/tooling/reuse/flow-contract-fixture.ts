import assert from "node:assert/strict";
import {
    createCtx,
    runBootstrapScope,
    type CapabilityContracts,
    type Ctx,
    type FlowRegistration,
} from "@cognis/core";

type Invocation = { input: unknown; stageResults: object };

export async function createFlowContractFixture(options: {
    flow: FlowRegistration;
    captureStage: string;
    stageResult: unknown;
    contractId: string;
    version: number;
    members: readonly string[];
    method: string;
}): Promise<{
    root: Ctx;
    calls: Invocation[];
    setOutcome(value: unknown): void;
}> {
    const root = createCtx();
    const calls: Invocation[] = [];
    const invocations = new WeakMap<object, unknown>();
    let outcome: unknown;
    root.registerFlow(options.flow);
    root.flow.extend(
        options.flow.id,
        options.captureStage,
        { id: "test:capture-invocation" },
        (stage) => {
            invocations.set(stage.stageResults, stage.input);
            return options.stageResult;
        },
    );
    await runBootstrapScope(root, "test:contract-provider", async () => {
        root.requireCapability<CapabilityContracts>("system:contracts").define(
            options.contractId,
            {
                version: options.version,
                kind: "object",
                members: Object.fromEntries(
                    options.members.map((member) => [
                        member,
                        "function" as const,
                    ]),
                ),
                description: "Public operation outcome test provider",
            },
        );
        const implementation: Record<string, unknown> = Object.fromEntries(
            options.members.map((member) => [
                member,
                () => {
                    throw new Error("unexpected_contract_member");
                },
            ]),
        );
        implementation[options.method] = (
            input: unknown,
            stageResults: object,
        ) => {
            assert.ok(invocations.has(stageResults));
            assert.equal(input, invocations.get(stageResults));
            calls.push({ input, stageResults });
            return outcome;
        };
        root.contributePublicCapability(options.contractId, implementation);
    });
    return {
        root,
        calls,
        setOutcome(value) {
            outcome = value;
        },
    };
}
