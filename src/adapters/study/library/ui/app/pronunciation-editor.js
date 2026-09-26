import { mountHorizontalCarousels } from "/static/reuse/horizontal-carousel.js";

export function mountEditableRelationshipCarousels(
    form,
    overlay,
    entries,
    schema,
    layer,
) {
    const pronunciationRelationshipIds = new Set(
        layer.fields?.find(({ id }) => id === "pronunciation")?.input
            ?.linkRelationships ?? [],
    );
    pronunciationRelationshipsFor(
        layer,
        schema,
        pronunciationRelationshipIds,
    ).forEach(({ id }) => pronunciationRelationshipIds.add(id));
    const controller = new AbortController();
    const committedValues = new Map();
    const draftValues = new Map();
    pronunciationRelationshipIds.forEach((relationshipId) => {
        const select = form.elements[`relationship:${relationshipId}`];
        committedValues.set(
            relationshipId,
            new Set(
                Array.from(select?.selectedOptions ?? [], (option) =>
                    String(option.value),
                ),
            ),
        );
        draftValues.set(relationshipId, []);
    });
    overlay.addEventListener("close", () => controller.abort(), { once: true });
    mountHorizontalCarousels(form, {
        signal: controller.signal,
        onChange: ({ id, values }) => {
            const select = form.elements[`relationship:${id}`];
            if (!select) return;
            if (pronunciationRelationshipIds.has(id))
                draftValues.set(id, values);
            const selected = new Set([
                ...(committedValues.get(id) ?? []),
                ...values,
            ]);
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
                const current = form.querySelector(
                    "[data-library-pronunciation-current]",
                );
                const selectedEntries = Array.from(pronunciationRelationshipIds)
                    .flatMap(
                        (relationshipId) =>
                            draftValues.get(relationshipId) ?? [],
                    )
                    .map((value) =>
                        entries.find((candidate) => candidate.id === value),
                    )
                    .filter(Boolean);
                const pronunciationValue = selectedEntries
                    .map((candidate) => {
                        const candidatePronunciation =
                            candidate.fields?.pronunciation;
                        return (
                            (Array.isArray(candidatePronunciation)
                                ? candidatePronunciation[0]
                                : candidatePronunciation) || candidate.label
                        );
                    })
                    .join("");
                if (current) {
                    current.dataset.pronunciationValue = pronunciationValue;
                    current.textContent = selectedEntries
                        .map((candidate) => candidate.label)
                        .join("");
                }
            }
        },
    });
    pronunciationRelationshipIds.forEach((relationshipId) => {
        const carousel = form.querySelector(
            `[data-horizontal-carousel="${CSS.escape(relationshipId)}"]`,
        );
        carousel?.querySelectorAll("[data-carousel-value]").forEach((item) => {
            item.classList.remove("is-selected");
            item.setAttribute("aria-pressed", "false");
            item.querySelector("[data-carousel-order]").textContent = "";
        });
        const output = carousel?.querySelector("[data-carousel-selection]");
        if (output) output.textContent = "";
    });
    form.querySelectorAll("[data-library-pronunciation-commit]").forEach(
        (button) => {
            button.addEventListener("click", () => {
                const pronunciation = form.elements["field:pronunciation"];
                const current = form.querySelector(
                    "[data-library-pronunciation-current]",
                );
                const value = current?.dataset.pronunciationValue?.trim();
                if (!pronunciation || !value) return;
                const values = pronunciation.value
                    .split("\u001f")
                    .filter(Boolean);
                if (!values.includes(value)) values.push(value);
                pronunciation.value = values.join("\u001f");
                const list = form.querySelector(
                    "[data-library-pronunciation-values]",
                );
                if (
                    list &&
                    !list.querySelector(`[data-value="${CSS.escape(value)}"]`)
                ) {
                    const item = document.createElement("span");
                    item.dataset.value = value;
                    item.textContent = value;
                    list.append(item);
                }
                pronunciationRelationshipIds.forEach((relationshipId) => {
                    const committed = committedValues.get(relationshipId);
                    (draftValues.get(relationshipId) ?? []).forEach((entryId) =>
                        committed.add(entryId),
                    );
                    draftValues.set(relationshipId, []);
                    const carousel = form.querySelector(
                        `[data-horizontal-carousel="${CSS.escape(relationshipId)}"]`,
                    );
                    carousel
                        ?.querySelectorAll("[data-carousel-value]")
                        .forEach((item) => {
                            item.classList.remove("is-selected");
                            item.setAttribute("aria-pressed", "false");
                            item.querySelector(
                                "[data-carousel-order]",
                            ).textContent = "";
                        });
                    const output = carousel?.querySelector(
                        "[data-carousel-selection]",
                    );
                    if (output) output.textContent = "";
                });
                current.textContent = "";
                delete current.dataset.pronunciationValue;
            });
        },
    );
}

export function pronunciationRelationshipsFor(layer, schema, configuredIds) {
    if (layer?.semanticRole === "orderedLexicalSequence") return [];
    const configured = (layer?.relationships ?? []).filter(({ id }) =>
        configuredIds.has(id),
    );
    if (configured.length) return configured;
    const targetRoles = ["compoundWritingUnit", "lexicalUnit"].includes(
        layer?.semanticRole,
    )
        ? new Set(["atomicWritingUnit"])
        : null;
    const semanticMatches = (layer?.relationships ?? []).filter(
        (relationship) =>
            targetRoles?.has(
                schema.layers.find(({ id }) => id === relationship.targetLayer)
                    ?.semanticRole,
            ),
    );
    return semanticMatches;
}
