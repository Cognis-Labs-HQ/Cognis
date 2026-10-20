/** Register executable browser actions through a lifecycle-scoped provider context. */
export function registerScopedUiActions(ctx, namespace, actions) {
    const published = {};
    for (const [action, execute] of Object.entries(actions)) {
        const flowId = `${namespace}:${action}`;
        ctx.registerFlow(flowId, ["before", "execute", "after"]);
        ctx.extendFlow(flowId, "execute", { id: flowId }, async (stage) => {
            ctx.signal.throwIfAborted();
            stage.input?.signal?.throwIfAborted();
            stage.data.result = await execute(stage.input);
            ctx.signal.throwIfAborted();
            stage.input?.signal?.throwIfAborted();
        });
        published[action] = async (input) => {
            ctx.signal.throwIfAborted();
            const result = await ctx.runFlow(flowId, input);
            ctx.signal.throwIfAborted();
            input?.signal?.throwIfAborted();
            return result.data.result;
        };
    }
    return published;
}

export function mountProvider(ctx) {
    ctx.capabilities.contribute("ui:scopedActions", registerScopedUiActions);
}
