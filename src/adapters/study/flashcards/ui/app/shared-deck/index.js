import { noteDetails } from "../../reuse/flashcard.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { mountPractice } from "../flashcards/practice.js";
import { loadDeckTemplates } from "../flashcards/markup.js";
import { runDeckAction } from "../flashcards/actions.js";

/** Shared snapshots are new cards in a temporary session without granting Library access. */
export async function mount(root, { shareContext, i18n, signal } = {}) {
    const deck = shareContext.payload.deck;
    const schemas = deck.schemas;
    const queue = [
        ...(shareContext.payload.cards ?? []),
        ...noteDetails(deck.notes),
    ];
    const templates = await runDeckAction(
        "load",
        () => loadDeckTemplates(signal),
        signal,
    );
    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        pageContext: {
            title: deck.name,
            subtitle: i18n.t("adapter.study.flashcards.page_subtitle"),
        },
        elements: [
            {
                id: "shared-deck",
                label: deck.name,
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    `<section data-shared-deck><h2>${escapeHtml(deck.name)}</h2><div data-shared-card></div></section>`,
            },
        ],
    });
    await composer.init();
    signal?.throwIfAborted();
    let release;
    const next = () => {
        release?.();
        const target = root.querySelector("[data-shared-card]");
        if (!queue.length) {
            target.innerHTML = `<p>${escapeHtml(i18n.t("adapter.study.flashcards.deck_finished"))}</p>`;
            return;
        }
        release = mountPractice(target, {
            detail: queue[0],
            templates,
            schemas,
            entries: [],
            progress: {},
            filter: "new",
            mode: "reading",
            i18n,
            signal,
            authenticated: false,
            onNext: async () =>
                runDeckAction(
                    "review",
                    () => {
                        queue.shift();
                        next();
                    },
                    signal,
                ),
        });
    };
    signal.addEventListener("abort", () => release?.(), { once: true });
    next();
}
