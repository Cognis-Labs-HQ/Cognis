/**
 * Owns save acknowledgement, protected drafts and pending layout controls.
 * Export: createLayoutEditSession supplies save, discard and teardown actions.
 * @example const session = createLayoutEditSession(options); await session.save();
 * @param {object} options State, persistence, rendering and lifetime callbacks.
 * @returns {object} One editor's save and discard lifecycle.
 */
import { showToast } from "../toast.js";
import { freezeLayoutControls } from "./save-controls.js";

export function createLayoutEditSession({
    state,
    i18n,
    saveLayoutByKey,
    cloneLayoutData,
    compact,
    initialize,
    render,
    endEditMode,
    getControls,
    isMounted,
    log,
}) {
    let disposed = false;
    let releaseControls = null;
    let feedbackKey = null;
    let dismissFeedbackToast = null;

    function dismissFeedback() {
        const dismiss = dismissFeedbackToast;
        dismissFeedbackToast = null;
        dismiss?.();
    }

    function syncControls() {
        const mounted = !disposed && isMounted();
        if (!mounted || !state.editing) dismissFeedback();
        if (disposed || !state.editing) feedbackKey = null;
        releaseControls?.();
        releaseControls =
            state.savePending && mounted
                ? freezeLayoutControls({
                      ...getControls(),
                      label: i18n.t("ui.reuse.saving"),
                  })
                : null;
        if (feedbackKey && mounted) {
            const message = i18n.t(feedbackKey);
            feedbackKey = null;
            dismissFeedback();
            dismissFeedbackToast = showToast(message, { variant: "error" });
        }
    }

    async function save({ reset = false } = {}) {
        if (disposed || state.savePending || !state.editing) return;
        feedbackKey = null;
        dismissFeedback();
        const metadata = {
            component: "page-composer",
            operation: reset ? "resetLayout" : "saveLayout",
            preferenceKey: state.preferenceKey,
        };
        state.savePending = true;
        let submittedLayout;
        let profiles;
        let failure;
        let requested = false;
        let acknowledged = false;
        try {
            if (reset) {
                state.layout = { placements: [], hidden: [] };
                initialize();
                render();
            } else {
                compact();
            }
            syncControls();
            submittedLayout = cloneLayoutData(state.layout);
            metadata.columns = state.gridCols;
            log?.("info", "Layout save submitted.", metadata);
            requested = true;
            profiles = await saveLayoutByKey(
                state.preferenceKey,
                state.layoutProfiles,
                metadata.columns,
                submittedLayout,
            );
            acknowledged = true;
        } catch (error) {
            failure = error;
        }
        if (disposed) return;
        state.savePending = false;
        syncControls();
        if (!acknowledged) {
            const outcome =
                failure?.layoutSaveOutcome ??
                (requested ? "unknown" : "preparation");
            log?.("error", "Layout save was not acknowledged.", {
                ...metadata,
                outcome,
                status: failure?.status,
            });
            feedbackKey =
                outcome === "rejected" || outcome === "preparation"
                    ? "ui.reuse.layout_save_rejected"
                    : outcome === "unavailable"
                      ? "ui.reuse.layout_save_unavailable"
                      : "ui.reuse.layout_save_unconfirmed";
            syncControls();
            return;
        }
        state.layoutProfiles = profiles;
        state.layout = cloneLayoutData(submittedLayout);
        state.layoutSnapshot = cloneLayoutData(submittedLayout);
        if (!reset) {
            state.editing = false;
            endEditMode();
        }
        log?.("info", "Layout save acknowledged.", metadata);
        if (isMounted()) render();
    }

    function discard() {
        if (disposed || state.savePending || !state.editing) return;
        feedbackKey = null;
        dismissFeedback();
        state.layout = cloneLayoutData(state.layoutSnapshot);
        state.editing = false;
        endEditMode();
        if (isMounted()) render();
    }

    function destroy() {
        if (disposed) return;
        disposed = true;
        feedbackKey = null;
        dismissFeedback();
        releaseControls?.();
        releaseControls = null;
        state.savePending = false;
        if (state.editing) {
            state.editing = false;
            endEditMode();
        }
    }

    return { save, discard, syncControls, destroy };
}
