import type { CtxState } from "./state.js";

export function contributeCapability(
    state: CtxState,
    key: string,
    value: unknown,
): void {
    state.capabilities.set(key, value);
}
