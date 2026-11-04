export const guides = [
    {
        owner: "study.flashcards.page",
        definitions: [
            {
                id: "decks",
                page: ({ pathname }) =>
                    /^\/study\/(?:[a-z-]+\/)?flashcards(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.flashcards.tutorial.decks.title",
                steps: [
                    {
                        id: "deck-selection",
                        selector: ".side-menu",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.deck.selection.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.deck.selection.body",
                    },
                    {
                        id: "study-modes",
                        selector: "[data-study-deck]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.study.modes.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.study.modes.body",
                    },
                    {
                        id: "practice-and-progress",
                        selector: "[data-study-deck]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.practice.and.progress.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.practice.and.progress.body",
                    },
                ],
            },
        ],
    },
];
