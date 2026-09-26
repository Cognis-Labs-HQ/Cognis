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
        pronunciationCarouselIds = new Set(),
    } = {},
) {
    const pronunciationRelationshipIds = new Set(
        pronunciationRelationshipsFor(
            layer,
            schema,
            pronunciationCarouselIds,
        ).map(({ id }) => id),
    );
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
            onChange({ id, values });
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
                const blocks = form.querySelector(
                    "[data-library-pronunciation-blocks]",
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
                if (blocks) {
                    blocks.replaceChildren();
                    selectedEntries.forEach((candidate) => {
                        const block = document.createElement("span");
                        block.dataset.pronunciationEntry = candidate.id;
                        block.textContent = candidate.label;
                        blocks.append(block);
                    });
                }
            }
        },
        onAdd,
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
                const textInput = form.querySelector(
                    "[data-library-pronunciation-text]",
                );
                const selectedLabels = Array.from(pronunciationRelationshipIds)
                    .flatMap(
                        (relationshipId) =>
                            draftValues.get(relationshipId) ?? [],
                    )
                    .map((entryId) =>
                        entries.find((candidate) => candidate.id === entryId),
                    )
                    .filter(Boolean)
                    .map((candidate) => candidate.label)
                    .join("");
                const value =
                    `${selectedLabels}${textInput?.value ?? ""}`.trim();
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
                form.querySelector(
                    "[data-library-pronunciation-blocks]",
                )?.replaceChildren();
                if (textInput) textInput.value = "";
            });
        },
    );
    return controller;
}

export function pronunciationRelationshipsFor(layer, _schema, configuredIds) {
    if (layer?.semanticRole === "orderedLexicalSequence") return [];
    return (layer?.relationships ?? []).filter(({ id }) =>
        configuredIds.has(id),
    );
}
