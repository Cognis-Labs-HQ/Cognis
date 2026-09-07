import type { CtxState, RegisteredFlowHook } from "./state.js";
import { normalizeHookOrder } from "./state.js";
import type { FlowHookRegistration, FlowStageHook } from "./types.js";

export function addFlowStageHook(
    state: CtxState,
    flowId: string,
    stageId: string,
    hook: FlowHookRegistration,
    handler: FlowStageHook,
): void {
    const flow = state.flows.get(flowId);
    if (!flow) {
        throw new Error(`Flow "${flowId}" is not registered.`);
    }

    if (!hook.id || typeof hook.id !== "string") {
        throw new Error("Flow hook id must be a non-empty string.");
    }

    const stageHooks = flow.stageHooks.get(stageId);
    if (!stageHooks) {
        throw new Error(
            `Flow "${flowId}" does not declare stage "${stageId}".`,
        );
    }

    if (stageHooks.has(hook.id)) {
        throw new Error(
            `Flow "${flowId}" stage "${stageId}" already has hook "${hook.id}".`,
        );
    }

    const normalized: RegisteredFlowHook = {
        id: hook.id,
        order: normalizeHookOrder(hook),
        handler,
    };

    stageHooks.set(hook.id, normalized);
}

/**
 * Variant of addFlowStageHook that never throws. Returns true when the hook
 * was registered, false when the flow, stage, or hook ID is invalid or the
 * hook ID is already present (making it safe for repeated or concurrent-style
 * injection without duplicate-registration guards).
 */
export function tryAddFlowStageHook(
    state: CtxState,
    flowId: string,
    stageId: string,
    hook: FlowHookRegistration,
    handler: FlowStageHook,
): boolean {
    const flow = state.flows.get(flowId);
    if (!flow) return false;

    if (!hook.id || typeof hook.id !== "string") return false;

    const stageHooks = flow.stageHooks.get(stageId);
    if (!stageHooks) return false;

    if (stageHooks.has(hook.id)) return false;

    const normalized: RegisteredFlowHook = {
        id: hook.id,
        order: normalizeHookOrder(hook),
        handler,
    };

    stageHooks.set(hook.id, normalized);
    return true;
}
