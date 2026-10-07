import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    bindTabbedFormValidation,
    createFormBuilder,
} from "/static/reuse/form-builder.js";
import {
    appendHorizontalCarouselItem,
    renderHorizontalCarousel,
} from "/static/reuse/horizontal-carousel.js";
import { renderCompositionInput } from "/static/reuse/composition-input.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { reportClientError } from "/static/reuse/error-reporting.js";
import {
    requestLibraryUpdate,
    updateLibraryEntry,
} from "/static/gateways/study/ui/library-client.js";
import {
    definitionText,
    layerForEntry,
    localizedLabel,
} from "../presentation.js";
import { canCreateLayerEntries, entryEditMode } from "../editability.js";
import {
    mountEditableRelationshipCarousels,
    pronunciationRelationshipsFor,
} from "../pronunciation-editor.js";
import {
    applyDerivedPronunciation,
    resolveComposerContract,
} from "../composer-contract.js";
import {
    composerLimitViolation,
    LIBRARY_COMPOSER_LIMITS,
} from "../composer-limits.js";
import {
    bindComposerExtras,
    renderComposerExtras,
} from "../composer-extras.js";
import {
    compositionTokenEntryId,
    compositionTokenLabel,
    restoreCompositionTokens,
    transformationTokenDetails,
} from "../composition-tokens.js";

export { inputForField } from "../field-input.js";
import { inputForField, renderStrokePatternPreviews } from "../field-input.js";
import { transformationPathways } from "../transformations.js";

import {
    editorBody,
    readFields,
    readReferences,
    readReferenceGroups,
    validateRequiredRelationships,
} from "./editor-body.js";
export {
    editorBody,
    readFields,
    readReferences,
    readReferenceGroups,
    validateRequiredRelationships,
} from "./editor-body.js";

function showComposerLimitViolation(form, layer, schema, i18n) {
    const violation = composerLimitViolation(form, layer, schema);
    if (!violation) return false;
    const [messageKey, limitName] = violation;
    showToast(
        i18n
            .t(messageKey)
            .replace("{{ count }}", String(LIBRARY_COMPOSER_LIMITS[limitName])),
        { variant: "error" },
    );
    return true;
}

function showLibraryMutationError(error, i18n) {
    const code = error instanceof Error ? error.message : "update_failed";
    const messageKey = code.startsWith("field_reference_group_mismatch:")
        ? "gateway.study.library_pronunciation_group_error"
        : code === "reference_visibility_too_low"
          ? "gateway.study.library_dependency_scope_help"
          : code.startsWith("relationship_") ||
              code === "reference_not_found" ||
              code === "invalid_relationship_target"
            ? "gateway.study.library_relationship_error"
            : "gateway.study.library_update_error";
    showToast(i18n.t(messageKey), { variant: "error" });
}

async function completeLibraryMutation({
    entry,
    updated,
    synchronize,
    successKey,
    i18n,
    assignUpdated = true,
}) {
    if (assignUpdated) Object.assign(entry, updated);
    try {
        await synchronize(updated);
    } catch (error) {
        reportClientError({
            component: "study-library",
            operation: "synchronize-entry-update",
            entryId: entry.id,
            error: error instanceof Error ? error.message : String(error),
        });
        showToast(i18n.t("gateway.study.library_update_refresh_warning"), {
            variant: "warning",
        });
        return;
    }
    showToast(i18n.t(successKey), { variant: "success" });
}

