import { setGeneratedPronunciation } from "./pronunciation-draft.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    derivedPronunciation,
    resolveCompositionPrefix,
} from "../composer-contract.js";
import {
    compositionTokenEntryId,
    compositionTokenLabel,
    transformationCompositionToken,
    transformationTokenDetails,
} from "../composition-tokens.js";
import { transformationPathways } from "../transformations.js";
import { entryDefinition } from "./definitions.js";

export function bindTextComposition(
    form,
    entries,
    layer,
    schema,
    i18n,
    inputCarouselIds,
) {
    const input = form.querySelector("[data-library-composer-text]");
    const output = form.querySelector("[data-composition-suggestions]");
    const blocks = form.querySelector("[data-library-composition-blocks]");
    const lookups = form.querySelector(".library-composer-lookups");
    if (!input || !output || !blocks) return { validate: () => true };
    const relationships = (layer.relationships ?? []).filter(({ id }) =>
        inputCarouselIds.has(id),
    );
    const compositionCandidates = () =>
        relationships
            .flatMap((relationship) =>
                entries
                    .filter(
                        (entry) =>
                            entry.layer === relationship.targetLayer &&
                            entry.hidden !== true,
                    )
                    .flatMap((entry) => {
                        const pathways = transformationPathways(entry, schema);
                        const base = {
                            ...entry,
                            relationshipId: relationship.id,
                            preview: pathways.length
                                ? i18n.t(
                                      "gateway.study.library_transforms_available",
                                  )
                                : entryDefinition(entry, entries, schema),
                        };
                        return [
                            base,
                            ...pathways.flatMap(({ set, nodes }) =>
                                nodes.slice(1).map((node) => ({
                                    ...base,
                                    label: node.value,
                                    pronunciation: node.pronunciation,
                                    transformationValue:
                                        transformationCompositionToken(
                                            entry.id,
                                            set.id,
                                            node,
                                        ),
                                    baseEntryId: entry.id,
                                })),
                            ),
                        ];
                    }),
            )
            .sort(
                (left, right) =>
                    Number(Boolean(right.preview)) -
                    Number(Boolean(left.preview)),
            )
            .filter(
                (candidate, index, all) =>
                    all.findIndex(
                        ({ label }) =>
                            label.trim().normalize("NFKC") ===
                            candidate.label.trim().normalize("NFKC"),
                    ) === index,
            );
    const selectedLabels = () => {
        const labels = new Map(
            relationships.flatMap((relationship) =>
                Array.from(
                    form.elements[`relationship:${relationship.id}`]?.options ??
                        [],
                    (option) => [option.value, option.textContent.trim()],
                ),
            ),
        );
        return (form.compositionOrder ?? []).map(
            (value) =>
                labels.get(value) ?? compositionTokenLabel(value, entries),
        );
    };
    const syncPronunciation = () => {
        if (layer.semanticRole === "lexicalUnit") return;
        const control = form.elements["field:pronunciation"];
        if (!control) return;
        const selectedPronunciation = (form.compositionOrder ?? [])
            .map((token) => {
                const transformation = transformationTokenDetails(token);
                if (transformation?.pronunciation)
                    return transformation.pronunciation;
                const entry = entries.find(
                    ({ id }) => id === compositionTokenEntryId(token),
                );
                return entry
                    ? derivedPronunciation(entry, entries, schema)
                    : "";
            })
            .join("");
        const normalizedInput = input.value.trim().normalize("NFKC");
        const candidates = compositionCandidates();
        const resolution = resolveCompositionPrefix(
            normalizedInput,
            candidates,
        );
        const inputPronunciation = resolution.remainder
            ? ""
            : resolution.matches
                  .map((entry) => derivedPronunciation(entry, entries, schema))
                  .join("");
        const pronunciation = `${selectedPronunciation}${inputPronunciation}`;
        setGeneratedPronunciation(form, pronunciation);
    };
    const syncLabel = () => {
        for (const relationship of relationships) {
            const select = form.elements[`relationship:${relationship.id}`];
            for (const token of form.compositionOrder ?? []) {
                const id = compositionTokenEntryId(token);
                const option = select
                    ? Array.from(select.options).find(
                          ({ value }) => value === id,
                      )
                    : null;
                if (option?.selected) select.append(option);
            }
        }
        const resolved = selectedLabels().join("");
        form.elements.label.value = `${resolved}${input.value.trim()}`;
        input.required = !resolved;
        const relationshipParents = form.querySelector(
            "[data-library-relationship-parents]",
        );
        if (relationshipParents) {
            const labels = relationships.flatMap((relationship) =>
                Array.from(
                    form.elements[`relationship:${relationship.id}`]
                        ?.selectedOptions ?? [],
                    (option) => option.textContent.trim(),
                ),
            );
            relationshipParents.innerHTML = labels.length
                ? labels
                      .map((label) => `<span>${escapeHtml(label)}</span>`)
                      .join("")
                : `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_relationships"))}</p>`;
        }
        syncPronunciation();
        if (lookups) lookups.hidden = !form.elements.label.value.trim();
    };
    const renderSuggestions = () => {
        const text = input.value.trim();
        const normalizedText = text.normalize("NFKC");
        const candidates = compositionCandidates();
        const exactMatches = candidates.filter(
            ({ label }) => label.trim().normalize("NFKC") === normalizedText,
        );
        const prefixMatches = resolveCompositionPrefix(
            normalizedText,
            candidates,
        );
        const sequenceMatch =
            !prefixMatches.remainder && prefixMatches.matches.length > 1
                ? `<button class="btn-confirm library-composer-suggestion" type="button" data-library-suggestion-sequence="${escapeHtml(JSON.stringify(prefixMatches.matches.map(({ id, relationshipId, label, transformationValue }) => ({ id, relationshipId, label, transformationValue }))))}">${escapeHtml(text)}</button>`
                : "";
        const matches = exactMatches.length
            ? exactMatches
            : prefixMatches.matches;
        const fallbackRelationship = relationships[0]?.id;
        output.innerHTML = `${sequenceMatch}${matches
            .slice(0, 1)
            .map(
                (match) =>
                    `<button class="btn-neutral library-composer-suggestion" type="button" data-library-suggestion="${escapeHtml(match.id)}" data-relationship="${escapeHtml(match.relationshipId)}" data-suggestion-label="${escapeHtml(match.label)}"${match.transformationValue ? ` data-transformation-value="${escapeHtml(match.transformationValue)}"` : ""}>${escapeHtml(match.label)}${match.preview ? `<span class="horizontal-carousel-preview" role="tooltip"><strong>${escapeHtml(match.label)}</strong><span>${escapeHtml(match.preview)}</span></span>` : ""}</button>`,
            )
            .join(
                "",
            )}${text && fallbackRelationship && !matches.length ? `<button class="btn-confirm library-composer-unmatched" type="button" data-library-create-unmatched="${escapeHtml(fallbackRelationship)}" data-unmatched-label="${escapeHtml(text)}">${escapeHtml(text)} — ${escapeHtml(i18n.t("gateway.study.library_composer_no_match"))}</button>` : ""}`;
        syncLabel();
    };
    input.addEventListener("input", renderSuggestions);
    form.addEventListener("change", syncLabel);
    form.addEventListener("library-composition-change", syncLabel);
    output.addEventListener("click", (event) => {
        const sequence = event.target.closest(
            "[data-library-suggestion-sequence]",
        );
        if (sequence) {
            const suggestions = JSON.parse(
                sequence.dataset.librarySuggestionSequence,
            );
            for (const suggestion of suggestions) {
                const item = form.querySelector(
                    `[data-horizontal-carousel="${CSS.escape(suggestion.relationshipId)}"] [data-carousel-value="${CSS.escape(suggestion.id)}"]`,
                );
                if (item && suggestion.transformationValue)
                    item.dataset.carouselSuggestedTransformation =
                        JSON.stringify({
                            entryId: suggestion.id,
                            value: suggestion.transformationValue,
                            label: suggestion.label,
                        });
                item?.click();
            }
            input.value = "";
            renderSuggestions();
            return;
        }
        const suggestion = event.target.closest("[data-library-suggestion]");
        if (suggestion) {
            const item = form.querySelector(
                `[data-horizontal-carousel="${CSS.escape(suggestion.dataset.relationship)}"] [data-carousel-value="${CSS.escape(suggestion.dataset.librarySuggestion)}"]`,
            );
            if (item && suggestion.dataset.transformationValue)
                item.dataset.carouselSuggestedTransformation = JSON.stringify({
                    entryId: suggestion.dataset.librarySuggestion,
                    value: suggestion.dataset.transformationValue,
                    label: suggestion.dataset.suggestionLabel,
                });
            item?.click();
            input.value = input.value
                .replace(suggestion.dataset.suggestionLabel, "")
                .trim();
            renderSuggestions();
            return;
        }
        const unmatched = event.target.closest(
            "[data-library-create-unmatched]",
        );
        if (!unmatched) return;
        const carousel = form.querySelector(
            `[data-horizontal-carousel="${CSS.escape(unmatched.dataset.libraryCreateUnmatched)}"]`,
        );
        if (!carousel) return;
        carousel.dataset.suggestedLabel = unmatched.dataset.unmatchedLabel;
        carousel.querySelector("[data-carousel-add]")?.click();
    });
    let draggedId = null;
    blocks.addEventListener("dragstart", (event) => {
        const block = event.target.closest("[data-library-composition-id]");
        draggedId = block?.dataset.libraryCompositionId ?? null;
        if (draggedId) event.dataTransfer?.setData("text/plain", draggedId);
    });
    blocks.addEventListener("dragover", (event) => event.preventDefault());
    blocks.addEventListener("drop", (event) => {
        event.preventDefault();
        const target = event.target.closest("[data-library-composition-id]");
        const targetId = target?.dataset.libraryCompositionId;
        if (!draggedId || !targetId || draggedId === targetId) return;
        const order = form.compositionOrder.filter((id) => id !== draggedId);
        order.splice(order.indexOf(targetId), 0, draggedId);
        form.compositionOrder = order;
        syncLabel();
    });
    renderSuggestions();
    return {
        validate() {
            syncLabel();
            const dictionaryLabel = form.libraryLookupLabel;
            const fromDictionary =
                dictionaryLabel &&
                dictionaryLabel ===
                    form.elements.label.value.trim().normalize("NFKC");
            const unresolved =
                !fromDictionary &&
                relationships.length > 0 &&
                input.value.trim();
            input.setCustomValidity(
                unresolved
                    ? i18n.t("gateway.study.library_composer_resolve_input")
                    : "",
            );
            return !unresolved;
        },
    };
}
