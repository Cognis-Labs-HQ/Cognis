/** Register executable browser actions through a lifecycle-scoped provider context. */
export function registerScopedUiActions(ctx, namespace, actions) {
    const published = {};
    for (const [action, execute] of Object.entries(actions)) {
        const flowId = `${namespace}:${action}`;
        ctx.registerFlow(flowId, ["execute"]);
        ctx.extendFlow(flowId, "execute", { id: flowId }, async (stage) => {
            ctx.signal.throwIfAborted();
            stage.data.result = await execute(stage.input);
        });
        published[action] = async (input) => {
            ctx.signal.throwIfAborted();
            return (await ctx.runFlow(flowId, input)).data.result;
        };
    }
    return published;
}

export function mountProvider(ctx) {
    ctx.capabilities.contribute("ui:scopedActions", registerScopedUiActions);
}