export function bindLibraryEditorControls(
    form,
    entry,
    i18n,
    { maxTags = Number.POSITIVE_INFINITY } = {},
) {
    form.querySelectorAll("[data-library-provider-field]").forEach(
        (control) => {
            const fieldId = control.name.slice("field:".length);
            control.libraryFieldValue = entry.fields?.[fieldId];
        },
    );
    const tabValidation = bindTabbedFormValidation(form, {
        invalidClassName: "library-editor-tab--required",
        resolveFocusTarget: (invalid, panelId) =>
            panelId === "definitions"
                ? form.querySelector("[data-library-add-definition]")
                : invalid,
    });
    form.revealFirstInvalidField = tabValidation.revealFirstInvalid;
    form.querySelectorAll("select[multiple]").forEach((select) => {
        select.addEventListener("mousedown", (event) => {
            if (event.target.tagName !== "OPTION") return;
            event.preventDefault();
            event.target.selected = !event.target.selected;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
    });
    form.querySelectorAll("[data-library-audio-field]").forEach((field) => {
        const client = uiCtx.capabilities.get("files:uiClient");
        const stored = field.querySelector('input[type="hidden"]');
        const picker = field.querySelector('input[type="file"]');
        const filename = field.querySelector("[data-library-audio-filename]");
        if (!client) return;
        picker.addEventListener("change", async () => {
            const file = picker.files?.[0];
            if (!file) return;
            const identity = entry.id || crypto.randomUUID();
            const normalizedFilename = `${identity}-${field.dataset.fieldId}.audio`;
            const key = `${field.dataset.prefix}${normalizedFilename}`;
            field.dataset.uploading = "true";
            picker.disabled = true;
            try {
                await client.uploadAudio(field.dataset.namespace, key, file);
                stored.value = `file:${key}`;
                filename.textContent = normalizedFilename;
                filename.hidden = false;
                showToast(
                    i18n.t("gateway.study.library_audio_upload_success"),
                    {
                        variant: "success",
                    },
                );
            } catch {
                showToast(i18n.t("gateway.study.library_audio_upload_error"), {
                    variant: "error",
                });
            } finally {
                delete field.dataset.uploading;
                picker.disabled = false;
            }
        });
    });
    renderStrokePatternPreviews(form);
    form.querySelectorAll("[data-library-entry-tags]").forEach((field) => {
        const input = field.querySelector("[data-library-tag-input]");
        const hidden = field.querySelector('input[type="hidden"]');
        const list = field.querySelector(".library-tag-list");
        form.setLibraryTags = (tags) => {
            hidden.value = tags.join("\u001f");
            list.innerHTML = tags
                .map(
                    (value) =>
                        `<button type="button" class="btn-neutral" data-library-tag="${escapeHtml(value)}">${escapeHtml(value)} ×</button>`,
                )
                .join("");
        };
        const values = () =>
            Array.from(
                list.querySelectorAll("[data-library-tag]"),
                (tag) => tag.dataset.libraryTag,
            );
        list.addEventListener("click", (event) => {
            const tag = event.target.closest("[data-library-tag]");
            if (!tag) return;
            tag.remove();
            hidden.value = values().join("\u001f");
        });
        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            const value = input.value.trim();
            if (!value || values().includes(value)) return;
            if (values().length >= maxTags) {
                showToast(
                    i18n
                        .t("gateway.study.library_tag_limit")
                        .replace("{{ count }}", String(maxTags)),
                    { variant: "error" },
                );
                return;
            }
            const tag = document.createElement("button");
            tag.type = "button";
            tag.className = "btn-neutral";
            tag.dataset.libraryTag = value;
            tag.textContent = `${value} ×`;
            list.append(tag);
            hidden.value = values().join("\u001f");
            input.value = "";
        });
    });
}

function syncGeneratedCardLabel(form, inputCarouselIds, entries) {
    if (!inputCarouselIds.size) return;
    const selected = new Set(
        Array.from(inputCarouselIds).flatMap((relationshipId) =>
            Array.from(
                form.elements[`relationship:${relationshipId}`]
                    ?.selectedOptions ?? [],
                ({ value }) => value,
            ),
        ),
    );
    form.elements.label.value = (form.compositionOrder ?? [])
        .filter(
            (entryId) =>
                selected.has(entryId) || entryId.startsWith("literal:"),
        )
        .map((entryId) => compositionTokenLabel(entryId, entries))
        .filter(Boolean)
        .join("");
}

