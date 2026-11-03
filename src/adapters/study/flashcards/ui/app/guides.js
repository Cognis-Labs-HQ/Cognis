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
                        id: "step1",
                        selector: ".side-menu",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.step1.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "[data-study-deck]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.step2.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.step2.body",
                    },
                    {
                        id: "step3",
                        selector: "[data-study-deck]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.step3.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.step3.body",
                    },
                ],
            },
        ],
    },
];
