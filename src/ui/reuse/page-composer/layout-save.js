/**
 * Coordinates staged layout persistence, localized feedback and editor commits.
 *
 * Public exports:
 *   createLayoutSaveHandler(options) — coalesces writes and returns profiles or null.
 *   commitLayoutEdit(options) — guards a save and retains edits on a false result.
 *
 * Usage:
 *   const update = createLayoutSaveHandler({ ctx, save: persistence.saveLayoutByKey,
 *     notify: showToast, i18n, signal: pageLifetime.signal });
 *   await commitLayoutEdit({ state, prepare: compactPlacements,
 *     save: async () => {
 *       const profiles = await update(preferenceKey, state.layoutProfiles,
 *         state.gridCols, state.layout);
 *       if (profiles === null) return false;
 *       state.layoutProfiles = profiles;
 *       return true;
 *     }, finish: endEditMode, render: renderGrid });
 */
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
        const log = (...argumentsList) =>
            ctx.capabilities.get("ui:log")?.(...argumentsList);
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

/**
 * Registers the shared save flow once per ctx; each returned handler owns pending writes.
 * Persistence must resolve with updated layout profiles and reject on failed writes.
 * Calls sharing a pending preference key share its promise and first layout snapshot.
 * Persistence failures resolve to null after feedback; flow/translation failures reject.
 *
 * @param {object} options Injected persistence, feedback and lifetime dependencies.
 * @param {object} options.ctx Host with flowExists/registerFlow/extendFlow/runFlow and capabilities.
 * @param {function(string, object, number, object, AbortSignal=): Promise<object>} options.save Raw persistence operation.
 * @param {function(string, object): void} options.notify Localized toast presenter.
 * @param {{t: function(string): string}} options.i18n Translation lookup, including save feedback keys.
 * @param {AbortSignal} [options.signal] Page lifetime; cancels requests and suppresses late feedback.
 * @returns {function(string, object, number, object): Promise<object|null>} Save(key, profiles, columns, layout); updated profiles on success, null on persistence failure/cancellation.
 */
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

/**
 * Prepares and commits the live editor layout while its controls are inert.
 * A false save restores the pre-prepare layout and keeps editing active. Success
 * updates layoutSnapshot; supplying finish also exits edit mode. Unexpected callback
 * errors propagate, with interaction restored in finally. Save should handle expected
 * persistence errors and return false, as in the module example.
 *
 * @param {object} options Editor state and callbacks operating on that same state.
 * @param {object} options.state Mutable state with cloneable layout, editing and saving flags; receives layoutSnapshot.
 * @param {HTMLElement} [options.state.container] Nested grid; otherwise contentGrid is used.
 * @param {HTMLElement} [options.state.contentGrid] Main grid made inert while saving.
 * @param {HTMLElement} [options.state.elementsPanel] Current panel made inert while saving.
 * @param {AbortSignal} [options.state.signal] Suppresses rendering after page cancellation.
 * @param {function(): void} options.prepare Synchronous compaction or reset of state.layout.
 * @param {function(): Promise<boolean>} options.save True only after successful persistence; updates owner profiles.
 * @param {function(): void} [options.finish] End edit-mode effects; omit for Reset to remain in edit mode.
 * @param {function(): void} options.render Rebuilds from state after settlement unless the page ended.
 * @returns {Promise<boolean>} True after persistence, false for a pending commit or a false save result.
 */
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
