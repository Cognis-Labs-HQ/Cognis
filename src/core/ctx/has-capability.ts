import type { CtxState } from "./state.js";

export function hasCapability(state: CtxState, key: string): boolean {
    return state.capabilities.has(key);
}
