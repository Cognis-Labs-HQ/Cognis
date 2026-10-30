import type { CtxState } from "./state.js";

export function removeCapability(state: CtxState, key: string): boolean {
    state.publicCapabilities.delete(key);
    return state.capabilities.delete(key);
}
