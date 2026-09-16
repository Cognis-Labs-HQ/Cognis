import type { CtxState } from "./state.js";

export function isPublicCapability(state: CtxState, key: string): boolean {
    return state.publicCapabilities.has(key);
}
