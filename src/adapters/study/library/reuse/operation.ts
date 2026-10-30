import type { FlowApi, FlowStageHook } from "@cognis/core";

/** Run owner stages through ctx; isolated services without ctx execute the same stages locally. */
export async function runOperation(
    flow: FlowApi | undefined,
    id: string,
    input: unknown,
    handlers: Record<string, () => unknown | Promise<unknown>>,
): Promise<void> {
    const executed = new Set<string>();
    const stages = Object.fromEntries(
        Object.entries(handlers).map(([stage, operation]) => [
            stage,
            async () => {
                const result = await operation();
                executed.add(stage);
                return result;
            },
        ]),
    ) as Record<string, FlowStageHook>;
    if (flow) {
        await flow.run(id, input, { handlers: stages });
        if (executed.size !== Object.keys(handlers).length)
            throw new Error("flow_operation_not_executed");
    } else {
        for (const operation of Object.values(handlers)) await operation();
    }
}
