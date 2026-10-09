import { DEFINITION_LANGUAGES } from "../definition-languages.js";
import {
    openDefinitionPopup,
    linkDefinition,
    bindCommittedDefinitionEditing,
} from "./definition-editor.js";
import { bindLookupProviders, bindRawInput } from "./lookups.js";
import {
    incompatibleDependencies,
    resolveCreationScope,
} from "../dependency-scope.js";
import { bindTextComposition } from "./composition.js";
import { entryDefinitions } from "./definitions.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import { showToast } from "/static/reuse/toast.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { appendHorizontalCarouselItem } from "/static/reuse/horizontal-carousel.js";
import {
    createLibraryEntry,
    deleteLibraryEntries,
    fetchLibraryForms,
    fetchLibraryLookupProviders,
    fetchLibraryLocations,
    requestLibraryPromotion,
} from "/static/gateways/study/ui/library-client.js";
import {
    bindLibraryEditorControls,
    editorBody,
    readFields,
    readReferenceGroups,
    readReferences,
    validateRequiredRelationships,
} from "../admin-interactions/index.js";
import { localizedLabel } from "../presentation.js";
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
import { compositionTokenEntryId } from "../composition-tokens.js";
import { activateCompositionEntry } from "../composition-activation.js";
import { renderStrokePatternPreviews } from "../field-input.js";

export async function chooseCreateLayer({
    schema,
    contributions,
    preferredLayerId,
    i18n,
}) {
    const permitted = schema.layers.filter(
        (layer) =>
            ![
                "atomicWritingUnit",
                "definition",
                "meaning",
                "particle",
            ].includes(layer.semanticRole),
    );
    if (!permitted.length) return null;
    let select;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_create"),
        body: `<label><span>${escapeHtml(i18n.t("gateway.study.library_composer_layer"))}</span><select data-library-create-layer>${permitted.map((layer) => `<option value="${escapeHtml(layer.id)}"${layer.id === preferredLayerId ? " selected" : ""}>${escapeHtml(localizedLabel(layer.metadata, schema.language) || layer.id)}</option>`).join("")}</select></label>`,
        actions: [
            {
                id: "continue",
                label: i18n.t("ui.reuse.next"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            select = overlay.querySelector("[data-library-create-layer]");
        },
    });
    return action === "continue" ? select.value : null;
}

