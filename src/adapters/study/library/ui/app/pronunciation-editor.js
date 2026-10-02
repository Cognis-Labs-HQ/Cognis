import {
    clearHorizontalCarouselSelection,
    mountHorizontalCarousels,
} from "/static/reuse/horizontal-carousel.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { renderCompositionItems } from "/static/reuse/composition-input.js";
import {
    compositionTokenEntryId,
    compositionTokenLabel,
} from "./composition-tokens.js";

export function mountEditableRelationshipCarousels(
    form,
    overlay,
    entries,
    schema,
    layer,
    {
        onChange = () => {},
        onAdd = () => {},
        onActivate = () => {},
        selectionOrder,
        inputCarouselIds = new Set(),
        pronunciationCarouselLayers = new Set(),
        maxPronunciations = Number.POSITIVE_INFINITY,
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
    const stagedValues = new Map();
    pronunciationRelationshipIds.forEach((relationshipId) => {
        const select = form.elements[`relationship:${relationshipId}`];
        draftValues.set(
            relationshipId,
            Array.from(select?.selectedOptions ?? [], (option) =>
                String(option.value),
            ),
        );
    });
    const compositionFieldForKind = (kind) =>
        form.querySelector(`[data-library-composition-field="${kind}"]`);
    const isMultiValueKind = (kind) =>
        compositionFieldForKind(kind)?.dataset.multiValue === "true";
    const kindForRelationshipId = (relationshipId) =>
        pronunciationRelationshipIds.has(relationshipId)
            ? "pronunciation"
            : "input";
    const selectedReferenceIds = (relationshipIds, kind) => {
        const selected = relationshipIds.flatMap((relationshipId) =>
            isMultiValueKind(kind)
                ? (stagedValues.get(relationshipId) ?? [])
                : Array.from(
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
            const kind = container.dataset.librarySelectedReferences;
            const selected =
                kind === "input"
                    ? (form.compositionOrder ?? [])
                          .map((value) => ({
                              id: value,
                              label: compositionTokenLabel(value, entries),
                          }))
                          .filter(({ label }) => label)
                    : selectedReferenceIds(relationshipIds, kind)
                          .map((id) => entries.find((entry) => entry.id === id))
                          .filter(Boolean);
            container.innerHTML = renderCompositionItems({
                items: selected.map((entry) => ({
                    value: entry.id,
                    label: entry.label,
                })),
                removeLabel: (label) =>
                    i18n
                        .t("gateway.study.library_remove_selected_card")
                        .replace("{{ card }}", label),
                itemAttributes: ({ value }) => ({
                    "data-library-selected-reference": value,
                    ...(kind === "input"
                        ? {
                              "data-library-composition-id": value,
                              draggable: true,
                          }
                        : {}),
                }),
            });
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
        return entries.filter(
            ({ layer: entryLayer, hidden }) =>
                hidden !== true && targetLayers.has(entryLayer),
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
    const clearCarouselItemSelection = (item) => {
        item.classList.remove("is-selected");
        item.setAttribute("aria-pressed", "false");
        const counter = item.querySelector("[data-carousel-order]");
        if (counter) counter.textContent = "";
    };
    const renderSavedValues = (compositionField) => {
        const container =
            compositionField
                .closest("fieldset")
                ?.querySelector("[data-library-saved-values]") ??
            compositionField.previousElementSibling;
        const field = form.elements["field:pronunciation"];
        if (
            !container?.matches("[data-library-saved-values]") ||
            !field ||
            compositionField.dataset.multiValue !== "true"
        )
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
    for (const kind of ["input", "pronunciation"]) {
        if (!isMultiValueKind(kind)) continue;
        for (const relationshipId of relationshipIdsForKind(kind)) {
            stagedValues.set(relationshipId, []);
            form.querySelectorAll(
                `[data-horizontal-carousel="${CSS.escape(relationshipId)}"] [data-carousel-value].is-selected`,
            ).forEach(clearCarouselItemSelection);
        }
    }
    mountHorizontalCarousels(form, {
        signal: controller.signal,
        selectionOrder,
        onActivate,
        onChange: ({ id, values }) => {
            const select = form.elements[`relationship:${id}`];
            if (!select) return;
            const kind = kindForRelationshipId(id);
            if (isMultiValueKind(kind)) {
                stagedValues.set(id, values);
                renderSelectedReferences();
                return;
            }
            onChange({ id, values });
            if (pronunciationRelationshipIds.has(id))
                draftValues.set(id, values);
            const selected = new Set(values.map(compositionTokenEntryId));
            Array.from(select.options).forEach((option) => {
                option.selected = selected.has(option.value);
            });
            values.forEach((value) => {
                const option = Array.from(select.options).find(
                    (candidate) =>
                        candidate.value === compositionTokenEntryId(value),
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
                if (!event.target.matches("[data-composition-remove]")) return;
                const kind = selected.closest(
                    "[data-library-selected-references]",
                )?.dataset.librarySelectedReferences;
                if (isMultiValueKind(kind)) {
                    carouselItem(
                        kind,
                        selected.dataset.librarySelectedReference,
                        true,
                    )?.click();
                    return;
                }
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
                const item = carouselItem(
                    kind,
                    selected.dataset.librarySelectedReference,
                    true,
                );
                if (item) {
                    item.click();
                } else if (kind === "input") {
                    form.compositionOrder = (
                        form.compositionOrder ?? []
                    ).filter(
                        (value) =>
                            value !== selected.dataset.librarySelectedReference,
                    );
                    renderSelectedReferences();
                    form.dispatchEvent(
                        new CustomEvent("library-composition-change"),
                    );
                }
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
                    "[data-composition-suggestions]",
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
            } else if (!event.target.closest("[data-library-edit-saved-value]"))
                return;
            const editingGroups = new Map();
            for (const relationshipId of relationshipIdsForKind(
                compositionField.dataset.libraryCompositionField,
            )) {
                editingGroups.set(
                    relationshipId,
                    (form.referenceGroups?.[relationshipId]?.[index] ?? []).map(
                        ({ entryId }) => entryId,
                    ),
                );
            }
            values.splice(index, 1);
            for (const relationshipId of relationshipIdsForKind(
                compositionField.dataset.libraryCompositionField,
            )) {
                const groups = form.referenceGroups?.[relationshipId];
                if (!groups) continue;
                groups.splice(index, 1);
                if (!groups.length) delete form.referenceGroups[relationshipId];
            }
            field.value = values.join("\n");
            renderSavedValues(compositionField);
            if (event.target.closest("[data-library-edit-saved-value]")) {
                for (const [relationshipId, entryIds] of editingGroups) {
                    stagedValues.set(relationshipId, []);
                    for (const entryId of entryIds)
                        carouselItem(
                            compositionField.dataset.libraryCompositionField,
                            entryId,
                        )?.click();
                }
                renderSelectedReferences();
            }
        },
        { signal: controller.signal },
    );
    form.addEventListener(
        "input",
        (event) => {
            if (event.target === form.elements["field:pronunciation"]) {
                form.querySelectorAll(
                    '[data-library-composition-field="pronunciation"]',
                ).forEach(renderSavedValues);
                return;
            }
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
                "[data-composition-suggestions]",
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
            event.preventDefault();
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
            const relationshipIds = relationshipIdsForKind(kind);
            const value = selectedReferenceIds(relationshipIds, kind)
                .map((id) => entries.find((entry) => entry.id === id)?.label)
                .filter(Boolean)
                .join("");
            if (!value) {
                showToast(
                    i18n.t("gateway.study.library_pronunciation_stage_empty"),
                    { variant: "error" },
                );
                return;
            }
            const field = form.elements["field:pronunciation"];
            const values = valuesForField(field);
            if (
                kind === "pronunciation" &&
                values.length >= maxPronunciations
            ) {
                showToast(
                    i18n
                        .t("gateway.study.library_pronunciation_limit")
                        .replace("{{ count }}", String(maxPronunciations)),
                    { variant: "error" },
                );
                return;
            }
            values.push(value);
            field.value = values.join("\n");
            for (const relationshipId of relationshipIds) {
                const staged = stagedValues.get(relationshipId) ?? [];
                const select = form.elements[`relationship:${relationshipId}`];
                const relationship = layer?.relationships?.find(
                    ({ id }) => id === relationshipId,
                );
                if (relationship?.grouped) {
                    if (staged.length) {
                        const groups = (form.referenceGroups[relationshipId] ??=
                            []);
                        groups.push(
                            staged.map((entryId, position) => ({
                                entryId,
                                relation: relationshipId,
                                position,
                            })),
                        );
                    }
                    stagedValues.set(relationshipId, []);
                } else {
                    const committed = new Set(
                        Array.from(
                            select.selectedOptions,
                            ({ value }) => value,
                        ),
                    );
                    staged.forEach((entryId) => committed.add(entryId));
                    for (const option of select.options)
                        option.selected = committed.has(option.value);
                    onChange({
                        id: relationshipId,
                        values: Array.from(committed),
                    });
                    stagedValues.set(relationshipId, []);
                }
                const carousel = form.querySelector(
                    `[data-horizontal-carousel="${CSS.escape(relationshipId)}"]`,
                );
                if (carousel) clearHorizontalCarouselSelection(carousel);
            }
            renderSelectedReferences();
            renderSavedValues(compositionField);
            form.dispatchEvent(new CustomEvent("library-composition-change"));
            showToast(i18n.t("gateway.study.library_pronunciation_saved"), {
                variant: "success",
            });
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
        return !["definition", "meaning"].includes(target?.semanticRole);
    });
}