function updateCompositionOrder(form, relationshipId, values) {
    const select = form.elements[`relationship:${relationshipId}`];
    const previous = new Set(
        Array.from(select?.selectedOptions ?? [], ({ value }) => value),
    );
    const selected = new Set(values);
    form.compositionOrder = (form.compositionOrder ?? []).filter(
        (value) => selected.has(value) || !previous.has(value),
    );
    values.forEach((value) => {
        if (!previous.has(value)) form.compositionOrder.push(value);
    });
}

async function createRelationshipDependency({
    schemas,
    entries,
    schema,
    relationship,
    carousel,
    form,
    i18n,
}) {
    const { openCreateEntryPopup } = await import("../create-entry/index.js");
    const suggestedLabel = carousel.dataset.suggestedLabel ?? "";
    const created = await openCreateEntryPopup({
        schemas,
        entries,
        schemaId: schema.id,
        layerId: relationship.targetLayer,
        i18n,
        initialLabel: suggestedLabel,
    });
    delete carousel.dataset.suggestedLabel;
    if (!created) return;
    entries.push(created);
    const select = form.elements[`relationship:${relationship.id}`];
    select?.append(new Option(created.label, created.id, false, false));
    appendHorizontalCarouselItem(carousel, {
        value: created.id,
        label: created.label,
    })?.click();
}

