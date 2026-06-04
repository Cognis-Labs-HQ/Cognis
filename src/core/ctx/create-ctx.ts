import { addFlowStageHook as addFlowStageHookImpl } from "./add-flow-stage-hook.js";
import { contributeCapability as contributeCapabilityImpl } from "./contribute-capability.js";
import { contributePublicCapability as contributePublicCapabilityImpl } from "./contribute-public-capability.js";
import { getCapability as getCapabilityImpl } from "./get-capability.js";
import { hasCapability as hasCapabilityImpl } from "./has-capability.js";
import { hasFlow as hasFlowImpl } from "./has-flow.js";
import { isPublicCapability as isPublicCapabilityImpl } from "./is-public-capability.js";
import { listFlows as listFlowsImpl } from "./list-flows.js";
import { listPublicCapabilities as listPublicCapabilitiesImpl } from "./list-public-capabilities.js";
import { registerFlow as registerFlowImpl } from "./register-flow.js";
import { removeFlowStageHook as removeFlowStageHookImpl } from "./remove-flow-stage-hook.js";
import { requireCapability as requireCapabilityImpl } from "./require-capability.js";
import { runFlow as runFlowImpl } from "./run-flow.js";
import { createCtxState } from "./state.js";
import { unregisterFlow as unregisterFlowImpl } from "./unregister-flow.js";
import type {
    Ctx,
    FlowHookRegistration,
    FlowRegistration,
    FlowRunOptions,
    FlowRunResult,
    FlowStageHook,
} from "./types.js";

export function createCtx(): Ctx {
    const state = createCtxState();

    const ctx: Ctx = {
        contributeCapability(key: string, value: unknown): void {
            contributeCapabilityImpl(state, key, value);
        },
        contributePublicCapability(key: string, value: unknown): void {
            contributePublicCapabilityImpl(state, key, value);
        },
        isPublicCapability(key: string): boolean {
            return isPublicCapabilityImpl(state, key);
        },
        listPublicCapabilities(): string[] {
            return listPublicCapabilitiesImpl(state);
        },
        hasCapability(key: string): boolean {
            return hasCapabilityImpl(state, key);
        },
        getCapability<T>(key: string): T | undefined {
            return getCapabilityImpl<T>(state, key);
        },
        requireCapability<T>(key: string): T {
            return requireCapabilityImpl<T>(state, key);
        },
        registerFlow(flow: FlowRegistration): void {
            registerFlowImpl(state, flow);
        },
        unregisterFlow(flowId: string): boolean {
            return unregisterFlowImpl(state, flowId);
        },
        hasFlow(flowId: string): boolean {
            return hasFlowImpl(state, flowId);
        },
        listFlows(): string[] {
            return listFlowsImpl(state);
        },
        addFlowStageHook(
            flowId: string,
            stageId: string,
            hook: FlowHookRegistration,
            handler: FlowStageHook,
        ): void {
            addFlowStageHookImpl(state, flowId, stageId, hook, handler);
        },
        removeFlowStageHook(
            flowId: string,
            stageId: string,
            hookId: string,
        ): boolean {
            return removeFlowStageHookImpl(state, flowId, stageId, hookId);
        },
        runFlow(
            flowId: string,
            input?: unknown,
            options?: FlowRunOptions,
        ): Promise<FlowRunResult> {
            return runFlowImpl(state, ctx, flowId, input, options);
        },
    };

    return ctx;
}
