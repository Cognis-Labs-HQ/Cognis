import { createFlowContract } from "../flow-contract.js";

const definitions = [
    ["declare-focus-surfaces", ["collect", "validate"]],
    ["authorize-focus-operation", ["resolve-scope", "authorize"]],
    ["start-focus", ["authorize", "create-session", "publish"]],
    ["load-focus-target", ["resolve-route", "load", "mount"]],
    ["publish-focus-state", ["validate", "persist", "broadcast"]],
    ["apply-focus-state", ["deduplicate", "validate-revision", "apply"]],
    ["transfer-focus-control", ["authorize", "transfer", "publish"]],
    ["end-focus", ["authorize", "end", "restore", "publish"]],
] as const;

export const FOCUS_FLOW_CATALOG = Object.freeze(
    definitions.map(([id, stages]) =>
        createFlowContract({
            id,
            owner: "focus",
            description: `Provider-neutral ${id} orchestration.`,
            stages: stages.map((stage) => ({
                id: stage,
                description: `${stage} stage.`,
            })),
        }),
    ),
);
