import { mountHorizontalCarousels } from "/static/reuse/horizontal-carousel.js";

export function mountEditableRelationshipCarousels(
    form,
    overlay,
    entries,
    schema,
    layer,
    {
        onChange = () => {},
        onAdd = () => {},
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
    overlay.addEventListener("close", () => controller.abort(), { once: true });
    mountHorizontalCarousels(form, {
        signal: controller.signal,
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
        },
        onAdd,
    });
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
