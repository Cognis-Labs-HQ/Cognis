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
import {
    requestLibraryUpdate,
    updateLibraryEntry,
} from "/static/gateways/study/ui/library-client.js";
import {
    definitionText,
    layerForEntry,
    localizedLabel,
} from "./presentation.js";
import { canCreateLayerEntries, entryEditMode } from "./editability.js";
import {
    mountEditableRelationshipCarousels,
    pronunciationRelationshipsFor,
} from "./pronunciation-editor.js";
import {
    applyDerivedPronunciation,
    resolveComposerContract,
} from "./composer-contract.js";
import {
    composerLimitViolation,
    LIBRARY_COMPOSER_LIMITS,
} from "./composer-limits.js";
import { bindComposerExtras, renderComposerExtras } from "./composer-extras.js";
import {
    compositionTokenEntryId,
    compositionTokenLabel,
    restoreCompositionTokens,
} from "./composition-tokens.js";

export { inputForField } from "./field-input.js";
import { inputForField, renderStrokePatternPreviews } from "./field-input.js";
import { transformationPathways } from "./transformations.js";

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

function relationshipEditor(
    relationship,
    entry,
    entries,
    schema,
    language,
    {
        carousel = false,
        hiddenOnly = false,
        addLabel = "Add",
        allowAdd = true,
        ordersPronunciation = false,
        excludedTags = new Set(),
        transformsAvailableLabel = "",
    } = {},
) {
    const targetLayer = schema.layers.find(
        ({ id }) => id === relationship.targetLayer,
    );
    const label =
        localizedLabel(targetLayer?.metadata, language) ||
        relationship.targetLayer;
    const pronunciationText = [entry.fields?.pronunciation]
        .flat()
        .filter((value) => typeof value === "string")
        .join("");
    const authoredText = pronunciationText || entry.label;
    const selectedValues = (entry.references ?? [])
        .filter(({ relation }) => relation === relationship.id)
        .sort((left, right) => {
            if (ordersPronunciation) {
                const pronunciationIndex = (reference) => {
                    const candidate = entries.find(
                        ({ id }) => id === reference.entryId,
                    );
                    const values = [candidate?.fields?.pronunciation]
                        .flat()
                        .filter((value) => typeof value === "string");
                    const indexes = [...values, candidate?.label]
                        .filter(Boolean)
                        .map((value) => authoredText.indexOf(value))
                        .filter((index) => index >= 0);
                    return indexes.length
                        ? Math.min(...indexes)
                        : Number.MAX_SAFE_INTEGER;
                };
                const indexDifference =
                    pronunciationIndex(left) - pronunciationIndex(right);
                if (indexDifference) return indexDifference;
            }
            return (
                (left.position ?? Number.MAX_SAFE_INTEGER) -
                (right.position ?? Number.MAX_SAFE_INTEGER)
            );
        })
        .map(({ entryId }) => entryId);
    const selected = new Set(selectedValues);
    const availableTargets = entries.filter(
        (candidate) =>
            candidate.schemaId === entry.schemaId &&
            candidate.layer === relationship.targetLayer &&
            candidate.id !== entry.id,
    );
    const visibleTargets = availableTargets.filter(
        (candidate) =>
            candidate.hidden !== true &&
            !(candidate.tags ?? []).some((tag) => excludedTags.has(tag)),
    );
    const previewFor = (target) => {
        if (
            transformsAvailableLabel &&
            transformationPathways(target, schema).some(
                ({ nodes }) => nodes.length > 1,
            )
        )
            return transformsAvailableLabel;
        const definition = (target.references ?? [])
            .map(({ entryId }) => entries.find(({ id }) => id === entryId))
            .find((candidate) => {
                const targetLayer = candidate
                    ? layerForEntry([schema], candidate)
                    : null;
                return ["definition", "meaning"].includes(
                    targetLayer?.semanticRole,
                );
            });
        return definition
            ? definitionText(
                  definition,
                  layerForEntry([schema], definition),
                  document.documentElement.lang,
              )
            : "";
    };
    const targets = carousel
        ? [...visibleTargets]
              .sort(
                  (left, right) =>
                      Number(Boolean(previewFor(right))) -
                      Number(Boolean(previewFor(left))),
              )
              .filter(
                  (target, index, all) =>
                      all.findIndex(
                          (candidate) =>
                              candidate.label.normalize("NFKC") ===
                              target.label.normalize("NFKC"),
                      ) === index,
              )
        : availableTargets;
    const select = `<select name="relationship:${escapeHtml(relationship.id)}" multiple${carousel ? " hidden" : ` size="${Math.min(6, Math.max(2, targets.length))}"`}>${availableTargets.map((target) => `<option value="${escapeHtml(target.id)}"${selected.has(target.id) ? " selected" : ""}>${escapeHtml(target.label)}</option>`).join("")}</select>`;
    if (hiddenOnly) return select.replace(" multiple", " multiple hidden");
    if (!carousel)
        return `<label><span>${escapeHtml(label)}</span>${select}</label>`;
    return `<div class="library-composer-relationship" data-library-composer-relationship="${escapeHtml(relationship.id)}" data-target-layer="${escapeHtml(relationship.targetLayer)}">${select}${renderHorizontalCarousel({ id: relationship.id, label, items: targets.map((target) => ({ value: target.id, label: target.label, preview: previewFor(target) })), selectedValues, addLabel, allowAdd })}</div>`;
}

