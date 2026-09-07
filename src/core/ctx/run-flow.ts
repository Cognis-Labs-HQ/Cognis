import type { CtxState } from "./state.js";
import type {
    Ctx,
    FlowRunOptions,
    FlowRunResult,
    FlowStageContext,
} from "./types.js";

function sortStageHooks(
    hooks: ReadonlyArray<{
        id: string;
        order: number;
        handler: (context: FlowStageContext) => unknown | Promise<unknown>;
    }>,
) {
    return [...hooks].sort((left, right) => {
        if (left.order !== right.order) return left.order - right.order;
        return left.id.localeCompare(right.id);
    });
}

export async function runFlow(
    state: CtxState,
    ctx: Ctx,
    flowId: string,
    input?: unknown,
    options?: FlowRunOptions,
): Promise<FlowRunResult> {
    const flowEntry = state.flows.get(flowId);
    if (!flowEntry) {
        throw new Error(`Flow "${flowId}" is not registered.`);
    }

    const data = options?.data ?? {};
    const stageResults: Record<string, unknown[]> = {};
    const meta = Object.freeze({ ...(options?.meta ?? {}) });

    for (const stageId of flowEntry.flow.stages) {
        const stageHookMap = flowEntry.stageHooks.get(stageId);
        const stageHooks = sortStageHooks(
            Array.from(stageHookMap?.values() ?? []),
        );

        const executionContext: FlowStageContext = {
            ctx,
            flowId,
            stageId,
            input,
            meta,
            data,
            stageResults,
        };

        const currentStageResults: unknown[] = [];
        for (const hook of stageHooks) {
            const result = await hook.handler(executionContext);
            currentStageResults.push(result);
        }
        stageResults[stageId] = currentStageResults;
    }

    return {
        flowId,
        data,
        stageResults,
    };
}
