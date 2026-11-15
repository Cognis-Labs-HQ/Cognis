let sequence = 0;

/** Register executable decisions, reads, writes and draft navigation for one page. */
export function createAdministrationActionFlows({ ctx, signal }) {
    const namespace = `administration:actions${++sequence}`;
    const removers = [];
    const names = {};
    const dispose = () => {
        for (const remove of removers.splice(0)) remove();
        signal?.removeEventListener("abort", dispose);
    };
    function register(name, stages) {
        const flow = `${namespace}:${name}`;
        names[name] = flow;
        removers.push(ctx.registerFlow(flow, Object.keys(stages)));
        for (const [stage, handler] of Object.entries(stages)) {
            ctx.extendFlow(flow, stage, { id: flow }, handler);
        }
    }
    try {
        for (const [name, stage] of [
            ["read", "read"],
            ["decision", "present"],
        ]) {
            register(name, {
                authorize: ({ input }) => input.check(),
                [stage]: async ({ input, data }) => {
                    input.check();
                    data.result = await input.performOperation();
                },
                verify: ({ input }) => input.check(),
            });
        }
        register("mutation", {
            authorize: ({ input }) => input.check(),
            submit: async ({ input, data }) => {
                input.check();
                data.result = await input.submit();
            },
            acknowledge: ({ input, data }) => {
                input.acknowledge(data.result);
                input.check();
            },
        });
        register("leaveSection", {
            authorize: ({ input }) => input.check(),
            confirm: async ({ input, data }) => {
                input.check();
                data.decision = await input.confirm();
            },
            discard: ({ input, data }) => {
                input.check();
                data.result = data.decision === "discard";
                if (data.result) input.discard();
            },
        });
    } catch (error) {
        dispose();
        throw error;
    }
    signal?.addEventListener("abort", dispose, { once: true });
    if (signal?.aborted) dispose();
    return {
        names,
        dispose,
        async run(name, input) {
            signal?.throwIfAborted();
            const result = await ctx.runFlow(names[name], input);
            return result.data.result;
        },
    };
}
