/**
 * Creates a reusable "unsaved changes" floating toolbar controller.
 *
 * The floating toolbar element must contain:
 *   - A button with data-action="save"   → triggers onSave
 *   - A button with data-action="discard" → triggers onDiscard
 *
 * Public exports:
 *   createUnsavedChangesBar(floatingEl, options) — tracks dirty flags and
 *     optionally toggles the floating save/discard controls.
 *   createFormDirtyTracker(rootElement, options) — tracks form field changes
 *     against their initial values using the shared dirty-state controller.
 *
 * Usage:
 *   const bar = createUnsavedChangesBar(floatingEl, {
 *     onSave:    async () => { ... write prefs ... },
 *     onDiscard: ()     => { ... revert each tracker ... },
 *   });
 *
 *   // Tell the bar which field is dirty:
 *   bar.markDirty('font', true);
 *   bar.markDirty('font', false);
 *
 * @param {HTMLElement|null} floatingEl
 * @param {{ onSave?: () => Promise<void>, onDiscard?: () => void, quiet?: boolean, confirmMessage?: string, openConfirmation?: () => Promise<string|null> }} options
 * @returns {{ markDirty(id: string, dirty: boolean): void, isAnyDirty(): boolean, sync: () => void, destroy: () => void }}
 */
import { escapeHtml } from "./escape-html.js";
import { createI18n } from "./i18n.js";

async function openDefaultNavigationConfirmation(confirmMessage) {
    const [{ openPopup }, i18n] = await Promise.all([
        import("./popup.js"),
        createI18n(),
    ]);
    return openPopup({
        title: i18n.t("ui.reuse.unsaved_changes"),
        body: `<p>${escapeHtml(confirmMessage ?? i18n.t("ui.reuse.leave_page_warning"))}</p>`,
        variant: "warning",
        actions: [
            {
                id: "stay",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
            {
                id: "discard",
                label: i18n.t("ui.reuse.discard_and_leave"),
                variant: "cancel",
            },
        ],
    });
}

export function createUnsavedChangesBar(
    floatingEl,
    { onSave, onDiscard, quiet = false, confirmMessage, openConfirmation } = {},
) {
    const dirtyMap = new Map();
    let navigationDecisionPending = false;

    const confirmNavigation = (event) => {
        if (!isAnyDirty()) return;
        event.preventDefault();
        event.returnValue = "";
    };

    const showSpaNavigationDecision = async (resumeNavigation) => {
        try {
            const action = openConfirmation
                ? await openConfirmation()
                : await openDefaultNavigationConfirmation(confirmMessage);
            if (action !== "discard") return;
            dirtyMap.clear();
            sync();
            destroy();
            await resumeNavigation?.();
        } finally {
            navigationDecisionPending = false;
        }
    };

    const confirmSpaNavigation = (event) => {
        if (!isAnyDirty()) {
            destroy();
            return;
        }
        event.preventDefault();
        if (navigationDecisionPending) return;
        navigationDecisionPending = true;
        void showSpaNavigationDecision(event.detail?.resume);
    };
    globalThis.window?.addEventListener?.("beforeunload", confirmNavigation);
    globalThis.window?.addEventListener?.(
        "cognis:route-before-navigate",
        confirmSpaNavigation,
    );

    function isAnyDirty() {
        for (const isDirty of dirtyMap.values()) {
            if (isDirty) return true;
        }
        return false;
    }

    function sync() {
        if (!floatingEl) return;
        if (quiet) {
            floatingEl.hidden = true;
            return;
        }
        floatingEl.hidden = !isAnyDirty();
    }

    function markDirty(id, dirty) {
        dirtyMap.set(id, dirty);
        sync();
    }

    floatingEl
        ?.querySelector('[data-action="save"]')
        ?.addEventListener("click", async () => {
            try {
                await onSave?.();
                dirtyMap.clear();
                sync();
            } catch {
                // save failed — keep bar visible
            }
        });

    floatingEl
        ?.querySelector('[data-action="discard"]')
        ?.addEventListener("click", () => {
            onDiscard?.();
            dirtyMap.clear();
            sync();
        });

    function destroy() {
        globalThis.window?.removeEventListener?.(
            "beforeunload",
            confirmNavigation,
        );
        globalThis.window?.removeEventListener?.(
            "cognis:route-before-navigate",
            confirmSpaNavigation,
        );
    }

    return { markDirty, isAnyDirty, sync, destroy };
}

/**
 * CSS selector for user-editable data fields.
 *
 * Hidden and action-style inputs are excluded because they do not represent
 * direct popup content edits and would otherwise create false-positive dirty
 * states during close-protection checks.
 */
const TRACKED_FIELD_SELECTOR = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="image"])',
    "textarea",
    "select",
].join(", ");

