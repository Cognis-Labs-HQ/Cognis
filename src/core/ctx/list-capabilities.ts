import type { CtxState } from "./state.js";

export function listCapabilities(state: CtxState): string[] {
    return Array.from(state.capabilities.keys()).sort();
}
