import { mountHorizontalCarousels } from "/static/reuse/horizontal-carousel.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";

export function mountEditableRelationshipCarousels(
    form,
    overlay,
    entries,
    schema,
    layer,
    {
        onChange = () => {},
        onAdd = () => {},
        selectionOrder,
        inputCarouselIds = new Set(),
        pronunciationCarouselLayers = new Set(),
        i18n,
    } = {},
) {
    const pronunciationRelationshipIds = new Set(
        pronunciationRelationshipsFor(
            layer,
            schema,
            pronunciationCarouselLayers,
        ).map(({ id }) => id),
    );
    const controller = new AbortController();
    const draftValues = new Map();
    pronunciationRelationshipIds.forEach((relationshipId) => {
        const select = form.elements[`relationship:${relationshipId}`];
        draftValues.set(
            relationshipId,
            Array.from(select?.selectedOptions ?? [], (option) =>
                String(option.value),
            ),
        );
    });
    const selectedReferenceIds = (relationshipIds) => {
        const selected = relationshipIds.flatMap((relationshipId) =>
            Array.from(
                form.elements[`relationship:${relationshipId}`]
                    ?.selectedOptions ?? [],
                ({ value }) => value,
            ),
        );
        const authoredOrder = form.compositionOrder ?? [];
        return selected.toSorted((left, right) => {
            const leftIndex = authoredOrder.indexOf(left);
            const rightIndex = authoredOrder.indexOf(right);
            return (
                (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
                (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
            );
        });
    };
    const relationshipIdsForKind = (kind) =>
        kind === "pronunciation"
            ? Array.from(pronunciationRelationshipIds)
            : Array.from(inputCarouselIds);
    const renderSelectedReferences = () => {
        for (const container of form.querySelectorAll(
            "[data-library-selected-references]",
        )) {
            const relationshipIds = relationshipIdsForKind(
                container.dataset.librarySelectedReferences,
            );
            container.innerHTML = selectedReferenceIds(relationshipIds)
                .map((id) => entries.find((entry) => entry.id === id))
                .filter(Boolean)
                .map(
                    (entry) =>
                        `<span class="btn-neutral library-composition-block" data-library-selected-reference="${escapeHtml(entry.id)}"><span>${escapeHtml(entry.label)}</span><button class="btn-cancel" type="button" data-library-remove-selected-reference aria-label="${escapeHtml(i18n.t("gateway.study.library_remove_selected_card").replace("{{ card }}", entry.label))}">×</button></span>`,
                )
                .join("");
        }
    };
    const entriesForKind = (kind) => {
        const targetLayers = new Set(
            relationshipIdsForKind(kind).map(
                (relationshipId) =>
                    layer?.relationships?.find(
                        ({ id }) => id === relationshipId,
                    )?.targetLayer,
            ),
        );
        return entries.filter(({ layer: entryLayer }) =>
            targetLayers.has(entryLayer),
        );
    };
    const carouselItem = (kind, entryId, selectedOnly = false) =>
        relationshipIdsForKind(kind)
            .map((relationshipId) =>
                form.querySelector(
                    `[data-horizontal-carousel="${CSS.escape(relationshipId)}"] [data-carousel-value="${CSS.escape(entryId)}"]${selectedOnly ? ".is-selected" : ""}`,
                ),
            )
            .find(Boolean);
    const valuesForField = (field) =>
        field.value
            .split(/\r?\n/u)
            .map((value) => value.trim())
            .filter(Boolean);
    const renderSavedValues = (compositionField) => {
        const container = compositionField.previousElementSibling;
        const field = form.elements["field:pronunciation"];
        if (!container?.matches("[data-library-saved-values]") || !field)
            return;
        const values = valuesForField(field);
        container.hidden = values.length === 0;
        container.innerHTML = values
            .map(
                (value, index) =>
                    `<span class="library-composer-saved-value" data-library-saved-index="${index}"><button class="btn-neutral" type="button" data-library-edit-saved-value>${escapeHtml(value)}</button><button class="btn-cancel" type="button" data-library-delete-saved-value aria-label="${escapeHtml(i18n.t("gateway.study.library_delete_saved_value").replace("{{ field }}", "Pronunciation"))}">×</button></span>`,
            )
            .join("");
    };
    overlay.addEventListener("close", () => controller.abort(), { once: true });
    mountHorizontalCarousels(form, {
        signal: controller.signal,
        selectionOrder,
        onChange: ({ id, values }) => {
            const select = form.elements[`relationship:${id}`];
            if (!select) return;
            onChange({ id, values });
            if (pronunciationRelationshipIds.has(id))
                draftValues.set(id, values);
            const selected = new Set(values);
            Array.from(select.options).forEach((option) => {
                option.selected = selected.has(option.value);
            });
            values.forEach((value) => {
                const option = Array.from(select.options).find(
                    (candidate) => candidate.value === value,
                );
                if (option) select.append(option);
            });
            const pronunciation = form.elements["field:pronunciation"];
            if (pronunciation && pronunciationRelationshipIds.has(id)) {
                const selectedEntries = Array.from(pronunciationRelationshipIds)
                    .flatMap(
                        (relationshipId) =>
                            draftValues.get(relationshipId) ?? [],
                    )
                    .map((value) =>
                        entries.find((candidate) => candidate.id === value),
                    )
                    .filter(Boolean);
                pronunciation.value = selectedEntries
                    .map((candidate) => candidate.label)
                    .join("");
            }
            renderSelectedReferences();
        },
        onAdd,
    });
    renderSelectedReferences();
    form.querySelectorAll("[data-library-composition-field]").forEach(
        renderSavedValues,
    );
    form.addEventListener(
        "click",
        async (event) => {
            const selected = event.target.closest(
                "[data-library-selected-reference]",
            );
            if (selected) {
                if (
                    !event.target.closest(
                        "[data-library-remove-selected-reference]",
                    )
                )
                    return;
                const confirmed = await openPopup({
                    title: i18n.t("gateway.study.library_remove_selection"),
                    body: `<p>${escapeHtml(i18n.t("gateway.study.library_remove_selection_confirm"))}</p>`,
                    actions: [
                        {
                            id: "remove",
                            label: i18n.t("ui.reuse.delete"),
                            variant: "cancel",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "neutral",
                        },
                    ],
                });
                if (confirmed !== "remove") return;
                const kind = selected.closest(
                    "[data-library-selected-references]",
                )?.dataset.librarySelectedReferences;
                carouselItem(
                    kind,
                    selected.dataset.librarySelectedReference,
                    true,
                )?.click();
                return;
            }
            const suggestion = event.target.closest(
                "[data-library-carousel-suggestion]",
            );
            if (suggestion) {
                const compositionField = suggestion.closest(
                    "[data-library-composition-field]",
                );
                carouselItem(
                    compositionField.dataset.libraryCompositionField,
                    suggestion.dataset.libraryCarouselSuggestion,
                )?.click();
                const input = compositionField.querySelector(
                    "[data-library-carousel-text]",
                );
                input.value = "";
                input.setCustomValidity("");
                compositionField.querySelector(
                    "[data-library-carousel-suggestions]",
                ).innerHTML = "";
                return;
            }
            const savedValue = event.target.closest(
                "[data-library-saved-index]",
            );
            if (!savedValue) return;
            const compositionField = savedValue.closest(
                "[data-library-saved-values]",
            ).nextElementSibling;
            const field = form.elements["field:pronunciation"];
            const values = valuesForField(field);
            const index = Number(savedValue.dataset.librarySavedIndex);
            if (event.target.closest("[data-library-delete-saved-value]")) {
                const confirmed = await openPopup({
                    title: i18n.t(
                        "gateway.study.library_delete_saved_value_title",
                    ),
                    body: `<p>${escapeHtml(i18n.t("gateway.study.library_delete_saved_value_confirm"))}</p>`,
                    actions: [
                        {
                            id: "delete",
                            label: i18n.t("ui.reuse.delete"),
                            variant: "cancel",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "neutral",
                        },
                    ],
                });
                if (confirmed !== "delete") return;
            } else {
                compositionField.dataset.editingSavedIndex = String(index);
                const kind = compositionField.dataset.libraryCompositionField;
                for (const entryId of selectedReferenceIds(
                    relationshipIdsForKind(kind),
                ))
                    carouselItem(kind, entryId, true)?.click();
                let remaining = values[index] ?? "";
                const candidates = entriesForKind(kind).toSorted(
                    (left, right) => right.label.length - left.label.length,
                );
                while (remaining) {
                    const match = candidates.find(({ label }) =>
                        remaining.startsWith(label),
                    );
                    if (!match) break;
                    carouselItem(kind, match.id)?.click();
                    remaining = remaining.slice(match.label.length);
                }
                const input = compositionField.querySelector(
                    "[data-library-carousel-text]",
                );
                input.value = remaining;
                input.dispatchEvent(new Event("input", { bubbles: true }));
            }
            values.splice(index, 1);
            field.value = values.join("\n");
            renderSavedValues(compositionField);
        },
        { signal: controller.signal },
    );
    form.addEventListener(
        "input",
        (event) => {
            const input = event.target.closest("[data-library-carousel-text]");
            if (!input) return;
            const compositionField = input.closest(
                "[data-library-composition-field]",
            );
            const text = input.value.trim().normalize("NFKC");
            input.setCustomValidity(
                text ? i18n.t("gateway.study.library_select_suggestion") : "",
            );
            compositionField.querySelector(
                "[data-library-carousel-suggestions]",
            ).innerHTML = text
                ? entriesForKind(
                      compositionField.dataset.libraryCompositionField,
                  )
                      .filter(({ label }) =>
                          label.normalize("NFKC").includes(text),
                      )
                      .slice(0, 8)
                      .map(
                          (entry) =>
                              `<button class="btn-neutral" type="button" data-library-carousel-suggestion="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</button>`,
                      )
                      .join("")
                : "";
        },
        { signal: controller.signal },
    );
    form.addEventListener(
        "click",
        (event) => {
            const save = event.target.closest(
                "[data-library-save-composed-value]",
            );
            if (!save) return;
            const compositionField = save.closest(
                "[data-library-composition-field]",
            );
            const input = compositionField.querySelector(
                "[data-library-carousel-text]",
            );
            if (input.value.trim()) {
                input.reportValidity();
                return;
            }
            const kind = compositionField.dataset.libraryCompositionField;
            const value = selectedReferenceIds(relationshipIdsForKind(kind))
                .map((id) => entries.find((entry) => entry.id === id)?.label)
                .filter(Boolean)
                .join("");
            if (!value) return;
            const field = form.elements["field:pronunciation"];
            const values = valuesForField(field);
            const editingIndex = Number(
                compositionField.dataset.editingSavedIndex,
            );
            if (Number.isSafeInteger(editingIndex) && editingIndex >= 0)
                values.splice(editingIndex, 0, value);
            else values.push(value);
            delete compositionField.dataset.editingSavedIndex;
            field.value = values.join("\n");
            renderSavedValues(compositionField);
        },
        { signal: controller.signal },
    );
    return controller;
}

export function pronunciationRelationshipsFor(layer, schema, configuredIds) {
    if (layer?.semanticRole === "orderedLexicalSequence") return [];
    const configured = (layer?.relationships ?? []).filter(({ targetLayer }) =>
        configuredIds.has(targetLayer),
    );
    const explicit = configured.filter(
        ({ presentationRole }) => presentationRole === "pronunciation",
    );
    if (explicit.length > 0) return explicit;
    if (layer?.semanticRole !== "compoundWritingUnit") return [];
    return configured.filter(({ targetLayer }) => {
        const target = schema?.layers?.find(({ id }) => id === targetLayer);
        return target?.semanticRole === "atomicWritingUnit";
    });
}
