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
) {
    if (suggestions.length < 2) return suggestions[0] ?? null;
    let selected = null;
    const definitionLayer = schema.layers.find(
        ({ semanticRole }) => semanticRole === "definition",
    );
    const previews = suggestions
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
                id: "confirm",
                label: i18n.t("ui.reuse.confirm"),
                variant: "confirm",
                disabled: true,
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onOpen(overlay) {
            overlay.addEventListener("click", (event) => {
                const button = event.target.closest(
                    "[data-library-lookup-choice]",
                );
                if (!button) return;
                selected = Number(button.dataset.libraryLookupChoice);
                overlay
                    .querySelectorAll("[data-library-lookup-choice]")
                    .forEach((choice) => {
                        const active =
                            Number(choice.dataset.libraryLookupChoice) ===
                            selected;
                        choice.classList.toggle("is-selected", active);
                        choice.setAttribute("aria-pressed", String(active));
                    });
                overlay.querySelector(
                    '[data-popup-action="confirm"]',
                ).disabled = false;
            });
        },
        onAction(actionId) {
            return actionId !== "confirm" || selected !== null;
        },
    });
    return action === "confirm" && selected !== null
        ? suggestions[selected]
        : null;
}