export function editorBody(
    entry,
    schemas,
    entries,
    i18n,
    extraHtml = "",
    options = {},
) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const schemaLayer = schema?.layers.find(({ id }) => id === entry.layer);
    const layer = options.editingLayer ?? schemaLayer;
    const immutableStringKeyField =
        layer?.semanticRole === "definition"
            ? layer.definitionLocalization?.stringKeyField
            : undefined;
    const configuredPronunciationRelationshipIds = new Set(
        options.pronunciationCarouselLayers ?? [],
    );
    const pronunciationRelationships = pronunciationRelationshipsFor(
        layer,
        schema,
        configuredPronunciationRelationshipIds,
    );
    const pronunciationRelationshipIds = new Set(
        pronunciationRelationships.map(({ id }) => id),
    );
    const selectedReferenceField = (
        kind,
        relationshipIds,
        {
            fieldLabel = kind,
            multiValue = false,
            values = [],
            inputValue = "",
            required = false,
        } = {},
    ) => {
        const selected = (multiValue ? [] : (entry.references ?? []))
            .filter(({ relation }) => relationshipIds.has(relation))
            .toSorted(
                (left, right) =>
                    (left.position ?? Number.MAX_SAFE_INTEGER) -
                    (right.position ?? Number.MAX_SAFE_INTEGER),
            )
            .map(({ entryId }) => entries.find(({ id }) => id === entryId))
            .filter(Boolean);
        const savedValues =
            multiValue && values.length
                ? `<span class="library-composer-saved-values" data-library-saved-values="${escapeHtml(kind)}">${values.map((value, index) => `<span class="library-composer-saved-value" data-library-saved-index="${index}"><button class="btn-neutral" type="button" data-library-edit-saved-value>${escapeHtml(value)}</button><button class="btn-cancel" type="button" data-library-delete-saved-value aria-label="${escapeHtml(i18n.t("gateway.study.library_delete_saved_value").replace("{{ field }}", fieldLabel))}">×</button></span>`).join("")}</span>`
                : `<span class="library-composer-saved-values" data-library-saved-values="${escapeHtml(kind)}" hidden></span>`;
        return `${savedValues}${renderCompositionInput({
            id: kind,
            label: fieldLabel,
            value: inputValue,
            required,
            items: selected.map((candidate) => ({
                value: candidate.id,
                label: candidate.label,
            })),
            removeLabel: (label) =>
                i18n
                    .t("gateway.study.library_remove_selected_card")
                    .replace("{{ card }}", label),
            containerAttributes: {
                "data-library-composition-field": kind,
                "data-multi-value": multiValue,
            },
            inputAttributes: {
                "data-library-carousel-text": true,
                ...(kind === "input"
                    ? { "data-library-composer-text": true }
                    : {}),
            },
            itemsAttributes: {
                "data-library-selected-references": kind,
                ...(kind === "input"
                    ? { "data-library-composition-blocks": true }
                    : {}),
            },
            itemAttributes: ({ value }) => ({
                "data-library-selected-reference": value,
                ...(kind === "input"
                    ? {
                          "data-library-composition-id": value,
                          draggable: true,
                      }
                    : {}),
            }),
            saveAction: multiValue
                ? {
                      label: i18n
                          .t("gateway.study.library_save_field")
                          .replace("{{ field }}", fieldLabel),
                      attributes: {
                          "data-library-save-composed-value": true,
                      },
                  }
                : undefined,
        })}`;
    };
    const inputRelationships = (layer?.relationships ?? []).filter(({ id }) =>
        options.inputCarouselIds?.has(id),
    );
    const relationshipAllowsCreate = (relationship) => {
        const targetLayer = schema?.layers.find(
            ({ id }) => id === relationship.targetLayer,
        );
        return canCreateLayerEntries(targetLayer);
    };
    const inlineInputCarousel = inputRelationships
        .map((relationship) =>
            relationshipEditor(
                relationship,
                entry,
                entries,
                schema,
                schema.language,
                {
                    carousel: true,
                    addLabel: i18n.t("gateway.study.library_create"),
                    allowAdd:
                        options.relationshipCarouselAdd !== false &&
                        relationshipAllowsCreate(relationship),
                    excludedTags: new Set(
                        (options.tagCarousels ?? [])
                            .filter(
                                (carousel) =>
                                    carousel.relationship === relationship.id,
                            )
                            .map(({ tag }) => tag),
                    ),
                    transformsAvailableLabel: i18n.t(
                        "gateway.study.library_transforms_available",
                    ),
                },
            ),
        )
        .join("");
    const inlinePronunciationCarousel = options.inlinePronunciationCarousel
        ? pronunciationRelationships
              .map((relationship) =>
                  relationshipEditor(
                      relationship,
                      entry,
                      entries,
                      schema,
                      schema.language,
                      {
                          carousel: true,
                          addLabel: i18n.t("gateway.study.library_create"),
                          allowAdd:
                              options.relationshipCarouselAdd !== false &&
                              relationshipAllowsCreate(relationship),
                          ordersPronunciation: true,
                          transformsAvailableLabel: i18n.t(
                              "gateway.study.library_transforms_available",
                          ),
                      },
                  ),
              )
              .join("")
        : "";
    const fields = (layer?.fields ?? [])
        .filter((field) => field.id !== immutableStringKeyField)
        .map((field) => {
            if (
                field.id === "pronunciation" &&
                options.inlinePronunciationCarousel
            ) {
                const value = entry.fields?.[field.id];
                const fieldLabel = localizedLabel(
                    field.metadata,
                    schema.language,
                );
                const pronunciations = Array.isArray(value)
                    ? value
                    : value
                      ? [value]
                      : [];
                return `<fieldset class="library-pronunciation-selector"><legend>${escapeHtml(fieldLabel)}</legend><input name="field:pronunciation" type="hidden" value="${escapeHtml(pronunciations.join("\n"))}">${pronunciationRelationshipIds.size ? selectedReferenceField("pronunciation", pronunciationRelationshipIds, { fieldLabel, multiValue: field.multi_value === true, values: pronunciations }) : ""}${inlinePronunciationCarousel}</fieldset>`;
            }
            if (
                field.id === "pronunciation" &&
                layer?.semanticRole === "orderedLexicalSequence"
            )
                return `<input name="field:pronunciation" type="hidden" value="${escapeHtml(entry.fields?.pronunciation ?? "")}">`;
            return inputForField(
                field,
                entry.fields?.[field.id],
                schema.language,
                i18n,
            );
        })
        .join("");
    const relationships = (layer?.relationships ?? [])
        .filter(
            (relationship) =>
                !options.inputCarouselIds?.has(relationship.id) &&
                (!options.inlinePronunciationCarousel ||
                    !pronunciationRelationshipIds.has(relationship.id)),
        )
        .map((relationship, relationshipIndex, allRelationships) => {
            const targetRole = schema?.layers.find(
                ({ id }) => id === relationship.targetLayer,
            )?.semanticRole;
            const duplicateTarget = allRelationships
                .slice(0, relationshipIndex)
                .some(
                    (candidate) =>
                        candidate.targetLayer === relationship.targetLayer,
                );
            const carouselEligible =
                options.relationshipCarousels === true &&
                (!options.inputCarouselIds ||
                    options.inputCarouselIds.has(relationship.id)) &&
                (options.inputCarouselIds || !duplicateTarget) &&
                !["definition", "meaning"].includes(targetRole) &&
                (layer?.semanticRole !== "compoundWritingUnit" ||
                    targetRole === "atomicWritingUnit");
            return relationshipEditor(
                relationship,
                entry,
                entries,
                schema,
                schema.language,
                {
                    carousel: carouselEligible,
                    hiddenOnly:
                        options.relationshipCarousels === true &&
                        !carouselEligible,
                    addLabel: i18n.t("gateway.study.library_create"),
                    transformsAvailableLabel: i18n.t(
                        "gateway.study.library_transforms_available",
                    ),
                    allowAdd:
                        options.relationshipCarouselAdd !== false &&
                        relationshipAllowsCreate(relationship),
                    excludedTags: new Set(
                        (options.tagCarousels ?? [])
                            .filter(
                                (carousel) =>
                                    carousel.relationship === relationship.id,
                            )
                            .map(({ tag }) => tag),
                    ),
                },
            );
        })
        .join("");
    const referencedEntries = (entry.references ?? [])
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .filter(Boolean);
    const definitionEntries = referencedEntries.filter((candidate) => {
        const candidateLayer = schema?.layers.find(
            ({ id }) => id === candidate.layer,
        );
        return candidateLayer?.semanticRole === "definition";
    });
    const definitionSummaryFields = (definition) => {
        const definitionLayer = layerForEntry([schema], definition);
        const translationsField =
            definitionLayer?.definitionLocalization?.translationsField;
        const translations = definition.fields?.[translationsField];
        if (!translations || typeof translations !== "object") return "";
        return Object.entries(translations)
            .filter(([, value]) => typeof value === "string" && value.trim())
            .map(
                ([languageCode, value]) =>
                    `<div class="library-definition-translation"><dt lang="${escapeHtml(languageCode)}">${escapeHtml(languageCode.toLocaleUpperCase())}</dt><dd lang="${escapeHtml(languageCode)}">${escapeHtml(value)}</dd></div>`,
            )
            .join("");
    };
    const definitionSummary = definitionEntries.length
        ? definitionEntries
              .map(
                  (definition) =>
                      `<article class="library-editor-aggregate library-definition-summary"><header><strong>${escapeHtml(definitionText(definition, layerForEntry([schema], definition), schema.language) || definition.label)}</strong>${entryEditMode(definition) ? `<button class="btn-neutral" type="button" data-library-edit-related="${escapeHtml(definition.id)}">${escapeHtml(i18n.t("ui.reuse.edit"))}</button>` : ""}</header><dl>${definitionSummaryFields(definition)}</dl></article>`,
              )
              .join("")
        : `<p data-library-definition-empty>${escapeHtml(i18n.t("gateway.study.library_editor_no_definitions"))}</p>`;
    const relationshipMap = `<div class="library-relationship-map"><section><h3>${escapeHtml(i18n.t("gateway.study.library_relation_parents"))}</h3><div data-library-relationship-parents>${referencedEntries.map((candidate) => `<span>${escapeHtml(candidate.label)}</span>`).join("") || `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_relationships"))}</p>`}</div></section><strong aria-hidden="true">← ${escapeHtml(entry.label || i18n.t("gateway.study.library_create"))} →</strong><section><h3>${escapeHtml(i18n.t("gateway.study.library_relation_children"))}</h3><div>${
        entries
            .filter((candidate) =>
                (candidate.references ?? []).some(
                    ({ entryId }) => entryId === entry.id,
                ),
            )
            .map((candidate) => `<span>${escapeHtml(candidate.label)}</span>`)
            .join("") ||
        `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_relationships"))}</p>`
    }</div></section></div>`;
    const isDefinition = layer?.semanticRole === "definition";
    const alwaysShowDefinitionControl =
        isDefinition || options.includeAlwaysShowDefinition === false
            ? '<input name="alwaysShowDefinition" type="hidden" value="">'
            : `<label class="library-admin-hidden"><input name="alwaysShowDefinition" type="checkbox" class="choice-checkbox"${entry.alwaysShowDefinition ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_always_show_definition"))}</span></label>`;
    const definitionsPanel = `${definitionSummary}${options.allowDefinitionCreate ? `<button class="btn-neutral library-definition-add" type="button" data-library-add-definition aria-label="${escapeHtml(i18n.t("gateway.study.library_add_definition"))}">+</button>` : ""}${alwaysShowDefinitionControl}`;
    const contentClass = entry.class ?? "";
    const generatedLabel = options.generatedLabel
        ? `<input name="label" type="hidden" required maxlength="500" value="${escapeHtml(entry.label)}">`
        : "";
    const classField = `<input name="class" type="hidden" value="${escapeHtml(contentClass)}">`;
    const inputSelectionField = options.inputCarouselIds?.size
        ? `<fieldset class="library-pronunciation-selector"><legend>${escapeHtml(i18n.t("gateway.study.library_composer_text"))}</legend>${selectedReferenceField("input", options.inputCarouselIds, { fieldLabel: i18n.t("gateway.study.library_composer_text"), inputValue: entry.id ? "" : entry.label, required: !entry.id })}${inlineInputCarousel}</fieldset>`
        : "";
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    const tagsField = `<div class="library-tag-field" data-library-entry-tags><span>${escapeHtml(i18n.t("gateway.study.library_tags"))}</span><div class="library-tag-list">${tags.map((tag) => `<button type="button" class="btn-neutral" data-library-tag="${escapeHtml(tag)}">${escapeHtml(tag)} ×</button>`).join("")}</div><input data-library-tag-input aria-label="${escapeHtml(i18n.t("gateway.study.library_tags"))}"><input name="tags" type="hidden" value="${escapeHtml(tags.join("\u001f"))}"></div>`;
    const relationshipTab = options.showRelationshipTab
        ? `<button class="btn-neutral" type="button" role="tab" aria-selected="false" data-library-editor-tab="relationships" data-form-tab="relationships">${escapeHtml(i18n.t("gateway.study.library_editor_relationships"))}</button>`
        : "";
    const relationshipPanel = options.showRelationshipTab
        ? `<section class="library-editor-panel" data-library-editor-panel="relationships" data-form-panel="relationships" hidden>${relationshipMap}</section>`
        : "";
    const preservedRelationships =
        !options.persistentExtra && !options.showRelationshipTab
            ? (layer?.relationships ?? [])
                  .filter(
                      (relationship) =>
                          !options.inlinePronunciationCarousel ||
                          !pronunciationRelationshipIds.has(relationship.id),
                  )
                  .map((relationship) =>
                      relationshipEditor(
                          relationship,
                          entry,
                          entries,
                          schema,
                          schema.language,
                          { hiddenOnly: true },
                      ),
                  )
                  .join("")
            : "";
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "library-admin-editor",
            formClassName: "library-admin-editor",
            formAttributes: { "data-library-admin-editor": true },
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: options.generatedLabel
                ? []
                : [
                      {
                          name: "label",
                          label:
                              options.labelText ??
                              i18n.t("gateway.study.library_admin_label"),
                          required: true,
                          maxCharacters: 500,
                          value: entry.label,
                      },
                  ],
            trustedContentHtml: `${options.persistentExtra ? "" : preservedRelationships}<nav class="library-editor-tabs" role="tablist" data-library-editor-tabs><button class="btn-neutral active" type="button" role="tab" aria-selected="true" data-library-editor-tab="content" data-form-tab="content">${escapeHtml(i18n.t("gateway.study.library_editor_content"))}</button>${relationshipTab}<button class="btn-neutral" type="button" role="tab" aria-selected="false" data-library-editor-tab="definitions" data-form-tab="definitions">${escapeHtml(i18n.t("gateway.study.library_definitions"))}</button></nav><section class="library-editor-panel" data-library-editor-panel="content" data-form-panel="content">${generatedLabel}${classField}${extraHtml}${inputSelectionField}${fields}${options.persistentExtra ? relationships : ""}${isDefinition ? '<input name="hidden" type="hidden" value="true">' : options.includeHidden === false ? '<input name="hidden" type="hidden" value="">' : `<label class="library-admin-hidden"><input name="hidden" type="checkbox" class="choice-checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>`}${tagsField}</section>${relationshipPanel}<section class="library-editor-panel" data-library-editor-panel="definitions" data-form-panel="definitions" hidden>${definitionsPanel}</section>`,
        },
    );
    return { html: builder.render(), builder };
}

