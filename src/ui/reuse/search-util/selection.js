/**
 * Owns Search callback execution and outcome presentation.
 * Exports: selectSearchResult — dispatch one selection through the Search flow.
 * @example selectSearchResult(item, onSelect, close, { signal, setPending });
 */
import { uiCtx } from "../ui-ctx.js";
import { createI18n } from "../i18n.js";
import { showToast } from "../toast.js";
import { captureAccountGuard } from "../offline-identity.js";
import { search } from "./capability.js";

const FLOW = "ui:searchSelection";
const owners = new WeakMap();

function log(level, message, metadata = {}) {
    const details = {
        component: "ui.search",
        operation: "select",
        ...metadata,
    };
    const logger = uiCtx.capabilities.get("ui:log");
    if (logger) logger(level, message, details);
    else console[level](message, details);
}

if (!uiCtx.flowExists(FLOW)) {
    uiCtx.registerFlow(FLOW, ["before", "execute", "after"]);
    uiCtx.extendFlow(FLOW, "execute", { id: FLOW }, async ({ input, data }) => {
        input.assertCurrent();
        data.result = await input.onSelect?.(input.item, {
            signal: input.signal,
        });
    });
}

function isCurrent(state, signal) {
    if (state.invalidated || signal?.aborted) return false;
    try {
        state.assertCurrent?.();
        return true;
    } catch {
        state.invalidated = true;
        state.invalidate?.();
        log("info", "Search selection ownership expired.");
        return false;
    }
}

/**
 * Executes a single result or selected batch, retaining the surface on false or error.
 * @param {object|object[]} item Selected result or batch.
 * @param {Function|undefined} onSelect Consumer callback; false keeps Search open.
 * @param {Function} closeOverlay Owner dismissal operation.
 * @param {object} [state] Optional lifetime, pending presentation and ownership guard.
 * @returns {Promise<boolean>} Whether the current selection completed and closed.
 */
export async function selectSearchResult(item, onSelect, closeOverlay, state) {
    const standalone = !state;
    if (!state) {
        state = owners.get(closeOverlay);
        if (!state) {
            state = {
                assertCurrent: captureAccountGuard(),
                invalidate: closeOverlay,
            };
            owners.set(closeOverlay, state);
        }
    }
    if (state.pending || state.completed || !isCurrent(state, state.signal))
        return false;
    const providerSignal = search.selectionSignal(item);
    const signal = AbortSignal.any([
        providerSignal,
        ...(state.signal ? [state.signal] : []),
    ]);
    const assertCurrent = () => {
        signal.throwIfAborted();
        state.assertCurrent?.();
    };
    state.pending = true;
    state.setPending?.(true);
    log("info", "Search selection started.", { multiple: Array.isArray(item) });
    try {
        if (providerSignal.aborted) {
            const i18n = await createI18n({ persistLocale: false });
            if (isCurrent(state, state.signal))
                showToast(i18n.t("ui.search.selection_unavailable"), {
                    variant: "info",
                });
            return false;
        }
        const outcome = await uiCtx.runFlow(FLOW, {
            item,
            onSelect,
            signal,
            assertCurrent,
        });
        if (!isCurrent(state, signal)) return false;
        if (outcome.data.result === false) {
            log("info", "Search selection kept open.");
            return false;
        }
        state.completed = true;
        closeOverlay();
        log("info", "Search selection completed.");
        return true;
    } catch (error) {
        if (!isCurrent(state, signal)) return false;
        log("error", "Search selection failed.", { outcome: "rejected" });
        const i18n = await createI18n({ persistLocale: false });
        if (isCurrent(state, signal))
            showToast(i18n.t("ui.search.selection_failed"), {
                variant: "error",
            });
        return false;
    } finally {
        if (standalone && owners.get(closeOverlay) === state)
            owners.delete(closeOverlay);
        state.pending = false;
        if (isCurrent(state, state.signal)) state.setPending?.(false);
    }
}
