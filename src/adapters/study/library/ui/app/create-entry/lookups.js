import { chooseLookupSuggestion } from "./lookup-choice.js";
import { separateLookupDefinitions } from "./lookup-definitions.js";
import { resolveLookupReferences } from "./lookup-references.js";
import { setGeneratedPronunciation } from "./pronunciation-draft.js";
import { fetchLibraryLookupSuggestions } from "/static/gateways/study/ui/library-client.js";
import { showToast } from "/static/reuse/toast.js";
import { renderStrokePatternPreviews } from "../field-input.js";
import { createDefinition, linkDefinition } from "./definition-editor.js";
import {
    hasLookupValues,
    confirmLookupReplacement,
    clearLookupValues,
} from "./lookup-replacement.js";
export function applyLookupFields(form, fields, draft) {
    Object.entries(fields ?? {}).forEach(([fieldId, value]) => {
        draft.fields[fieldId] = value;
        const control = form.elements[`field:${fieldId}`];
        if (!control) return;
        if (control.hasAttribute("data-library-provider-field")) {
            control.libraryFieldValue = value;
            renderStrokePatternPreviews(form);
            return;
        }
        if (control instanceof RadioNodeList) {
            Array.from(control).forEach((option) => {
                option.checked = Array.isArray(value)
                    ? value.includes(option.value)
                    : option.value === value;
            });
            return;
        }
        if (control.type === "checkbox") {
            control.checked = value === true;
            return;
        }
        if (control.multiple) {
            Array.from(control.options).forEach((option) => {
                option.selected = Array.isArray(value)
                    ? value.includes(option.value)
                    : option.value === value;
            });
            return;
        }
        control.value = Array.isArray(value)
            ? value.join(fieldId === "pronunciation" ? "\n" : "\u001f")
            : value && typeof value === "object"
              ? JSON.stringify(value)
              : value;
        control.dispatchEvent(new Event("input", { bubbles: true }));
    });
}

export function bindRawInput(form, _i18n, { entries, schema, layer }) {
    const input = form.querySelector("[data-library-free-text]");
    const lookups = form.querySelector(".library-composer-lookups");
    const sync = () => {
        const value = input.value.trim();
        form.elements.label.value = value;
        input.dataset.lookupApproved = "";
        input.setCustomValidity("");
        if (lookups) lookups.hidden = !value;
        const candidate = entries.find(
            (entry) =>
                entry.schemaId === schema.id &&
                entry.layer === layer.id &&
                entry.label.trim().normalize("NFKC") ===
                    value.normalize("NFKC"),
        );
        setGeneratedPronunciation(form, candidate?.fields?.pronunciation ?? []);
    };
    input.addEventListener("input", sync);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") event.preventDefault();
    });
    sync();
}