export function readFields(form, layer, entry) {
    const immutableStringKeyField =
        layer?.semanticRole === "definition"
            ? layer.definitionLocalization?.stringKeyField
            : undefined;
    return {
        ...(entry.fields ?? {}),
        ...Object.fromEntries(
            (layer?.fields ?? [])
                .filter((field) => field.id !== immutableStringKeyField)
                .map((field) => {
                    if (field.input?.immutable === true)
                        return [field.id, entry.fields?.[field.id]];
                    const name = `field:${field.id}`;
                    const valueKind = field.validation?.kind ?? field.type;
                    if (valueKind === "boolean")
                        return [
                            field.id,
                            form.elements[name]?.checked === true,
                        ];
                    if (valueKind === "localizedText") {
                        const translations = {};
                        for (const control of form.elements) {
                            if (control.name?.startsWith(`${name}:`))
                                translations[
                                    control.name.slice(name.length + 1)
                                ] = control.value;
                        }
                        return [field.id, translations];
                    }
                    const value = form.elements[name]?.value ?? "";
                    if (field.type === "strokePattern")
                        return [
                            field.id,
                            form.elements[name]?.libraryFieldValue ??
                                entry.fields?.[field.id],
                        ];
                    if (
                        field.type === "stringList" ||
                        field.validation?.kind === "list" ||
                        field.input?.control === "multiSelect"
                    )
                        return [
                            field.id,
                            field.input?.control === "multiSelect"
                                ? Array.from(
                                      form.elements[name]?.selectedOptions ??
                                          [],
                                      (option) => option.value,
                                  )
                                : value
                                      .split(/\r?\n/u)
                                      .map((item) => item.trim())
                                      .filter(Boolean),
                        ];
                    if (
                        ["number", "integer"].includes(field.type) ||
                        field.validation?.kind === "number" ||
                        field.input?.control === "number"
                    )
                        return [
                            field.id,
                            value === "" ? undefined : Number(value),
                        ];
                    return [field.id, value];
                }),
        ),
    };
}