export async function openLibraryEntryEditor({
    entry,
    entries,
    schemas,
    i18n,
    requestUpdate = false,
    onSaved = () => {},
}) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const layer = schema?.layers.find(({ id }) => id === entry.layer);
    const composer = resolveComposerContract(
        schema,
        layer,
        layer?.cardConstructor,
    );
    const editor = editorBody(
        entry,
        schemas,
        entries,
        i18n,
        renderComposerExtras(
            composer.constructor,
            composer.layer,
            entries,
            schema,
        ),
        {
            generatedLabel: layer?.semanticRole !== "definition",
            includeHidden: false,
            relationshipCarousels: true,
            inlinePronunciationCarousel: true,
            inputCarouselIds: composer.inputCarouselIds,
            pronunciationCarouselLayers: composer.pronunciationCarouselLayers,
            tagCarousels: composer.constructor.tag_carousels,
            editingLayer: composer.layer,
            persistentExtra: true,
            allowDefinitionCreate: layer?.semanticRole !== "definition",
        },
    );
    let formController;
    return openPopup({
        title: i18n
            .t("gateway.study.library_admin_edit_title")
            .replace("{{ entry }}", entry.label),
        body: editor.html,
        maxWidth: "min(72rem, 96vw)",
        closeProtection: true,
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            const form = overlay.querySelector("[data-library-admin-editor]");
            formController = editor.builder.attach(form);
            bindLibraryEditorControls(form, entry, i18n, {
                maxTags: LIBRARY_COMPOSER_LIMITS.tags,
            });
            const pronunciationRelationshipIds = new Set(
                pronunciationRelationshipsFor(
                    composer.layer,
                    schema,
                    composer.pronunciationCarouselLayers,
                ).map(({ id }) => id),
            );
            form.compositionOrder = restoreCompositionTokens(
                entry,
                entries,
                composer.constructor,
                composer.inputCarouselIds,
                schema,
            );
            form.referenceGroups = structuredClone(entry.referenceGroups ?? {});
            bindComposerExtras(form, () =>
                syncGeneratedCardLabel(
                    form,
                    composer.inputCarouselIds,
                    entries,
                ),
            );
            mountEditableRelationshipCarousels(
                form,
                overlay,
                entries,
                schema,
                composer.layer,
                {
                    i18n,
                    inputCarouselIds: composer.inputCarouselIds,
                    pronunciationCarouselLayers:
                        composer.pronunciationCarouselLayers,
                    maxPronunciations: LIBRARY_COMPOSER_LIMITS.pronunciations,
                    selectionOrder: ({ id, value, localIndex }) => {
                        if (pronunciationRelationshipIds.has(id))
                            return localIndex;
                        const index = form.compositionOrder.indexOf(value);
                        return index < 0 ? localIndex : index + 1;
                    },
                    onChange: ({ id, values }) => {
                        if (pronunciationRelationshipIds.has(id)) return;
                        updateCompositionOrder(form, id, values);
                        queueMicrotask(() =>
                            syncGeneratedCardLabel(
                                form,
                                composer.inputCarouselIds,
                                entries,
                            ),
                        );
                    },
                    onAdd: ({ id, carousel }) => {
                        const relationship = composer.layer.relationships.find(
                            (candidate) => candidate.id === id,
                        );
                        if (!relationship) return;
                        void createRelationshipDependency({
                            schemas,
                            entries,
                            schema,
                            relationship,
                            carousel,
                            form,
                            i18n,
                        });
                    },
                },
            );
            syncGeneratedCardLabel(form, composer.inputCarouselIds, entries);
            form.addEventListener("click", (event) => {
                const addDefinition = event.target.closest(
                    "[data-library-add-definition]",
                );
                if (addDefinition) {
                    const relationship = composer.layer.relationships.find(
                        ({ targetLayer }) =>
                            schema.layers.find(({ id }) => id === targetLayer)
                                ?.semanticRole === "definition",
                    );
                    if (!relationship) return;
                    void (async () => {
                        const { openCreateEntryPopup } =
                            await import("../create-entry/index.js");
                        const created = await openCreateEntryPopup({
                            schemas,
                            entries,
                            schemaId: schema.id,
                            layerId: relationship.targetLayer,
                            i18n,
                        });
                        if (!created) return;
                        entries.push(created);
                        form.elements[
                            `relationship:${relationship.id}`
                        ]?.append(
                            new Option(created.label, created.id, true, true),
                        );
                        addDefinition.insertAdjacentHTML(
                            "beforebegin",
                            `<article class="library-editor-aggregate library-definition-summary"><header><strong>${escapeHtml(created.label)}</strong></header></article>`,
                        );
                        form.querySelector(
                            "[data-library-definition-empty]",
                        )?.remove();
                    })();
                    return;
                }
                const button = event.target.closest(
                    "[data-library-edit-related]",
                );
                if (!button) return;
                const related = entries.find(
                    ({ id }) => id === button.dataset.libraryEditRelated,
                );
                const mode = related ? entryEditMode(related) : null;
                if (!related || !mode) return;
                void openLibraryEntryEditor({
                    entry: related,
                    entries,
                    schemas,
                    i18n,
                    requestUpdate: mode === "request",
                    onSaved: (updated) => {
                        if (mode === "direct") Object.assign(related, updated);
                    },
                });
            });
        },
        onAction: async (action, overlay) => {
            if (action !== "save") return true;
            const form = overlay.querySelector("[data-library-admin-editor]");
            validateRequiredRelationships(
                form,
                composer.layer,
                schema,
                i18n.t("gateway.study.library_validation_error"),
            );
            if (
                form.querySelector('[data-uploading="true"]') ||
                !formController?.validateAll(true) ||
                !form.checkValidity()
            ) {
                form.revealFirstInvalidField?.();
                return false;
            }
            if (showComposerLimitViolation(form, composer.layer, schema, i18n))
                return false;
            const references = readReferences(
                form,
                composer.layer,
                form.compositionOrder,
            );
            const fields = readFields(form, composer.layer, entry);
            applyDerivedPronunciation(
                fields,
                references,
                entries,
                schema,
                composer.layer,
                composer.derivesPronunciation,
            );
            const proposedEntry = {
                schemaId: entry.schemaId,
                schemaVersion: entry.schemaVersion,
                layer: entry.layer,
                label: form.elements.label.value,
                class: form.elements.class.value || undefined,
                tags: form.elements.tags.value.split("\u001f").filter(Boolean),
                hidden: entry.hidden,
                alwaysShowDefinition:
                    form.elements.alwaysShowDefinition.checked,
                fields,
                references,
                referenceGroups: readReferenceGroups(form),
            };
            let updated;
            try {
                updated = requestUpdate
                    ? await requestLibraryUpdate(entry.id, proposedEntry)
                    : await updateLibraryEntry(entry.id, proposedEntry);
            } catch (error) {
                showLibraryMutationError(error, i18n);
                return false;
            }
            await completeLibraryMutation({
                entry,
                updated,
                synchronize: onSaved,
                successKey: requestUpdate
                    ? "gateway.study.library_update_requested"
                    : "gateway.study.library_update_success",
                i18n,
                assignUpdated: !requestUpdate,
            });
            return true;
        },
    });
}

