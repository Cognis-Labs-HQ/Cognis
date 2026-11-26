/** Shared staged layout-save feedback and editing-session commit lifecycle. */
const FLOW = "ui:pageComposer:saveLayout";

function registerSaveFlow(ctx) {
    if (ctx.flowExists(FLOW)) return;
    const dispose = ctx.registerFlow(FLOW, ["validate", "persist", "notify"]);
    ctx.extendFlow(FLOW, "validate", { id: FLOW }, ({ input }) => {
        if (typeof input.save !== "function")
            throw new TypeError("layout_save_handler_required");
    });
    ctx.extendFlow(FLOW, "persist", { id: FLOW }, async ({ input, data }) => {
        if (input.signal?.aborted) return;
        const log = (...args) => ctx.capabilities.get("ui:log")?.(...args);
        try {
            data.profiles = await input.save(...input.args, input.signal);
            if (!input.signal?.aborted)
                log("info", "page_layout_updated", {
                    component: "ui",
                    operation: "saveLayout",
                });
        } catch (error) {
            data.failed = true;
            if (!input.signal?.aborted)
                log("error", "page_layout_update_failed", {
                    component: "ui",
                    operation: "saveLayout",
                    errorName: error?.name,
                    httpStatus: error?.httpStatus,
                });
        }
    });
    ctx.extendFlow(FLOW, "notify", { id: FLOW }, ({ input, data }) => {
        if (input.signal?.aborted) return;
        input.notify(
            input.i18n.t(
                data.failed
                    ? "ui.reuse.layout_save_failed"
                    : "ui.reuse.layout_saved",
            ),
            { variant: data.failed ? "error" : "success" },
        );
    });
    ctx.signal?.addEventListener("abort", dispose, { once: true });
}

/** @param {object} options Public context, persistence, localized toast and page lifetime. @returns {Function} A coalesced save returning profiles on success or null on failure/cancellation. */
export function createLayoutSaveHandler({ ctx, save, notify, i18n, signal }) {
    registerSaveFlow(ctx);
    const pending = new Map();
    return (key, profiles, columns, layout) => {
        if (pending.has(key)) return pending.get(key);
        const task = ctx
            .runFlow(FLOW, {
                save,
                notify,
                i18n,
                signal,
                args: [key, profiles, columns, structuredClone(layout)],
            })
            .then((result) =>
                signal?.aborted || result.data.failed
                    ? null
                    : result.data.profiles,
            )
            .finally(() => pending.delete(key));
        pending.set(key, task);
        return task;
    };
}

/** @param {object} options Mutable editor state, preparation, saving, completion and rendering. @returns {Promise<boolean>} Whether the layout was persisted. */
export async function commitLayoutEdit({
    state,
    prepare,
    save,
    finish,
    render,
}) {
    if (state.saving) return false;
    const previous = structuredClone(state.layout);
    const container = state.container ?? state.contentGrid;
    const wasInert = container?.inert;
    state.saving = true;
    if (container) container.inert = true;
    if (state.elementsPanel) state.elementsPanel.inert = true;
    try {
        prepare();
        if (!(await save())) {
            state.layout = previous;
            return false;
        }
        state.layoutSnapshot = structuredClone(state.layout);
        if (finish) {
            state.editing = false;
            finish();
        }
        return true;
    } finally {
        state.saving = false;
        if (container) container.inert = wasInert;
        if (state.elementsPanel) state.elementsPanel.inert = false;
        if (!state.signal?.aborted) render();
    }
}
