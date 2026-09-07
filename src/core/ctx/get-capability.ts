import type { CtxState } from "./state.js";

export function getCapability<T>(state: CtxState, key: string): T | undefined {
    return state.capabilities.get(key) as T | undefined;
}
