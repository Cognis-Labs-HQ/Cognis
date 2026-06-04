import type { CtxState, RegisteredFlowHook } from "./state.js";
import { normalizeHookOrder } from "./state.js";
import type { FlowHookRegistration, FlowStageHook } from "./types.js";

export function addFlowStageHook(
    state: CtxState,
    flowId: string,
    stageId: string,
    hook: FlowHookRegistration,
    handler: FlowStageHook,
): void {
    const flow = state.flows.get(flowId);
    if (!flow) {
        throw new Error(`Flow "${flowId}" is not registered.`);
    }

    if (!hook.id || typeof hook.id !== "string") {
        throw new Error("Flow hook id must be a non-empty string.");
    }

    const stageHooks = flow.stageHooks.get(stageId);
    if (!stageHooks) {
        throw new Error(
            `Flow "${flowId}" does not declare stage "${stageId}".`,
        );
    }

    if (stageHooks.has(hook.id)) {
        throw new Error(
            `Flow "${flowId}" stage "${stageId}" already has hook "${hook.id}".`,
        );
    }

    const normalized: RegisteredFlowHook = {
        id: hook.id,
        order: normalizeHookOrder(hook),
        handler,
    };

    stageHooks.set(hook.id, normalized);
}
