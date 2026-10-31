import { createCtx, CapabilityStore } from "@cognis/core";
import { registerTutorials } from "../../runtime.js";

/** Real staged flows with an explicit presentation/DOM contract fake. */
export function tutorialHost({ onFeedback } = {}) {
    const core = createCtx();
    const controller = new AbortController();
    const window = new EventTarget();
    window.CustomEvent = CustomEvent;
    window.location = { pathname: "/dashboard" };
    window.getComputedStyle = () => ({
        display: "block",
        visibility: "visible",
        opacity: "1",
    });
    const focus = {
        isConnected: true,
        count: 0,
        focus() {
            this.count++;
        },
    };
    const document = {
        defaultView: window,
        activeElement: focus,
        querySelector: () => null,
    };
    const rendered = [],
        events = [],
        logs = [],
        feedback = [];
    const store = new CapabilityStore();
    const ctx = {
        signal: controller.signal,
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
    const api = registerTutorials(ctx, {
        document,
        view: async (options) => {
            const entry = {
                ...options,
                disposed: false,
                dispose() {
                    this.disposed = true;
                },
            };
            rendered.push(entry);
            return entry;
        },
        log: (...args) => logs.push(args),
        feedback: (...args) => {
            feedback.push(args);
            return onFeedback?.(...args);
        },
        catalog: () => true,
    });
    const owners = [];
    const owner = (id = "example") => {
        const lifetime = new AbortController();
        owners.push(lifetime);
        const handle = api.owner(id, {
            signal: lifetime.signal,
            i18n: { t: (key) => key },
        });
        return { ...handle, abort: () => lifetime.abort() };
    };
    const element = () => ({
        ownerDocument: document,
        isConnected: true,
        getClientRects: () => [{}],
        getBoundingClientRect: () => ({
            left: 10,
            top: 10,
            right: 50,
            bottom: 50,
            width: 40,
            height: 40,
        }),
        matches: () => false,
        closest: () => null,
    });
    return {
        api,
        ctx,
        core,
        document,
        window,
        rendered,
        events,
        logs,
        feedback,
        focus,
        owner,
        element,
        dispose: () => {
            for (const signal of owners) signal.abort();
            controller.abort();
        },
    };
}

export const play = (
    steps = [
        { id: "one", titleKey: "owner.one" },
        { id: "two", titleKey: "owner.two" },
    ],
) => ({ version: 1, id: "intro", titleKey: "owner.title", steps });
export const tick = () => new Promise(setImmediate);
