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
                ? `<span class="library-composer-saved-values" data-library-saved-values>${values.map((value, index) => `<span class="library-composer-saved-value" data-library-saved-index="${index}"><button class="btn-neutral" type="button" data-library-edit-saved-value>${escapeHtml(value)}</button><button class="btn-cancel" type="button" data-library-delete-saved-value aria-label="${escapeHtml(i18n.t("gateway.study.library_delete_saved_value").replace("{{ field }}", fieldLabel))}">×</button></span>`).join("")}</span>`
                : `<span class="library-composer-saved-values" data-library-saved-values hidden></span>`;
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
                "data-multi-value": multiValue ? "true" : "false",
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
        .filter(
            (field) =>
                field.id !== immutableStringKeyField && field.hidden !== true,
        )
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
                if (layer?.semanticRole === "orderedLexicalSequence")
                    return `<fieldset class="library-pronunciation-selector"><legend>${escapeHtml(fieldLabel)}</legend><output data-library-derived-pronunciation>${escapeHtml(pronunciations.join(""))}</output><input name="field:pronunciation" type="hidden" value="${escapeHtml(pronunciations.join(""))}"></fieldset>`;
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
            trustedContentHtml: `${options.persistentExtra ? "" : preservedRelationships}<nav class="library-editor-tabs" role="tablist" data-library-editor-tabs><button class="btn-neutral active" type="button" role="tab" aria-selected="true" data-library-editor-tab="content" data-form-tab="content">${escapeHtml(i18n.t("gateway.study.library_editor_content"))}</button>${relationshipTab}<button class="btn-neutral" type="button" role="tab" aria-selected="false" data-library-editor-tab="definitions" data-form-tab="definitions">${escapeHtml(i18n.t("gateway.study.library_definitions"))}</button></nav><section class="library-editor-panel" data-library-editor-panel="content" data-form-panel="content">${generatedLabel}${classField}${inputSelectionField}${extraHtml}${fields}${options.persistentExtra ? relationships : ""}${isDefinition ? '<input name="hidden" type="hidden" value="true">' : options.includeHidden === false ? '<input name="hidden" type="hidden" value="">' : `<label class="library-admin-hidden"><input name="hidden" type="checkbox" class="choice-checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>`}${tagsField}</section>${relationshipPanel}<section class="library-editor-panel" data-library-editor-panel="definitions" data-form-panel="definitions" hidden>${definitionsPanel}</section>`,
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
                .filter(
                    (field) =>
                        field.id !== immutableStringKeyField &&
                        field.hidden !== true,
                )
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
    const authoredTransformations = new Map(
        compositionOrder.flatMap((token) => {
            const transformation = transformationTokenDetails(token);
            return transformation
                ? [
                      [
                          transformation.entryId,
                          {
                              setId: transformation.setId,
                              path: transformation.path,
                          },
                      ],
                  ]
                : [];
        }),
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
                    ...(authoredTransformations.has(option.value)
                        ? {
                              transformation: authoredTransformations.get(
                                  option.value,
                              ),
                          }
                        : {}),
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
        const minimum = relationship.minimum ?? 0;
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