export function readReferences(form, layer, compositionOrder = []) {
    const authoredPositions = new Map(
        compositionOrder.map((token, position) => [
            compositionTokenEntryId(token),
            position,
        ]),
    );
    return (layer?.relationships ?? [])
        .filter((relationship) => !relationship.grouped)
        .flatMap((relationship) =>
            Array.from(
                form.elements[`relationship:${relationship.id}`]
                    ?.selectedOptions ?? [],
                (option, position) => ({
                    entryId: option.value,
                    relation: relationship.id,
                    ...(relationship.ordered
                        ? {
                              position:
                                  authoredPositions.get(option.value) ??
                                  position,
                          }
                        : {}),
                }),
            ),
        );
}

export function readReferenceGroups(form) {
    return structuredClone(form.referenceGroups ?? {});
}

export function validateRequiredRelationships(form, layer, schema, message) {
    const groups = readReferenceGroups(form);
    let valid = true;
    for (const relationship of layer?.relationships ?? []) {
        const select = form.elements[`relationship:${relationship.id}`];
        if (!select) continue;
        const selectedCount = select.selectedOptions?.length ?? 0;
        const groupedCount = (groups[relationship.id] ?? []).reduce(
            (total, group) => total + group.length,
            0,
        );
        const targetLayer = schema?.layers?.find(
            ({ id }) => id === relationship.targetLayer,
        );
        const isDefinitionRelationship = ["definition", "meaning"].includes(
            targetLayer?.semanticRole,
        );
        const minimum =
            layer?.semanticRole === "compoundWritingUnit" &&
            isDefinitionRelationship
                ? 0
                : (relationship.minimum ?? 0);
        const missing = selectedCount + groupedCount < minimum;
        select.setCustomValidity(missing ? message : "");
        if (["definition", "meaning"].includes(targetLayer?.semanticRole))
            select.dataset.formValidationPanel = "definitions";
        else delete select.dataset.formValidationPanel;
        if (isDefinitionRelationship)
            form.querySelector(
                "[data-library-add-definition]",
            )?.classList.toggle("library-definition-add--required", missing);
        valid &&= !missing;
    }
    return valid;
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
    const { openCreateEntryPopup } = await import("./create-entry.js");
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
                            await import("./create-entry.js");
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
            const updated = requestUpdate
                ? await requestLibraryUpdate(entry.id, proposedEntry)
                : await updateLibraryEntry(entry.id, proposedEntry);
            if (!requestUpdate) Object.assign(entry, updated);
            onSaved(updated);
            showToast(
                i18n.t(
                    requestUpdate
                        ? "gateway.study.library_update_requested"
                        : "gateway.study.library_update_success",
                ),
                { variant: "success" },
            );
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
                        const updated = await updateLibraryEntry(entry.id, {
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
                        Object.assign(entry, updated);
                        render();
                        showToast(
                            i18n.t("gateway.study.library_update_success"),
                            { variant: "success" },
                        );
                        return true;
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_update_error"),
                            { variant: "error" },
                        );
                        return false;
                    }
                },
            }).finally(() => {
                editorOpen = false;
            });
        },
        { signal },
    );
}
