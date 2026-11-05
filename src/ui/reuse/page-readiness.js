/**
 * Coordinates page readiness after mount and awaited owner-provided blockers.
 * Public exports: registerPageReadinessBlocker — appends a lifetime-owned popup/check;
 * installPageReadiness — publishes ui:pageReadiness.isReady and owns page:ready execution.
 * @example ctx.extendFlow('page:ready', 'blocking', { id: 'owner:popup' }, async ({input}) => showPopup({signal: input.signal}));
 * @param {object} ctx Browser flow/capability context.
 * @param {object} options Optional window for isolated hosts; lifetime follows ctx.signal.
 * @returns {{isReady: Function, dispose: Function}} Current readiness and cleanup.
 */
export function installPageReadiness(ctx, { window = globalThis.window } = {}) {
    const existing = ctx.capabilities.get("ui:pageReadiness");
    if (existing) return existing;
    const controller = new AbortController();
    const signal = ctx.signal
        ? AbortSignal.any([ctx.signal, controller.signal])
        : controller.signal;
    signal.throwIfAborted();
    let generation = 0;
    let current;
    const reset = () => {
        current?.controller.abort();
        current = {
            controller: new AbortController(),
            generation: ++generation,
            started: false,
            ready: false,
        };
    };
    reset();
    const capability = {
        isReady: () =>
            current.ready && !signal.aborted && !current.lifetime?.aborted,
        dispose: () => controller.abort(),
    };
    ctx.capabilities.contribute("ui:pageReadiness", capability);
    const id = "ui:pageReadiness";
    const check = (input) => {
        input.signal.throwIfAborted();
        if (input.generation !== generation)
            throw new DOMException("Page replaced", "AbortError");
    };
    ctx.extendFlow("page:ready", "prepare", { id }, ({ input }) =>
        check(input),
    );
    ctx.extendFlow("page:ready", "ready", { id }, ({ input }) => {
        check(input);
        current.ready = true;
    });
    ctx.extendFlow(
        "page:mounted",
        "publish",
        { id, order: -10000 },
        ({ input }) => {
            if (
                signal.aborted ||
                current.started ||
                (window && input.pathname !== window.location.pathname)
            )
                return;
            const page = current;
            page.started = true;
            const lifetime = AbortSignal.any([
                signal,
                page.controller.signal,
                ...(input.signal ? [input.signal] : []),
            ]);
            page.lifetime = lifetime;
            // Rendering must finish while blockers are visible; consumers wait for page:ready instead of blocking mount.
            void ctx
                .runFlow("page:ready", {
                    ...input,
                    signal: lifetime,
                    generation: page.generation,
                })
                .catch((error) => {
                    if (!lifetime.aborted)
                        ctx.capabilities.get("ui:log")?.(
                            "error",
                            "Page readiness failed.",
                            {
                                component: "ui",
                                operation: "page:ready",
                                errorName: error?.name,
                            },
                        );
                });
        },
    );
    for (const event of ["cognis:route-will-change", "popstate", "pagehide"])
        window?.addEventListener(event, reset, { signal });
    signal.addEventListener(
        "abort",
        () => {
            current.controller.abort();
            for (const [flow, stage] of [
                ["page:mounted", "publish"],
                ["page:ready", "prepare"],
                ["page:ready", "ready"],
            ])
                ctx.removeFlowHook(flow, stage, id);
            ctx.capabilities.remove("ui:pageReadiness", capability);
        },
        { once: true },
    );
    return capability;
}

const blockers = new WeakMap();

/**
 * Append an awaited owner check or popup to page readiness with replacement-safe cleanup.
 * @param {object} ctx Browser flow context.
 * @param {object} options Unique owner ID, optional order and lifetime signal.
 * @param {Function} handler Awaitable check receiving the page's cancellation signal.
 * @returns {Function} Registration cleanup.
 * @example registerPageReadinessBlocker(ctx, {id: 'owner:notice', signal}, ({input}) => showNotice(input.signal));
 */
export function registerPageReadinessBlocker(
    ctx,
    { id, order = 0, signal },
    handler,
) {
    let entries = blockers.get(ctx);
    if (!entries) {
        entries = new Map();
        blockers.set(ctx, entries);
    }
    entries.get(id)?.();
    const registered = ctx.extendFlow(
        "page:ready",
        "blocking",
        { id, order },
        async (stage) => {
            const lifetime = AbortSignal.any([
                stage.input.signal,
                ...(signal ? [signal] : []),
            ]);
            try {
                lifetime.throwIfAborted();
                return await handler({
                    ...stage,
                    input: { ...stage.input, signal: lifetime },
                });
            } catch (error) {
                if (stage.input.signal.aborted) throw error;
                if (!signal?.aborted) throw error;
            }
        },
    );
    if (!registered) throw new Error("page_readiness_blocker_conflict");
    const dispose = () => {
        if (entries.get(id) !== dispose) return;
        ctx.removeFlowHook("page:ready", "blocking", id);
        entries.delete(id);
        signal?.removeEventListener("abort", dispose);
    };
    entries.set(id, dispose);
    signal?.addEventListener("abort", dispose, { once: true });
    if (signal?.aborted) dispose();
    return dispose;
}
