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
 * @param {{ onSave?: () => Promise<void>, onDiscard?: () => void, quiet?: boolean }} options
 * @returns {{ markDirty(id: string, dirty: boolean): void, isAnyDirty(): boolean, sync: () => void }}
 */
export function createUnsavedChangesBar(
    floatingEl,
    { onSave, onDiscard, quiet = false } = {},
) {
    const dirtyMap = new Map();

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

    return { markDirty, isAnyDirty, sync };
}

const TRACKED_FIELD_SELECTOR = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="image"])',
    "textarea",
    "select",
].join(", ");

function getTrackedFieldId(field, index) {
    const fallbackTag = String(field?.tagName ?? "field").toLowerCase();
    const fieldName = String(field?.name ?? field?.id ?? "").trim();
    const baseId = fieldName || fallbackTag;
    return `${baseId}-${index}`;
}

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
 * @param {{ floatingEl?: HTMLElement|null, quiet?: boolean }} options
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
    const cleanupEntries = trackedFields.flatMap((field) => {
        field.addEventListener?.("input", handleFieldChange);
        field.addEventListener?.("change", handleFieldChange);
        return [
            [field, "input", handleFieldChange],
            [field, "change", handleFieldChange],
        ];
    });

    sync();

    return {
        isAnyDirty: changesBar.isAnyDirty,
        sync,
        destroy() {
            cleanupEntries.forEach(([field, eventName, handler]) => {
                field.removeEventListener?.(eventName, handler);
            });
        },
    };
}
