import { groupLookupSuggestions } from "./lookup-matches.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderCardContents } from "../cards.js";

/** Choose a dictionary match before any values or dependent cards are committed. */
export async function chooseLookupSuggestion(
    suggestions,
    schema,
    layer,
    entries,
    i18n,
    query = suggestions[0]?.label,
) {
    const matches = groupLookupSuggestions(suggestions, layer);
    const normalized = (value) =>
        String(value ?? "")
            .trim()
            .normalize("NFKC");
    const exact =
        matches.find(({ label }) => normalized(label) === normalized(query)) ??
        null;
    if (matches.length < 2 && exact) return exact;
    let selected = null;
    const definitionLayer = schema.layers.find(
        ({ semanticRole }) => semanticRole === "definition",
    );
    const previews = matches
        .map((suggestion, index) => {
            const definitions = definitionLayer
                ? (suggestion.definitions ?? []).map(
                      (definition, position) => ({
                          id: `lookup:${index}:definition:${position}`,
                          layer: definitionLayer.id,
                          fields: {
                              [definitionLayer.definitionLocalization
                                  .translationsField]: definition.translations,
                          },
                      }),
                  )
                : [];
            const entry = {
                ...suggestion,
                label: suggestion.label ?? "",
                fields: suggestion.fields ?? {},
                references: [
                    ...(suggestion.references ?? []),
                    ...definitions.map(({ id }) => ({ entryId: id })),
                ],
            };
            return `<button class="btn-neutral library-entry-card library-lookup-choice" type="button" data-library-lookup-choice="${index}" aria-pressed="false" aria-label="${escapeHtml(entry.label)}">${renderCardContents(entry, layer, [...entries, ...definitions], schema, i18n)}</button>`;
        })
        .join("");
    const action = await openPopup({
        title: i18n.t("gateway.study.library_lookup_multiple_title"),
        body: `<div class="library-lookup-choices">${previews}</div>`,
        actions: [
            {
                id: "continue",
                label: i18n.t("ui.reuse.continue"),
                variant: "confirm",
                disabled: !exact,
            },
        ],
        onOpen(overlay, close) {
            overlay.addEventListener("click", (event) => {
                const button = event.target.closest(
                    "[data-library-lookup-choice]",
                );
                if (!button) return;
                selected = matches[Number(button.dataset.libraryLookupChoice)];
                void close();
            });
        },
    });
    if (selected)
        return {
            ...selected,
            replaceInput: normalized(selected.label) !== normalized(query),
        };
    return action === "continue" || action === null ? exact : null;
}
