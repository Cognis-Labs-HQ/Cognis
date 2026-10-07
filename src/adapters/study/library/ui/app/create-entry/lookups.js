import { setGeneratedPronunciation } from "./pronunciation-draft.js";
import { fetchLibraryLookupSuggestions } from "/static/gateways/study/ui/library-client.js";
import { showToast } from "/static/reuse/toast.js";
import { renderStrokePatternPreviews } from "../field-input.js";
import { createDefinition, linkDefinition } from "./definition-editor.js";
import { chooseLookupSuggestion } from "./lookup-preview.js";
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
    { schema, layer, entries, nestedDefinitionIds },
) {
    form.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-library-lookup-provider]");
        if (!button) return;
        const input = form.querySelector("[data-library-composer-text]");
        const label = input?.value.trim();
        if (!label) return;
        button.disabled = true;
        try {
            const suggestions = await fetchLibraryLookupSuggestions(
                button.dataset.libraryLookupProvider,
                { ...draft, label },
            );
            if (!suggestions.length) {
                showToast(i18n.t("gateway.study.library_lookup_empty"), {
                    variant: "info",
                });
                return;
            }
            const suggestion = await chooseLookupSuggestion(suggestions, i18n);
            if (!suggestion) return;
            const definitionRelationship = layer.relationships.find(
                ({ targetLayer }) =>
                    schema.layers.find(({ id }) => id === targetLayer)
                        ?.semanticRole === "definition",
            );
            for (const definition of suggestion.definitions ?? []) {
                if (!definitionRelationship) break;
                const result = await createDefinition({
                    schema,
                    layerId: definitionRelationship.targetLayer,
                    entries,
                    translations: definition.translations,
                });
                if (result.created) nestedDefinitionIds.push(result.entry.id);
                linkDefinition(form, schema, layer, entries, result.entry);
            }
            for (const reference of suggestion.references ?? []) {
                const select =
                    form.elements[`relationship:${reference.relation}`];
                const option = Array.from(select?.options ?? []).find(
                    ({ value }) => value === reference.entryId,
                );
                if (option) option.selected = true;
            }
            Object.assign(
                form.referenceGroups,
                structuredClone(suggestion.referenceGroups ?? {}),
            );
            if (!input.hasAttribute("data-library-free-text")) input.value = "";
            else input.value = suggestion.label ?? label;
            form.dispatchEvent(new Event("library-composition-change"));
            input.dispatchEvent(new Event("input", { bubbles: true }));
            form.elements.label.value = suggestion.label ?? label;
            form.libraryGeneratedPronunciation = [];
            applyLookupFields(form, suggestion.fields ?? {}, draft);
            if (suggestion.class) form.elements.class.value = suggestion.class;
            if (suggestion.tags) {
                const tags = [
                    ...new Set([
                        ...form.elements.tags.value
                            .split("\u001f")
                            .filter(Boolean),
                        ...suggestion.tags,
                    ]),
                ];
                if (form.setLibraryTags) form.setLibraryTags(tags);
                else form.elements.tags.value = tags.join("\u001f");
                form.elements.tags.dispatchEvent(
                    new Event("change", { bubbles: true }),
                );
            }

            if (input.hasAttribute("data-library-free-text")) {
                input.dataset.lookupApproved = "true";
                input.setCustomValidity("");
            }
            form.dispatchEvent(new Event("change", { bubbles: true }));
            form.elements.label.value = suggestion.label ?? label;
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
    });
}
