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
                    {
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
                        id: "choose-mode",
                        selector: ".study-practice-modes",
                        titleKey:
                            "adapter.study.flashcards.tutorial.practice.choose.mode.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.practice.choose.mode.body",
                    },
                    {
                        id: "answer-task",
                        selector: "[data-practice-task]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.practice.answer.task.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.practice.answer.task.body",
                    },
                    {
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
                scope: "[data-study-session]",
                titleKey: "adapter.study.flashcards.tutorial.manage.deck.title",
                steps: [
                    {
                        id: "edit-cards",
                        selector: '[data-deck-action="edit"]',
                        titleKey:
                            "adapter.study.flashcards.tutorial.manage.deck.edit.cards.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.manage.deck.edit.cards.body",
                    },
                    {
                        id: "share-deck",
                        selector: "[data-deck-share]",
                        titleKey:
                            "adapter.study.flashcards.tutorial.manage.deck.share.deck.title",
                        bodyKey:
                            "adapter.study.flashcards.tutorial.manage.deck.share.deck.body",
                    },
                    {
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