/**
 * Builds a stable tracked-field identifier from the field metadata and index.
 *
 * The index suffix keeps repeated names or unnamed fields unique within the
 * same tracked form.
 *
 * @param {HTMLElement} field
 * @param {number} index
 * @returns {string}
 */
function getTrackedFieldId(field, index) {
    const fallbackTag = String(field?.tagName ?? "field").toLowerCase();
    const fieldName = String(field?.name ?? field?.id ?? "").trim();
    const baseId = fieldName || fallbackTag;
    return `${baseId}-${index}`;
}

/**
 * Serializes a field's current state for dirty comparisons.
 *
 * Different field types need different representations: checkboxes/radios use
 * checked state, file inputs serialize the current file list, multi-selects
 * serialize selected option values, and text-like fields use their value.
 *
 * @param {HTMLElement} field
 * @returns {string}
 */
function readTrackedFieldState(field) {
    const tagName = String(field?.tagName ?? "").toUpperCase();
    if (tagName === "INPUT") {
        const inputType = String(field?.type ?? "").toLowerCase();
        if (inputType === "checkbox" || inputType === "radio") {
            return field?.checked === true ? "checked" : "unchecked";
        }
        if (inputType === "file") {
            return Array.from(field?.files ?? [])
                .map(
                    (file) =>
                        `${file?.name ?? ""}:${file?.size ?? 0}:${file?.lastModified ?? 0}`,
                )
                .join("\n");
        }
    }
    if (tagName === "SELECT" && field?.multiple === true) {
        return Array.from(field?.selectedOptions ?? [])
            .map((option) => String(option?.value ?? ""))
            .join("\n");
    }
    return String(field?.value ?? "");
}

/**
 * Tracks whether any form field inside the root element has diverged from its
 * initial value using the shared unsaved-changes controller.
 *
 * @param {HTMLElement|null} rootElement
 * @param {{ floatingEl?: HTMLElement|null, quiet?: boolean }} options - Pass
 *   floatingEl only when you want the shared save/discard controls to appear;
 *   quiet mode ignores the floating element and keeps tracking silent.
 * @returns {{ isAnyDirty: () => boolean, sync: () => void, destroy: () => void }}
 */
export function createFormDirtyTracker(
    rootElement,
    { floatingEl = null, quiet = false } = {},
) {
    const changesBar = createUnsavedChangesBar(floatingEl, { quiet });
    if (!(rootElement?.querySelectorAll instanceof Function)) {
        return {
            isAnyDirty: changesBar.isAnyDirty,
            sync: changesBar.sync,
            destroy: () => undefined,
        };
    }

    const trackedFields = Array.from(
        rootElement.querySelectorAll(TRACKED_FIELD_SELECTOR),
    );
    const initialFieldValues = new Map(
        trackedFields.map((field, index) => [
            getTrackedFieldId(field, index),
            readTrackedFieldState(field),
        ]),
    );

    function sync() {
        trackedFields.forEach((field, index) => {
            const fieldId = getTrackedFieldId(field, index);
            changesBar.markDirty(
                fieldId,
                readTrackedFieldState(field) !==
                    initialFieldValues.get(fieldId),
            );
        });
    }

    const handleFieldChange = () => {
        sync();
    };
    trackedFields.forEach((field) => {
        field.addEventListener?.("input", handleFieldChange);
        field.addEventListener?.("change", handleFieldChange);
    });
    const cleanupEntries = trackedFields.flatMap((field) => [
        [field, "input", handleFieldChange],
        [field, "change", handleFieldChange],
    ]);

    sync();

    return {
        isAnyDirty: changesBar.isAnyDirty,
        sync,
        destroy() {
            changesBar.destroy();
            cleanupEntries.forEach(([field, eventName, handler]) => {
                field.removeEventListener?.(eventName, handler);
            });
        },
    };
}
