import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderFlashcard, mountFlashcard } from "../../reuse/flashcard.js";

/** Renders the explicitly shared deck snapshot without granting Library access. */
export async function mount(root, { shareContext, i18n, signal } = {}) {
    const deck = shareContext.payload.deck;
    const schemas = deck.schemas;
    const queue = [
        ...(shareContext.payload.cards ?? []),
        ...deck.notes.map((note) => ({
            entry: {
                id: note.id,
                label: note.front,
                fields: {
                    definition: note.back,
                    pronunciation: note.pronunciation,
                },
            },
            references: [],
        })),
    ];
    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        pageContext: { title: escapeHtml(deck.name), subtitle: "" },
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
    const next = () => {
        const target = root.querySelector("[data-shared-card]");
        if (!queue.length) {
            target.innerHTML = `<p>${escapeHtml(i18n.t("adapter.study.flashcards.deck_finished"))}</p>`;
            return;
        }
        target.innerHTML = renderFlashcard(
            queue[0],
            schemas,
            [],
            i18n,
            document.documentElement.lang,
        );
        mountFlashcard(target, {
            signal,
            onGrade: async (grade) => {
                const card = queue.shift();
                if (grade === "again") queue.push(card);
                next();
            },
        });
    };
    next();
}
