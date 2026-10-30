import type { CtxState } from "./state.js";

export function listPublicCapabilities(state: CtxState): string[] {
    return Array.from(state.publicCapabilities).sort();
}
