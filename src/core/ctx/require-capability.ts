import type { CtxState } from "./state.js";

export function requireCapability<T>(state: CtxState, key: string): T {
    if (!state.capabilities.has(key)) {
        throw new Error(`Required capability "${key}" is not available.`);
    }
    return state.capabilities.get(key) as T;
}
