import type { CtxState } from "./state.js";

export function unregisterFlow(state: CtxState, flowId: string): boolean {
    return state.flows.delete(flowId);
}
