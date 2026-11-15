import assert from "node:assert/strict";

export function installAuthenticationFlow(ctx) {
    const flows = new Map();
    ctx.registerFlow = (name, stages) => {
        assert.equal(flows.has(name), false, `Duplicate flow ${name}`);
        const registered = new Map(stages.map((stage) => [stage, new Map()]));
        flows.set(name, registered);
        return () => {
            if (flows.get(name) === registered) flows.delete(name);
        };
    };
    ctx.extendFlow = (name, stage, metadata, handler) => {
        assert.ok(
            flows.get(name)?.has(stage),
            `Unregistered flow ${name}:${stage}`,
        );
        const hooks = flows.get(name).get(stage);
        assert.equal(hooks.has(metadata.id), false);
        hooks.set(metadata.id, { handler, order: metadata.order ?? 0 });
    };
    ctx.removeFlowHook = (name, stage, id) =>
        flows.get(name)?.get(stage)?.delete(id);
    ctx.runFlow = async (name, input) => {
        const registered = flows.get(name);
        assert.ok(registered, `Unregistered flow ${name}`);
        const data = {};
        for (const [stageId, hooks] of registered) {
            for (const { handler } of [...hooks.values()].sort(
                (left, right) => left.order - right.order,
            ))
                await handler({ flowId: name, stageId, input, data });
        }
        return { data };
    };
    ctx.registerFlow("authenticate-session", ["afterSession"]);
    return flows;
}
