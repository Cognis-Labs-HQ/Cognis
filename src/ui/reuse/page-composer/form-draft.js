/**
 * Form draft helpers for page composer content areas.
 *
 * Public exports:
 *   createFormDraftManager(deps) — returns helpers for capturing,
 *     restoring, persisting, and resetting non-sensitive form drafts.
 *
 * Usage:
 *   const drafts = createFormDraftManager({ FORM_DRAFT_STORAGE_PREFIX: 'cognis_form_draft', LARGE_FORM_RESET_FIELD_THRESHOLD: 6, i18n });
 *
 * @param {object} deps
 * @returns {object}
 */
export function createFormDraftManager({
    FORM_DRAFT_STORAGE_PREFIX,
    LARGE_FORM_RESET_FIELD_THRESHOLD,
    i18n,
}) {
    function getFormFieldKey(field, fieldIndex) {
        return field.name
            ? `name:${field.name}`
            : field.id
              ? `id:${field.id}`
              : `pos:${fieldIndex}`;
    }

    function isSensitiveDraftField(field) {
        const fieldType = String(field.type ?? "").toLowerCase();
        if (
            fieldType === "password" ||
            fieldType === "file" ||
            fieldType === "hidden"
        ) {
            return true;
        }
        const fingerprint = `${field.name ?? ""} ${field.id ?? ""}`;
        return /(^|[\W_])(password|passphrase|secret|token|api[_-]?key|auth[_-]?code)([\W_]|$)/i.test(
            fingerprint,
        );
    }

    function isIncludedInFormMemory(field) {
        if (!(field instanceof Element)) {
            return false;
        }
        return (
            field.closest('[data-composer-include-form-memory="true"]') !== null
        );
    }

    function readFormFieldValue(field) {
        if (field.type === "checkbox" || field.type === "radio") {
            return field.checked;
        }
        return field.value;
    }

    function writeFormFieldValue(field, value) {
        if (field.type === "file") {
            return;
        }
        if (field.type === "checkbox" || field.type === "radio") {
            field.checked = Boolean(value);
            return;
        }
        field.value = typeof value === "string" ? value : "";
    }

    /**
     * @param {Element} container
     * @param {{ persistableOnly?: boolean }} [options]
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function captureFormState(container, options = {}) {
        const { persistableOnly = false } = options;
        const snapshot = new Map();
        container
            .querySelectorAll("[data-composer-element]")
            .forEach((card) => {
                const elementId = card.dataset.composerElement;
                if (!elementId) return;
                const fields = card.querySelectorAll("input, textarea, select");
                if (fields.length === 0) return;
                const fieldMap = new Map();
                fields.forEach((field, fieldIndex) => {
                    if (field.type === "file") {
                        return;
                    }
                    if (persistableOnly && !isIncludedInFormMemory(field)) {
                        return;
                    }
                    if (persistableOnly && isSensitiveDraftField(field)) {
                        return;
                    }
                    const key = getFormFieldKey(field, fieldIndex);
                    fieldMap.set(key, readFormFieldValue(field));
                });
                if (fieldMap.size > 0) {
                    snapshot.set(elementId, fieldMap);
                }
            });
        return snapshot;
    }

    /**
     * @param {Element} container
     * @param {Map<string, Map<string, (string|boolean)>>} snapshot
     */
    function restoreFormState(container, snapshot) {
        if (!snapshot || snapshot.size === 0) return;
        container
            .querySelectorAll("[data-composer-element]")
            .forEach((card) => {
                const elementId = card.dataset.composerElement;
                if (!elementId) return;
                const fieldMap = snapshot.get(elementId);
                if (!fieldMap) return;
                card.querySelectorAll("input, textarea, select").forEach(
                    (field, fieldIndex) => {
                        const key = getFormFieldKey(field, fieldIndex);
                        if (!fieldMap.has(key)) return;
                        writeFormFieldValue(field, fieldMap.get(key));
                    },
                );
            });
    }

    /**
     * @param {Map<string, Map<string, (string|boolean)>>} source
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function cloneFormStateSnapshot(source) {
        if (!source || source.size === 0) return new Map();
        const clone = new Map();
        source.forEach((fieldMap, elementId) => {
            clone.set(elementId, new Map(fieldMap));
        });
        return clone;
    }

    /**
     * @param {Map<string, Map<string, (string|boolean)>>} baseSnapshot
     * @param {Map<string, Map<string, (string|boolean)>>} overrideSnapshot
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function mergeFormStateSnapshots(baseSnapshot, overrideSnapshot) {
        const merged = cloneFormStateSnapshot(baseSnapshot);
        if (!overrideSnapshot || overrideSnapshot.size === 0) {
            return merged;
        }
        overrideSnapshot.forEach((fieldMap, elementId) => {
            const mergedFieldMap = new Map(merged.get(elementId) ?? []);
            fieldMap.forEach((value, fieldKey) => {
                mergedFieldMap.set(fieldKey, value);
            });
            if (mergedFieldMap.size > 0) {
                merged.set(elementId, mergedFieldMap);
            }
        });
        return merged;
    }

    /**
     * @param {Map<string, Map<string, (string|boolean)>>} snapshot
     * @returns {Record<string, Record<string, (string|boolean)>>}
     */
    function serializeFormStateSnapshot(snapshot) {
        const serialized = {};
        if (!snapshot || snapshot.size === 0) {
            return serialized;
        }
        snapshot.forEach((fieldMap, elementId) => {
            const record = {};
            fieldMap.forEach((value, fieldKey) => {
                record[fieldKey] = value;
            });
            if (Object.keys(record).length > 0) {
                serialized[elementId] = record;
            }
        });
        return serialized;
    }

    /**
     * @param {unknown} rawValue
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function deserializeFormStateSnapshot(rawValue) {
        if (
            !rawValue ||
            typeof rawValue !== "object" ||
            Array.isArray(rawValue)
        ) {
            return new Map();
        }
        const snapshot = new Map();
        for (const [elementId, fieldValue] of Object.entries(rawValue)) {
            if (
                !fieldValue ||
                typeof fieldValue !== "object" ||
                Array.isArray(fieldValue)
            ) {
                continue;
            }
            const fieldMap = new Map();
            for (const [fieldKey, value] of Object.entries(fieldValue)) {
                if (typeof value === "string" || typeof value === "boolean") {
                    fieldMap.set(fieldKey, value);
                }
            }
            if (fieldMap.size > 0) {
                snapshot.set(elementId, fieldMap);
            }
        }
        return snapshot;
    }

    function getDraftStorageScope(scopeKey) {
        const account = localStorage.getItem("cognis_account");
        if (!account || !scopeKey) {
            return null;
        }
        const pagePath = window.location.pathname || "";
        return `${FORM_DRAFT_STORAGE_PREFIX}:${account}:${pagePath}:${scopeKey}`;
    }

    function loadPersistedFormState(scopeKey) {
        const storageScope = getDraftStorageScope(scopeKey);
        if (!storageScope) {
            return new Map();
        }
        try {
            const raw = localStorage.getItem(storageScope);
            if (!raw) return new Map();
            return deserializeFormStateSnapshot(JSON.parse(raw));
        } catch {
            return new Map();
        }
    }

    function savePersistedFormState(scopeKey, snapshot) {
        const storageScope = getDraftStorageScope(scopeKey);
        if (!storageScope) {
            return;
        }
        const serialized = serializeFormStateSnapshot(snapshot);
        if (Object.keys(serialized).length === 0) {
            localStorage.removeItem(storageScope);
            return;
        }
        localStorage.setItem(storageScope, JSON.stringify(serialized));
    }

    function clearPersistedFormState(scopeKey, elementId = null) {
        const storageScope = getDraftStorageScope(scopeKey);
        if (!storageScope) {
            return;
        }
        if (!elementId) {
            localStorage.removeItem(storageScope);
            return;
        }
        const nextSnapshot = loadPersistedFormState(scopeKey);
        nextSnapshot.delete(elementId);
        savePersistedFormState(scopeKey, nextSnapshot);
    }

    function resetFormFieldsInCard(card) {
        card.querySelectorAll("input, textarea, select").forEach((field) => {
            if (field.type === "file") return;
            if (field.type === "checkbox" || field.type === "radio") {
                field.checked = field.defaultChecked;
                return;
            }
            const defaultValue =
                typeof field.defaultValue === "string"
                    ? field.defaultValue
                    : "";
            field.value = defaultValue;
        });
    }

    function bindDraftResetButton(card, scopeKey) {
        const fields = Array.from(
            card.querySelectorAll("input, textarea, select"),
        );
        const persistableFields = fields.filter(
            (field) =>
                !isSensitiveDraftField(field) &&
                field.type !== "file" &&
                isIncludedInFormMemory(field),
        );
        if (persistableFields.length < LARGE_FORM_RESET_FIELD_THRESHOLD) {
            card.querySelector("[data-composer-draft-reset-wrapper]")?.remove();
            return;
        }
        if (card.querySelector("[data-composer-draft-reset-wrapper]")) {
            return;
        }
        const elementId = card.dataset.composerElement;
        if (!elementId) return;
        const wrapper = document.createElement("div");
        wrapper.className = "composer-form-draft-actions";
        wrapper.dataset.composerDraftResetWrapper = "true";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "composer-form-draft-reset-btn";
        button.textContent = `↺ ${i18n.t("ui.reuse.reset_draft")}`;
        button.setAttribute("aria-label", i18n.t("ui.reuse.reset_draft"));
        button.addEventListener("click", () => {
            resetFormFieldsInCard(card);
            clearPersistedFormState(scopeKey, elementId);
        });
        wrapper.appendChild(button);
        const firstForm = card.querySelector("form");
        if (firstForm) {
            firstForm.appendChild(wrapper);
        } else {
            card.appendChild(wrapper);
        }
    }

    function bindFormDraftPersistence(container, scopeKey) {
        if (!scopeKey) return;
        const persistDraftSnapshot = () => {
            const snapshot = captureFormState(container, {
                persistableOnly: true,
            });
            savePersistedFormState(scopeKey, snapshot);
        };
        container
            .querySelectorAll("[data-composer-element]")
            .forEach((card) => {
                const elementId = card.dataset.composerElement;
                if (!elementId) return;
                card.querySelectorAll("input, textarea, select").forEach(
                    (field) => {
                        if (field.type === "file") return;
                        if (!isIncludedInFormMemory(field)) return;
                        field.addEventListener("input", persistDraftSnapshot);
                        field.addEventListener("change", persistDraftSnapshot);
                    },
                );
                card.querySelectorAll("form").forEach((form) => {
                    form.addEventListener("submit", () => {
                        clearPersistedFormState(scopeKey, elementId);
                    });
                });
                bindDraftResetButton(card, scopeKey);
            });
        persistDraftSnapshot();
    }

    return {
        captureFormState,
        restoreFormState,
        cloneFormStateSnapshot,
        mergeFormStateSnapshots,
        loadPersistedFormState,
        savePersistedFormState,
        clearPersistedFormState,
        bindFormDraftPersistence,
    };
}
