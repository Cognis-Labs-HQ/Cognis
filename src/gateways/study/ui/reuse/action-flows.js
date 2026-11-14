import { uiCtx } from "/static/reuse/ui-ctx.js";

/** Declare owner-specific browser actions and execute them through extensible ctx stages. */
export function createActionRunner(namespace, actions) {
    for (const action of actions) {
        const id = `${namespace}:${action}`;
        if (!uiCtx.flowExists(id))
            uiCtx.registerFlow(id, ["before", "execute", "after"]);
        uiCtx.extendFlow(
            id,
            "execute",
            { id: `${namespace}:execute:${action}` },
            async ({ input, data }) => {
                if (input.signal?.aborted) return;
                data.result = await input.operation();
            },
        );
    }
    return async (action, operation, signal) => {
        if (!actions.includes(action)) throw new Error("unsupported_action");
        const result = await uiCtx.runFlow(`${namespace}:${action}`, {
            operation,
            signal,
        });
        return result.data.result;
    };
}
