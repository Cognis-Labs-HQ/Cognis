export const guides = [
    {
        owner: "study.flashcards.page",
        definitions: [
            {
                id: "decks",
                visibleWhen: ".study-deck-browser",
                page: ({ pathname }) =>
                    /^\/study\/(?:[a-z-]+\/)?flashcards(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.flashcards.tutorial.decks.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "deck-selection",
                        selector: ".side-menu",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.deck.selection.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.deck.selection.body",
                    },
                    {
                        highlightNext: true,
                        id: "study-modes",
                        selector: ".study-deck-preview",
                        targetMatch: "first",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.study.modes.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.study.modes.body",
                    },
                    {
                        highlightNext: true,
                        id: "build-a-deck",
                        selector: '[data-deck-action="add"]',
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.build.a.deck.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.build.a.deck.body",
                    },
                ],
            },
            {
                id: "practice",
                page: ({ pathname }) =>
                    /^\/study\/(?:[a-z-]+\/)?flashcards(?:\/|$)/.test(pathname),
                scope: "[data-practice]",
                titleKey: "adapter.study.flashcards.tutorial.practice.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "answer-task",
                        selector: "[data-practice-task]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.practice.answer.task.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.practice.answer.task.body",
                    },
                    {
                        highlightNext: true,
                        id: "check-feedback",
                        selector: "[data-practice]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.practice.check.feedback.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.practice.check.feedback.body",
                    },
                ],
            },
            {
                id: "manage-deck",
                page: ({ pathname }) =>
                    /^\/study\/(?:[a-z-]+\/)?flashcards(?:\/|$)/.test(pathname),
                scope: "[data-study-deck]:has([data-study-session])",
                titleKey: "adapter.study.flashcards.tutorial.manage.deck.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "practice-and-progress",
                        selector: ".study-practice-summary",
                        titleKey:
                            "adapter.study.flashcards.tutorial.decks.practice.and.progress.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.decks.practice.and.progress.body",
                    },
                    {
                        highlightNext: true,
                        id: "edit-cards",
                        selector: '[data-deck-action="edit"]',
                        titleKey:
                            "adapter.study.flashcards.tutorial.manage.deck.edit.cards.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.manage.deck.edit.cards.body",
                    },
                    {
                        highlightNext: true,
                        id: "share-deck",
                        selector: "[data-deck-share]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.manage.deck.share.deck.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.manage.deck.share.deck.body",
                    },
                    {
                        highlightNext: true,
                        id: "export-deck",
                        selector: '[data-deck-action="export"]',
                        titleKey:
                            "adapter.study.flashcards.tutorial.manage.deck.export.deck.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.manage.deck.export.deck.body",
                    },
                ],
            },
        ],
    },
];
