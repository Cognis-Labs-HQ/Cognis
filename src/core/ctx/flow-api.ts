import { tryAddFlowStageHook } from "./add-flow-stage-hook.js";
import { hasFlow as hasFlowImpl } from "./has-flow.js";
import { runFlow as runFlowImpl } from "./run-flow.js";
import type { CtxState } from "./state.js";
import type {
    Ctx,
    FlowApi,
    FlowHookRegistration,
    FlowRunOptions,
    FlowRunResult,
    FlowStageHook,
} from "./types.js";

/**
 * A no-op FlowApi returned when no flow bus is available. All calls are safe
 * and predictably inert: `exists` returns false, `extend` returns false, and
 * `run` rejects with a clear error.
 */
export const NULL_FLOW_API: FlowApi = Object.freeze({
    exists(_flowId: string): boolean {
        return false;
    },
    extend(
        _flowId: string,
        _stageId: string,
        _hook: FlowHookRegistration,
        _handler: FlowStageHook,
    ): boolean {
        return false;
    },
    run(_flowId: string): Promise<FlowRunResult> {
        return Promise.reject(new Error("No flow bus available."));
    },
});

/**
 * Creates the FlowApi surface from a CtxState and its owning Ctx instance.
 * The `ctx` parameter is captured by reference so that nested flow calls made
 * inside a stage hook receive the fully-assembled Ctx via `stageCtx.ctx`.
 */
export function createFlowApi(state: CtxState, ctx: Ctx): FlowApi {
    return {
        exists(flowId: string): boolean {
            return hasFlowImpl(state, flowId);
        },
        extend(
            flowId: string,
            stageId: string,
            hook: FlowHookRegistration,
            handler: FlowStageHook,
        ): boolean {
            return tryAddFlowStageHook(state, flowId, stageId, hook, handler);
        },
        run(
            flowId: string,
            input?: unknown,
            options?: FlowRunOptions,
        ): Promise<FlowRunResult> {
            return runFlowImpl(state, ctx, flowId, input, options);
        },
    };
}
