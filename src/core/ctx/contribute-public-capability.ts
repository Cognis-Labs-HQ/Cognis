import type { CtxState } from "./state.js";

export function contributePublicCapability(
    state: CtxState,
    key: string,
    value: unknown,
): void {
    state.capabilities.set(key, value);
    state.publicCapabilities.add(key);
}
