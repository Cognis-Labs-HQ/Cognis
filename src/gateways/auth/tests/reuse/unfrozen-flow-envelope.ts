import type { Ctx } from "@cognis/core";

/** Public FlowApi fixture: real stages execute, but the consumer sees the legacy mutable envelope. */
export function exposeUnfrozenFlowEnvelopes(
    root: Ctx,
    mode: { enabled: boolean },
): void {
    const extend = root.flow.extend.bind(root.flow);
    root.flow.extend = (flowId, stageId, metadata, handler) =>
        extend(flowId, stageId, metadata, (stage) =>
            handler(mode.enabled ? { ...stage } : stage),
        );
}