export function bindLookupProviders(
    form,
    draft,
    i18n,
    {
        schema,
        layer,
        entries,
        nestedDefinitionIds,
        definitionLocation,
        inputCarouselIds = new Set(),
    },
) {
    const handleLookup = async (event) => {
        const imported =
            event.type === "library-import-dictionary" ? event.detail : null;
        const button = imported
            ? form.querySelector(
                  `[data-library-lookup-provider="${CSS.escape(imported.providerId)}"]`,
              )
            : event.target.closest("[data-library-lookup-provider]");
        if (!button) return;
        const input = form.querySelector("[data-library-composer-text]");
        const label = form.elements.label?.value.trim() || input?.value.trim();
        if (!label) return;
        button.disabled = true;
        try {
            const strokeOnly =
                button.dataset.libraryLookupKind === "strokePattern";
            if (
                !imported &&
                hasLookupValues(form, strokeOnly) &&
                !(await confirmLookupReplacement(i18n, strokeOnly))
            )
                return;
            const suggestions = imported
                ? [imported.suggestion]
                : await fetchLibraryLookupSuggestions(
                      button.dataset.libraryLookupProvider,
                      { ...draft, label },
                  );
            if (!suggestions.length) {
                showToast(i18n.t("gateway.study.library_lookup_empty"), {
                    variant: "info",
                });
                return;
            }
            if (strokeOnly) {
                const fields = suggestions[0].fields ?? {};
                if (
                    !Object.values(fields).some(
                        (value) => value?.strokes?.length,
                    )
                ) {
                    showToast(i18n.t("gateway.study.library_lookup_empty"), {
                        variant: "info",
                    });
                    return;
                }
                applyLookupFields(form, fields, draft);
                button.hidden = true;
                showToast(i18n.t("gateway.study.library_lookup_applied"), {
                    variant: "success",
                });
                return;
            }
            const selectedSuggestion = await chooseLookupSuggestion(
                suggestions,
                schema,
                layer,
                entries,
                i18n,
            );
            if (!selectedSuggestion) return;
            const { suggestion, unresolved } = resolveLookupReferences(
                selectedSuggestion,
                entries,
                schema,
                layer,
            );
            if (unresolved)
                showToast(i18n.t("gateway.study.library_lookup_unlinked"), {
                    variant: "warning",
                });
            const importedDefinitions = [];
            const definitionRelationship = layer.relationships.find(
                ({ targetLayer }) =>
                    schema.layers.find(({ id }) => id === targetLayer)
                        ?.semanticRole === "definition",
            );
            for (const definition of separateLookupDefinitions(
                suggestion.definitions,
            )) {
                if (!definitionRelationship) break;
                const result = await createDefinition({
                    schema,
                    layerId: definitionRelationship.targetLayer,
                    entries,
                    translations: definition.translations,
                    location: definitionLocation,
                });
                if (result.created) nestedDefinitionIds.push(result.entry.id);
                importedDefinitions.push(result.entry);
            }
            const preserveInput =
                layer.semanticRole === "lexicalUnit" && !imported;
            clearLookupValues(form, draft, {
                preserveComposition: preserveInput,
                preservedRelationshipIds: preserveInput
                    ? inputCarouselIds
                    : new Set(),
            });
            for (const definition of importedDefinitions)
                linkDefinition(form, schema, layer, entries, definition);
            for (const reference of suggestion.references ?? []) {
                if (preserveInput && inputCarouselIds.has(reference.relation))
                    continue;
                const select =
                    form.elements[`relationship:${reference.relation}`];
                const option = Array.from(select?.options ?? []).find(
                    ({ value }) => value === reference.entryId,
                );
                if (option) {
                    option.selected = true;
                    select.append(option);
                    if (inputCarouselIds.has(reference.relation))
                        form.compositionOrder.push(reference.entryId);
                }
            }
            form.libraryLinkedEntries = structuredClone(
                (suggestion.linkedEntries ?? []).map(({ key, entry }) => ({
                    key,
                    entry: {
                        ...entry,
                        references: [
                            ...(entry.references ?? []).filter(
                                (reference) =>
                                    reference.relation !==
                                    definitionRelationship?.id,
                            ),
                            ...importedDefinitions.map((definition) => ({
                                relation:
                                    definitionRelationship?.id || "definitions",
                                entryId: definition.id,
                            })),
                        ],
                    },
                })),
            );
            form.referenceGroups = structuredClone({
                ...form.referenceGroups,
                ...Object.fromEntries(
                    Object.entries(suggestion.referenceGroups ?? {}).filter(
                        ([relation]) =>
                            !preserveInput || !inputCarouselIds.has(relation),
                    ),
                ),
            });
            if (!preserveInput) {
                const canonicalLabel = suggestion.label ?? label;
                const composedLabel = form.compositionOrder
                    .map(
                        (entryId) =>
                            entries.find(({ id }) => id === entryId)?.label ??
                            "",
                    )
                    .join("");
                if (input.hasAttribute("data-library-free-text"))
                    input.value = canonicalLabel;
                else if (canonicalLabel.startsWith(composedLabel))
                    input.value = canonicalLabel.slice(composedLabel.length);
                else {
                    form.compositionOrder = [];
                    input.value = canonicalLabel;
                }
                form.dispatchEvent(new Event("library-composition-change"));
                input.dispatchEvent(new Event("input", { bubbles: true }));
                form.elements.label.value = suggestion.label ?? label;
            }
            form.libraryGeneratedPronunciation = [];
            applyLookupFields(form, suggestion.fields ?? {}, draft);
            if (suggestion.class) form.elements.class.value = suggestion.class;
            const tags = [...new Set(suggestion.tags ?? [])];
            if (form.setLibraryTags) form.setLibraryTags(tags);
            else form.elements.tags.value = tags.join("\u001f");
            form.elements.tags.dispatchEvent(
                new Event("change", { bubbles: true }),
            );
            renderStrokePatternPreviews(form);

            form.libraryLookupLabel = (
                preserveInput ? label : (suggestion.label ?? label)
            )
                .trim()
                .normalize("NFKC");
            if (!preserveInput) {
                if (input.hasAttribute("data-library-free-text"))
                    input.dataset.lookupApproved = "true";
                input.setCustomValidity("");
            }
            form.dispatchEvent(new Event("change", { bubbles: true }));
            form.elements.label.value = preserveInput
                ? label
                : (suggestion.label ?? label);
            draft.label = form.elements.label.value;
            showToast(i18n.t("gateway.study.library_lookup_applied"), {
                variant: "success",
            });
        } catch {
            showToast(i18n.t("gateway.study.library_lookup_error"), {
                variant: "error",
            });
        } finally {
            button.disabled = false;
        }
    };
    let busy = false;
    const runLookup = (event) => {
        if (
            busy ||
            (event.type !== "library-import-dictionary" &&
                !event.target.closest("[data-library-lookup-provider]"))
        )
            return;
        busy = true;
        form.libraryLookupPending = handleLookup(event).finally(() => {
            busy = false;
        });
        return form.libraryLookupPending;
    };
    form.addEventListener("click", runLookup);
    form.addEventListener("library-import-dictionary", runLookup);
}
