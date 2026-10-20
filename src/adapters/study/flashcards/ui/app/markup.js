import { isCardDue } from "../reuse/review.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    renderFavourite,
    renderBrowseControls,
} from "/static/gateways/study/reuse/favourites.js";

export async function loadDeckTemplates(signal) {
    const response = await fetch(
        "/static/adapters/study/flashcards/templates/gallery.html",
        { signal },
    );
    if (!response.ok) throw new Error("deck_template_failed");
    const document = new DOMParser().parseFromString(
        await response.text(),
        "text/html",
    );
    return Object.fromEntries(
        [...document.querySelectorAll("template[data-deck-template]")].map(
            (template) => [template.dataset.deckTemplate, template.innerHTML],
        ),
    );
}

export function renderDeckPreviews(templates, decks, i18n) {
    const labelText = (key) => escapeHtml(i18n.t(key));
    const now = Date.now();
    const languageNames = new Intl.DisplayNames(
        [document.documentElement.lang || "en"],
        { type: "language" },
    );
    const previews = decks
        .map((deck) => {
            const ids = [...deck.entryIds, ...deck.notes.map(({ id }) => id)];
            const dueCount = ids.filter((id) =>
                isCardDue(deck.progress, id, now),
            ).length;
            let language = "";
            if (/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(deck.language ?? ""))
                language = " · " + escapeHtml(languageNames.of(deck.language));
            return formatTemplate(templates.preview, {
                id: escapeHtml(deck.id),
                name: escapeHtml(deck.name),
                count: ids.length,
                cards_label: labelText("adapter.study.flashcards.deck_cards"),
                source: labelText(
                    "adapter.study.flashcards." +
                        (deck.provider
                            ? "deck_starter"
                            : deck.canEdit
                              ? "deck_yours"
                              : "deck_shared"),
                ),
                language,
                due_label: labelText(
                    "adapter.study.flashcards.deck_due_count",
                ).replace("{{ count }}", String(dueCount)),
                favourite: renderFavourite("deck", deck.id, i18n),
            });
        })
        .join("");
    return (
        previews || `<p>${labelText("adapter.study.flashcards.deck_empty")}</p>`
    );
}

export function renderDeckBrowser(templates, decks, i18n, query = "") {
    const labelText = (key) => escapeHtml(i18n.t(key));
    return formatTemplate(templates.browser, {
        title: labelText("adapter.study.flashcards.page_title"),
        create_label: labelText("adapter.study.flashcards.deck_create"),
        search_label: labelText("adapter.study.flashcards.deck_search"),
        query: escapeHtml(query),
        browse_controls: renderBrowseControls(i18n, { query }),
        previews: renderDeckPreviews(templates, decks, i18n),
    });
}

export function renderDeckDetail(templates, deck, summary, filter, i18n) {
    const labelText = (key) => escapeHtml(i18n.t(key));
    return formatTemplate(templates.detail, {
        name: escapeHtml(deck.name),
        favourite: renderFavourite("deck", deck.id, i18n),
        back_label: labelText("ui.reuse.back"),
        export_action: deck.canExport
            ? formatTemplate(templates.export, {
                  export_label: labelText("ui.reuse.export"),
              })
            : "",
        summary: Object.entries(summary)
            .map(
                ([key, count]) =>
                    `<button type="button" class="btn-neutral" data-practice-filter="${key}" aria-pressed="${filter === key}"><strong>${count}</strong><span>${labelText(key === "done" ? "ui.reuse.done" : `adapter.study.flashcards.practice_${key}`)}</span></button>`,
            )
            .join(""),
        editable_actions: deck.canEdit
            ? formatTemplate(templates["edit-actions"], {
                  edit_label: labelText("ui.reuse.edit"),
                  delete_label: labelText("ui.reuse.delete"),
              })
            : "",
    });
}

export function renderDeckCompletion(templates, i18n, canRetry) {
    return formatTemplate(templates.completion, {
        message: escapeHtml(i18n.t("adapter.study.flashcards.deck_finished")),
        home_label: escapeHtml(i18n.t("ui.reuse.home")),
        retry_action: canRetry
            ? formatTemplate(templates["completion-retry"], {
                  retry_label: escapeHtml(i18n.t("ui.reuse.try_again")),
              })
            : "",
    });
}