export async function openCreateEntryPopup({
    schemas,
    entries,
    schemaId,
    layerId,
    i18n,
    contributions: suppliedContributions,
    initialLabel = "",
    initialLookup,
}) {
    const schema = schemas.find(({ id }) => id === schemaId);
    const layer = schema?.layers.find(({ id }) => id === layerId);
    if (!schema || !layer) return null;
    const [access, loadedContributions, lookupProviders] = await Promise.all([
        fetchLibraryLocations(schema.language),
        suppliedContributions
            ? Promise.resolve(suppliedContributions)
            : fetchLibraryForms(),
        fetchLibraryLookupProviders({
            schemaId,
            schemaVersion: schema.version,
            layer: layerId,
        }),
    ]);
    const contributions = loadedContributions ?? [];
    const contributedConstructor = contributions.find(
        (item) =>
            item.schemaId === schemaId &&
            item.layerId === layerId &&
            item.cardConstructor,
    )?.cardConstructor;
    const constructor =
        contributedConstructor ??
        layer?.cardConstructor ??
        (layer
            ? {
                  fields: (layer.fields ?? []).map(({ id }) => id),
                  relationships: (layer.relationships ?? []).map(
                      ({ id }) => id,
                  ),
                  input_carousels: [],
                  pronunciation_carousels: [],
                  defaults: {},
              }
            : null);
    if (!constructor || !access.writable.length) return null;
    const contributedFields = contributions
        .filter(
            (item) => item.schemaId === schemaId && item.layerId === layerId,
        )
        .flatMap(({ fields }) => fields ?? []);
    const contributedFieldsById = new Map(
        contributedFields.map((field) => [field.id, field]),
    );
    const composerLayer = {
        ...layer,
        fields: (layer.fields ?? []).map(
            (field) => contributedFieldsById.get(field.id) ?? field,
        ),
    };
    const {
        layer: editingLayer,
        inputCarouselIds,
        pronunciationCarouselLayers,
        derivesPronunciation,
    } = resolveComposerContract(schema, composerLayer, constructor);
    const pronunciationRelationshipIds = new Set(
        pronunciationRelationshipsFor(
            editingLayer,
            schema,
            pronunciationCarouselLayers,
        ).map(({ id }) => id),
    );
    const draft = {
        schemaId,
        schemaVersion: schema.version,
        layer: layerId,
        label: initialLabel,
        fields: structuredClone(constructor.defaults ?? {}),
        references: [],
    };
    const canPublishEveryone = access.writable.some(
        ({ scope }) => scope === "global",
    );
    const writableClasses = access.writable.filter(
        ({ scope }) => scope === "class",
    );
    const supportsTextComposition = [
        "lexicalUnit",
        "orderedLexicalSequence",
    ].includes(layer.semanticRole);
    const supportsRawInput = layer.semanticRole === "compoundWritingUnit";
    const strokeField = editingLayer.fields?.find(
        ({ type }) => type === "strokePattern",
    );
    const enabledLookupProviders = lookupProviders.filter(
        ({ capabilities }) =>
            !capabilities?.includes("dictionary") ||
            (layer.dictionary_lookup !== false &&
                layer.semanticRole !== "orderedLexicalSequence"),
    );
    const normalizedLookupLabels = (metadata) =>
        Object.values(metadata?.labels ?? {}).map((label) =>
            label.trim().normalize("NFKC").toLocaleLowerCase(),
        );
    const providerMatchesField = (provider, field) => {
        if (provider.fields?.includes(field.id)) return true;
        if (provider.capabilities?.includes("strokePattern")) return true;
        const fieldLabels = normalizedLookupLabels(field.metadata);
        return normalizedLookupLabels(provider.metadata).some((providerLabel) =>
            fieldLabels.some(
                (fieldLabel) =>
                    fieldLabel.length > 3 && providerLabel.includes(fieldLabel),
            ),
        );
    };
    const strokeLookupProviders = strokeField
        ? enabledLookupProviders.filter((provider) =>
              providerMatchesField(provider, strokeField),
          )
        : [];
    const generalLookupProviders = enabledLookupProviders.filter(
        (provider) => !strokeLookupProviders.includes(provider),
    );
    const lookupButton = (provider, focused = false) =>
        `<button class="btn-neutral" type="button" data-library-lookup-provider="${escapeHtml(provider.id)}" data-library-lookup-kind="${focused ? "strokePattern" : "dictionary"}"${focused ? ` aria-label="${escapeHtml(`${i18n.t("ui.reuse.lookup")}: ${localizedLabel(provider.metadata, document.documentElement.lang) || provider.id}`)}"` : ""}>${escapeHtml(focused ? i18n.t("ui.reuse.lookup") : i18n.t("gateway.study.library_lookup_with").replace("{{ service }}", localizedLabel(provider.metadata, document.documentElement.lang) || provider.id))}</button>`;
    const lookupActions = `<div class="library-composer-lookups" hidden>${generalLookupProviders.map((provider) => lookupButton(provider)).join("")}</div>`;
    const strokeLookupActions = strokeLookupProviders
        .map((provider) => lookupButton(provider, true))
        .join("");
    const compositionInput = supportsTextComposition
        ? ""
        : supportsRawInput
          ? `<section class="library-composer-text"><label><span>${escapeHtml(i18n.t("gateway.study.library_composer_text"))}</span><input data-library-composer-text data-library-free-text autocomplete="off" value="${escapeHtml(initialLabel)}" required></label><div class="library-composer-assistance">${lookupActions}</div></section>`
          : "";
    const publishControls = `<input name="scope" type="hidden" value="${canPublishEveryone ? "global" : "user"}">${
        access.readable.some(({ scope }) => scope === "global") &&
        !canPublishEveryone
            ? `<label class="library-admin-checkbox library-publish-choice"><input name="publishEveryone" type="checkbox" class="choice-checkbox"><span>${escapeHtml(i18n.t("gateway.study.library_publish_everyone"))}</span>${renderInfoTooltip(i18n.t("gateway.study.library_publish_everyone_info"), i18n.t("ui.reuse.more_information"))}</label>`
            : ""
    }${
        writableClasses.length && !canPublishEveryone
            ? `<label class="library-admin-checkbox"><input name="publishClass" type="checkbox" class="choice-checkbox" data-library-publish-class-toggle> <span>${escapeHtml(i18n.t("gateway.study.library_publish_class_option"))}</span></label><label data-library-class-choice hidden><span>${escapeHtml(i18n.t("gateway.study.library_class"))}</span><select name="classId">${writableClasses.map(({ scopeId }) => `<option value="${escapeHtml(scopeId)}">${escapeHtml(scopeId)}</option>`).join("")}</select></label>`
            : '<input type="hidden" name="classId" value="">'
    }${compositionInput}${renderComposerExtras(constructor, editingLayer, entries, schema)}`;
    const { html, builder } = editorBody(
        draft,
        [
            {
                ...schema,
                layers: schema.layers.map((item) =>
                    item.id === layerId ? editingLayer : item,
                ),
            },
        ],
        entries,
        i18n,
        publishControls,
        {
            labelText:
                layer.semanticRole === "compoundWritingUnit"
                    ? i18n.t("gateway.study.library_composer_text")
                    : localizedLabel(constructor.label, schema.language) ||
                      i18n.t("gateway.study.library_admin_label"),
            includeAlwaysShowDefinition:
                constructor.allowAlwaysShowDefinition === true,
            includeHidden: false,
            relationshipCarousels: true,
            inlinePronunciationCarousel: true,
            inputCarouselIds,
            hideInputHeading: layer.semanticRole === "lexicalUnit",
            compositionLookupHtml: supportsTextComposition ? lookupActions : "",
            pronunciationCarouselLayers,
            tagCarousels: constructor.tag_carousels,
            generatedLabel: supportsTextComposition || supportsRawInput,
            persistentExtra: true,
            allowDefinitionCreate: layer.semanticRole !== "definition",
        },
    );
    let form;
    let carouselController;
    const cardType =
        localizedLabel(layer.metadata, schema.language) || layer.id;
    const nestedDefinitionIds = [];
    const rollbackNestedDefinitions = async () => {
        if (!nestedDefinitionIds.length) return;
        await deleteLibraryEntries(nestedDefinitionIds);
        for (let index = entries.length - 1; index >= 0; index -= 1) {
            if (nestedDefinitionIds.includes(entries[index].id))
                entries.splice(index, 1);
        }
        nestedDefinitionIds.length = 0;
    };
    let createdEntry = null;
    const submitEntry = async () => {
        let publishEveryone =
            canPublishEveryone ||
            form.elements.publishEveryone?.checked === true;
        const scope =
            publishEveryone && canPublishEveryone
                ? "global"
                : form.elements.publishClass?.checked
                  ? "class"
                  : "user";
        const scopeId =
            scope === "class"
                ? form.elements.classId.value
                : scope === "global"
                  ? "global"
                  : undefined;
        const references = readReferences(
            form,
            editingLayer,
            form.compositionOrder ?? [],
        );
        const fields = readFields(form, editingLayer, draft);
        applyDerivedPronunciation(
            fields,
            references,
            entries,
            schema,
            editingLayer,
            derivesPronunciation,
        );
        const candidate = {
            ...draft,
            label: form.elements.label.value,
            class: form.elements.class.value || undefined,
            tags: form.elements.tags.value.split("\u001f").filter(Boolean),
            fields,
            references,
            referenceGroups: readReferenceGroups(form),
            definitionLanguages:
                layer.semanticRole === "definition"
                    ? DEFINITION_LANGUAGES
                    : undefined,
            alwaysShowDefinition:
                form.elements.alwaysShowDefinition?.checked === true,
            linkedEntries: structuredClone(form.libraryLinkedEntries ?? []),
            hidden:
                form.elements.hidden?.value === "true" ||
                form.elements.hidden?.checked === true,
        };
        let location = { scope, scopeId };
        const intended = publishEveryone
            ? { scope: "global", scopeId: "global" }
            : location;
        if (canPublishEveryone) {
            const dependencies = incompatibleDependencies(
                candidate,
                intended,
                entries,
            );
            if (dependencies.length) {
                showToast(
                    i18n
                        .t("gateway.study.library_publish_dependencies_first")
                        .replace(
                            "{{ cards }}",
                            dependencies.map(({ label }) => label).join(" · "),
                        ),
                    { variant: "error" },
                );
                return null;
            }
        }
        const resolved = canPublishEveryone
            ? intended
            : await resolveCreationScope(candidate, intended, entries, i18n);
        if (!resolved) return null;
        if (resolved.scope === "user" && intended.scope !== "user") {
            location = resolved;
            publishEveryone = false;
        }
        try {
            const created = await createLibraryEntry(location, candidate);
            if (publishEveryone && !canPublishEveryone) {
                try {
                    await requestLibraryPromotion(created.id, {
                        scope: "global",
                        scopeId: "global",
                    });
                } catch {
                    showToast(
                        i18n.t("gateway.study.library_publish_saved_personal"),
                        { variant: "error" },
                    );
                }
            }
            nestedDefinitionIds.length = 0;
            return created;
        } catch (error) {
            if (error.message === "content_conflict") {
                const conflictId = error.details?.conflictEntryId;
                if (conflictId) {
                    const decision = await openPopup({
                        title: i18n.t("gateway.study.library_conflict_title"),
                        body: `<p>${escapeHtml(i18n.t("gateway.study.library_conflict_body"))}</p>`,
                        actions: [
                            {
                                id: "continue",
                                label: i18n.t(
                                    "gateway.study.library_create_anyway",
                                ),
                                variant: "confirm",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "cancel",
                            },
                        ],
                    });
                    if (decision !== "continue") return null;
                    try {
                        const existing = await fetchLibraryEntry(conflictId);
                        nestedDefinitionIds.length = 0;
                        return existing.entry;
                    } catch (fetchError) {
                        void fetchError;
                    }
                }
            }
            const message = error.message.startsWith(
                "field_reference_group_mismatch:",
            )
                ? i18n.t("gateway.study.library_pronunciation_group_error")
                : i18n.t("gateway.study.library_create_error");
            showToast(message, {
                variant: "error",
            });
            return null;
        }
    };
    const action = await openPopup({
        title: i18n
            .t("gateway.study.library_create_typed")
            .replace("{type}", cardType),
        body: html,
        maxWidth: "min(72rem, 96vw)",
        closeProtection: true,
        actions: [
            {
                id: "create",
                label: i18n.t("gateway.study.library_create"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        async onAction(actionId, overlay) {
            if (actionId !== "create") return true;
            const activeForm = overlay.querySelector(
                "[data-library-admin-editor]",
            );
            await activeForm?.libraryLookupPending;
            carouselController?.commitPendingValues();
            activeForm?.compositionController?.validate();
            validateRequiredRelationships(
                activeForm,
                editingLayer,
                schema,
                i18n.t("gateway.study.library_validation_error"),
            );
            const invalidForm =
                activeForm?.querySelector('[data-uploading="true"]') ||
                !activeForm?.checkValidity();
            if (invalidForm) {
                showToast(i18n.t("gateway.study.library_validation_error"), {
                    variant: "error",
                });
                activeForm?.revealFirstInvalidField?.();
                return false;
            }
            const limitViolation = composerLimitViolation(
                activeForm,
                editingLayer,
                schema,
            );
            if (limitViolation) {
                const [messageKey, limitName] = limitViolation;
                showToast(
                    i18n
                        .t(messageKey)
                        .replace(
                            "{{ count }}",
                            String(LIBRARY_COMPOSER_LIMITS[limitName]),
                        ),
                    { variant: "error" },
                );
                return false;
            }
            createdEntry = await submitEntry();
            return createdEntry !== null;
        },
        onOpen(overlay) {
            form = overlay.querySelector("[data-library-admin-editor]");
            builder.attach(form);
            bindLibraryEditorControls(form, draft, i18n, {
                maxTags: LIBRARY_COMPOSER_LIMITS.tags,
            });
            form.compositionOrder = [];
            form.referenceGroups = {};
            bindComposerExtras(form);
            bindCommittedDefinitionEditing(form, {
                schema,
                layer: editingLayer,
                entries,
                i18n,
            });
            carouselController = mountEditableRelationshipCarousels(
                form,
                overlay,
                entries,
                schema,
                editingLayer,
                {
                    i18n,
                    inputCarouselIds,
                    pronunciationCarouselLayers,
                    maxPronunciations: LIBRARY_COMPOSER_LIMITS.pronunciations,
                    selectionOrder: ({ id, value, localIndex }) => {
                        if (pronunciationRelationshipIds.has(id))
                            return localIndex;
                        const index = form.compositionOrder.indexOf(value);
                        return index < 0 ? localIndex : index + 1;
                    },
                    onActivate: (activation) => {
                        if (pronunciationRelationshipIds.has(activation.id))
                            return;
                        return activateCompositionEntry(
                            activation,
                            entries,
                            schema,
                            i18n,
                        );
                    },
                    onChange: ({ id, values }) => {
                        const select = form.elements[`relationship:${id}`];
                        if (!select) return;
                        if (pronunciationRelationshipIds.has(id)) return;
                        const selected = new Set(
                            values.map(compositionTokenEntryId),
                        );
                        const previous = new Set(
                            Array.from(
                                select.selectedOptions,
                                (option) => option.value,
                            ),
                        );
                        form.compositionOrder = form.compositionOrder.filter(
                            (value) =>
                                selected.has(compositionTokenEntryId(value)) ||
                                !previous.has(compositionTokenEntryId(value)),
                        );
                        values.forEach((value) => {
                            if (!previous.has(compositionTokenEntryId(value)))
                                form.compositionOrder.push(value);
                        });
                        Array.from(select.options).forEach((option) => {
                            option.selected = selected.has(option.value);
                        });
                        values.forEach((value) => {
                            const option = Array.from(select.options).find(
                                (candidate) =>
                                    candidate.value ===
                                    compositionTokenEntryId(value),
                            );
                            if (option) select.append(option);
                        });
                        form.dispatchEvent(
                            new Event("library-composition-change"),
                        );
                    },
                    onAdd: async ({ id, carousel }) => {
                        const relationship = editingLayer.relationships.find(
                            (candidate) => candidate.id === id,
                        );
                        if (!relationship) return;
                        const suggestedLabel =
                            carousel.dataset.suggestedLabel ?? "";
                        const created = await openCreateEntryPopup({
                            schemas,
                            entries,
                            schemaId,
                            layerId: relationship.targetLayer,
                            i18n,
                            contributions,
                            initialLabel: suggestedLabel,
                        });
                        delete carousel.dataset.suggestedLabel;
                        if (!created) return;
                        entries.push(created);
                        const select = form.elements[`relationship:${id}`];
                        const option = new Option(
                            created.label,
                            created.id,
                            false,
                            false,
                        );
                        select.append(option);
                        appendHorizontalCarouselItem(carousel, {
                            value: created.id,
                            label: created.label,
                        })?.click();
                        const compositionInput = form.querySelector(
                            "[data-library-composer-text]",
                        );
                        if (compositionInput && suggestedLabel) {
                            compositionInput.value = compositionInput.value
                                .replace(suggestedLabel, "")
                                .trim();
                            compositionInput.dispatchEvent(
                                new Event("input", { bubbles: true }),
                            );
                        }
                    },
                },
            );
            form.compositionController = bindTextComposition(
                form,
                entries,
                editingLayer,
                schema,
                i18n,
                inputCarouselIds,
            );
            if (supportsRawInput)
                bindRawInput(form, i18n, {
                    entries,
                    schema,
                    layer: editingLayer,
                });
            bindLookupProviders(form, draft, i18n, {
                schema,
                layer: editingLayer,
                entries,
                nestedDefinitionIds,
                inputCarouselIds,
                definitionLocation: canPublishEveryone
                    ? { scope: "global", scopeId: "global" }
                    : { scope: "user" },
            });
            if (initialLookup)
                form.dispatchEvent(
                    new CustomEvent("library-import-dictionary", {
                        detail: initialLookup,
                    }),
                );
            const strokeLookup = form.querySelector(
                "[data-library-stroke-lookup]",
            );
            if (strokeLookup) strokeLookup.innerHTML = strokeLookupActions;
            renderStrokePatternPreviews(form);
            form.querySelector(
                "[data-library-add-definition]",
            )?.addEventListener("click", async () => {
                const relationship = editingLayer.relationships.find(
                    ({ targetLayer }) =>
                        schema.layers.find(({ id }) => id === targetLayer)
                            ?.semanticRole === "definition",
                );
                if (!relationship) return;
                const select = form.elements[`relationship:${relationship.id}`];
                if (
                    Array.from(select?.selectedOptions ?? []).length >=
                    LIBRARY_COMPOSER_LIMITS.definitions
                ) {
                    showToast(
                        i18n
                            .t("gateway.study.library_definition_limit")
                            .replace(
                                "{{ count }}",
                                String(LIBRARY_COMPOSER_LIMITS.definitions),
                            ),
                        { variant: "error" },
                    );
                    return;
                }
                let result;
                try {
                    result = await openDefinitionPopup({
                        schema,
                        schemaId,
                        layerId: relationship.targetLayer,
                        entries,
                        i18n,
                        location: canPublishEveryone
                            ? { scope: "global", scopeId: "global" }
                            : { scope: "user" },
                    });
                } catch {
                    showToast(i18n.t("gateway.study.library_create_error"), {
                        variant: "error",
                    });
                    return;
                }
                if (!result) return;
                const { entry: definition, created } = result;
                if (created) nestedDefinitionIds.push(definition.id);
                linkDefinition(form, schema, editingLayer, entries, definition);
                if (!created)
                    showToast(
                        i18n.t("gateway.study.library_definition_reused"),
                        { variant: "success" },
                    );
            });
            const publishClass = form.elements.publishClass;
            const classChoice = form.querySelector(
                "[data-library-class-choice]",
            );
            publishClass?.addEventListener("change", () => {
                if (classChoice) classChoice.hidden = !publishClass.checked;
            });
        },
    });
    carouselController?.abort();
    if (action !== "create" || !createdEntry) {
        await rollbackNestedDefinitions();
        return null;
    }
    return createdEntry;
}
