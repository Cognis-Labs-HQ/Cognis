import type { CtxState } from "./state.js";

export function removeFlowStageHook(
    state: CtxState,
    flowId: string,
    stageId: string,
    hookId: string,
): boolean {
    const flow = state.flows.get(flowId);
    if (!flow) return false;

    const stageHooks = flow.stageHooks.get(stageId);
    if (!stageHooks) return false;

    return stageHooks.delete(hookId);
}
