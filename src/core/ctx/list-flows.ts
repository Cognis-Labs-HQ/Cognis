import type { CtxState } from "./state.js";

export function listFlows(state: CtxState): string[] {
    return Array.from(state.flows.keys()).sort((a, b) => a.localeCompare(b));
}