export function bindAdminLibraryInteractions(
    root,
    { entries, i18n, render, schemas, signal },
) {
    let editorOpen = false;
    root.addEventListener(
        "keydown",
        (event) => {
            if (!event.target.matches(".library-admin-entry-row")) return;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.target.click();
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest("[data-library-admin-edit]");
            const row = event.target.closest(".library-admin-entry-row");
            if (
                (!button && !row) ||
                event.target.matches("[data-library-select-entry]") ||
                editorOpen
            )
                return;
            const readOnly = !button;
            const entry = entries.find(
                ({ id }) =>
                    id ===
                    (button?.dataset.libraryAdminEdit ??
                        row?.dataset.libraryEntry),
            );
            if (!entry) return;
            const schema = schemas.find(({ id }) => id === entry.schemaId);
            const layer = schema?.layers.find(({ id }) => id === entry.layer);
            const composer = resolveComposerContract(
                schema,
                layer,
                layer?.cardConstructor,
            );
            const editor = editorBody(
                entry,
                schemas,
                entries,
                i18n,
                readOnly
                    ? ""
                    : renderComposerExtras(
                          composer.constructor,
                          composer.layer,
                          entries,
                          schema,
                      ),
                {
                    generatedLabel: layer?.semanticRole !== "definition",
                    showRelationshipTab: readOnly,
                    relationshipCarousels: !readOnly,
                    inlinePronunciationCarousel: !readOnly,
                    inputCarouselIds: composer.inputCarouselIds,
                    pronunciationCarouselLayers:
                        composer.pronunciationCarouselLayers,
                    tagCarousels: composer.constructor.tag_carousels,
                    editingLayer: composer.layer,
                    persistentExtra: !readOnly,
                },
            );
            let formController;
            editorOpen = true;
            await openPopup({
                title: i18n
                    .t(
                        readOnly
                            ? "gateway.study.library_admin_view_title"
                            : "gateway.study.library_admin_edit_title",
                    )
                    .replace("{{ entry }}", entry.label),
                body: editor.html,
                maxWidth: "min(72rem, 96vw)",
                closeProtection: !readOnly,
                actions: readOnly
                    ? [
                          {
                              id: "close",
                              label: i18n.t("ui.reuse.close"),
                              variant: "neutral",
                          },
                      ]
                    : [
                          {
                              id: "save",
                              label: i18n.t("ui.reuse.save"),
                              variant: "confirm",
                          },
                          {
                              id: "cancel",
                              label: i18n.t("ui.reuse.cancel"),
                              variant: "cancel",
                          },
                      ],
                onOpen: (overlay) => {
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    if (readOnly) {
                        form.querySelectorAll(
                            "input, select, textarea",
                        ).forEach((control) => {
                            control.disabled = true;
                        });
                        form.classList.add("library-admin-editor--read-only");
                    }
                    if (!readOnly) formController = editor.builder.attach(form);
                    bindLibraryEditorControls(form, entry, i18n, {
                        maxTags: LIBRARY_COMPOSER_LIMITS.tags,
                    });
                    if (!readOnly) {
                        const pronunciationRelationshipIds = new Set(
                            pronunciationRelationshipsFor(
                                composer.layer,
                                schema,
                                composer.pronunciationCarouselLayers,
                            ).map(({ id }) => id),
                        );
                        form.compositionOrder = restoreCompositionTokens(
                            entry,
                            entries,
                            composer.constructor,
                            composer.inputCarouselIds,
                            schema,
                        );
                        form.referenceGroups = structuredClone(
                            entry.referenceGroups ?? {},
                        );
                        bindComposerExtras(form, () =>
                            syncGeneratedCardLabel(
                                form,
                                composer.inputCarouselIds,
                                entries,
                            ),
                        );
                        mountEditableRelationshipCarousels(
                            form,
                            overlay,
                            entries,
                            schema,
                            composer.layer,
                            {
                                i18n,
                                inputCarouselIds: composer.inputCarouselIds,
                                pronunciationCarouselLayers:
                                    composer.pronunciationCarouselLayers,
                                maxPronunciations:
                                    LIBRARY_COMPOSER_LIMITS.pronunciations,
                                selectionOrder: ({ id, value, localIndex }) => {
                                    if (pronunciationRelationshipIds.has(id))
                                        return localIndex;
                                    const index =
                                        form.compositionOrder.indexOf(value);
                                    return index < 0 ? localIndex : index + 1;
                                },
                                onChange: ({ id, values }) => {
                                    if (pronunciationRelationshipIds.has(id))
                                        return;
                                    updateCompositionOrder(form, id, values);
                                    queueMicrotask(() =>
                                        syncGeneratedCardLabel(
                                            form,
                                            composer.inputCarouselIds,
                                            entries,
                                        ),
                                    );
                                },
                                onAdd: ({ id, carousel }) => {
                                    const relationship =
                                        composer.layer.relationships.find(
                                            (candidate) => candidate.id === id,
                                        );
                                    if (!relationship) return;
                                    void createRelationshipDependency({
                                        schemas,
                                        entries,
                                        schema,
                                        relationship,
                                        carousel,
                                        form,
                                        i18n,
                                    });
                                },
                            },
                        );
                        syncGeneratedCardLabel(
                            form,
                            composer.inputCarouselIds,
                            entries,
                        );
                    }
                },
                onAction: async (action, overlay) => {
                    if (readOnly) return true;
                    if (action !== "save") return true;
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    validateRequiredRelationships(
                        form,
                        composer.layer,
                        schema,
                        i18n.t("gateway.study.library_validation_error"),
                    );
                    if (
                        form.querySelector('[data-uploading="true"]') ||
                        !formController?.validateAll(true) ||
                        !form.checkValidity()
                    ) {
                        showToast(
                            i18n.t("gateway.study.library_validation_error"),
                            { variant: "error" },
                        );
                        form.revealFirstInvalidField?.();
                        return false;
                    }
                    if (
                        showComposerLimitViolation(
                            form,
                            composer.layer,
                            schema,
                            i18n,
                        )
                    )
                        return false;
                    let updated;
                    try {
                        const references = readReferences(
                            form,
                            composer.layer,
                            form.compositionOrder,
                        );
                        const fields = readFields(form, composer.layer, entry);
                        applyDerivedPronunciation(
                            fields,
                            references,
                            entries,
                            schema,
                            composer.layer,
                            composer.derivesPronunciation,
                        );
                        updated = await updateLibraryEntry(entry.id, {
                            schemaId: entry.schemaId,
                            schemaVersion: entry.schemaVersion,
                            layer: entry.layer,
                            label: form.elements.label.value,
                            class: form.elements.class.value || undefined,
                            tags: form.elements.tags.value
                                .split("\u001f")
                                .filter(Boolean),
                            hidden:
                                form.elements.hidden.value === "true" ||
                                form.elements.hidden.checked,
                            alwaysShowDefinition:
                                form.elements.alwaysShowDefinition.checked,
                            fields,
                            references,
                            referenceGroups: readReferenceGroups(form),
                        });
                    } catch (error) {
                        showLibraryMutationError(error, i18n);
                        return false;
                    }
                    await completeLibraryMutation({
                        entry,
                        updated,
                        synchronize: render,
                        successKey: "gateway.study.library_update_success",
                        i18n,
                    });
                    return true;
                },
            }).finally(() => {
                editorOpen = false;
            });
        },
        { signal },
    );
}
