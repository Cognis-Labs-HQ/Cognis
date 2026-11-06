import { flowHost } from "../../../tests/fixtures/flow-host.js";
import { registerFloatingMenus } from "../../../floating-menu-queue.js";
import { registerTutorials } from "../../runtime.js";

/** Real staged flows with an explicit presentation/DOM contract fake. */
export function tutorialHost({
    onFeedback,
    identity,
    role,
    page,
    openPage,
} = {}) {
    const controller = new AbortController();
    const { core, ctx, events } = flowHost(controller.signal);
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
        logs = [],
        feedback = [];
    registerFloatingMenus(ctx);
    const api = registerTutorials(ctx, {
        document,
        identity,
        role,
        page,
        openPage,
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
        contains(candidate) {
            return candidate === this;
        },
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
) => ({
    version: 1,
    page: "/dashboard",
    id: "intro",
    titleKey: "owner.title",
    steps,
});
export const tick = () => new Promise(setImmediate);
