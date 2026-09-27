import { mountHorizontalCarousels } from "/static/reuse/horizontal-carousel.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

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
                        `<button class="btn-neutral library-composition-block" type="button" data-library-selected-reference="${escapeHtml(entry.id)}"><span>${escapeHtml(entry.label)}</span><span aria-hidden="true">×</span></button>`,
                )
                .join("");
        }
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
    form.addEventListener(
        "click",
        (event) => {
            const selected = event.target.closest(
                "[data-library-selected-reference]",
            );
            if (!selected) return;
            const kind = selected.closest("[data-library-selected-references]")
                ?.dataset.librarySelectedReferences;
            const carouselItem = relationshipIdsForKind(kind)
                .map((relationshipId) =>
                    form.querySelector(
                        `[data-horizontal-carousel="${CSS.escape(relationshipId)}"] [data-carousel-value="${CSS.escape(selected.dataset.librarySelectedReference)}"].is-selected`,
                    ),
                )
                .find(Boolean);
            carouselItem?.click();
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
