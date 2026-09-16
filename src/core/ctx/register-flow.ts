import type { CtxState, RegisteredFlowHook } from "./state.js";
import type { FlowRegistration } from "./types.js";

export function registerFlow(state: CtxState, flow: FlowRegistration): void {
    if (!flow.id || typeof flow.id !== "string") {
        throw new Error("Flow id must be a non-empty string.");
    }

    if (!Array.isArray(flow.stages) || flow.stages.length === 0) {
        throw new Error(`Flow "${flow.id}" must declare at least one stage.`);
    }

    const normalizedStages = flow.stages.map((stageId) => {
        if (!stageId || typeof stageId !== "string") {
            throw new Error(`Flow "${flow.id}" has an invalid stage id.`);
        }
        return stageId;
    });

    const duplicateStage = normalizedStages.find(
        (stageId, index) => normalizedStages.indexOf(stageId) !== index,
    );
    if (duplicateStage) {
        throw new Error(
            `Flow "${flow.id}" has duplicate stage "${duplicateStage}".`,
        );
    }

    const existing = state.flows.get(flow.id);
    if (existing) {
        throw new Error(`Flow "${flow.id}" is already registered.`);
    }

    const stageHooks = new Map<string, Map<string, RegisteredFlowHook>>();
    for (const stageId of normalizedStages) {
        stageHooks.set(stageId, new Map());
    }

    state.flows.set(flow.id, {
        flow: { ...flow, stages: normalizedStages },
        stageHooks,
    });
}
