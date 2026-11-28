import { createCtx, CapabilityStore } from "@cognis/core";

/** Public flow/capability boundary backed by the real Core staged-flow runner. */
export function flowHost(signal) {
    const core = createCtx();
    const store = new CapabilityStore();
    const events = [];
    const ctx = {
        signal,
        capabilities: {
            get: (id) => store.get(id),
            contribute: (id, value) => {
                if (store.has(id)) return false;
                store.contribute(id, value);
                return true;
            },
            remove: (id, value) => store.get(id) === value && store.remove(id),
        },
        registerFlow: (id, stages) => {
            core.registerFlow({ id, stages });
            return () => core.unregisterFlow(id);
        },
        removeFlowHook: (...args) => core.removeFlowStageHook(...args),
        flowExists: (id) => core.hasFlow(id),
        extendFlow: (...args) => core.flow.extend(...args),
        runFlow: (id, input) => {
            events.push(id);
            return core.flow.run(id, input);
        },
    };
    return { core, ctx, events };
}
