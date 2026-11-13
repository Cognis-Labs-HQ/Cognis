import type { CtxState } from "./state.js";

export function hasFlow(state: CtxState, flowId: string): boolean {
    return state.flows.has(flowId);
}
