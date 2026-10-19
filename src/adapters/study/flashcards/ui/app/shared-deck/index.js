import { createPracticeModePreference } from "../../reuse/practice-mode.js";
import { createPracticeSession } from "../flashcards/practice-session.js";
import { noteDetails } from "../../reuse/flashcard.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { mountPractice } from "../flashcards/practice.js";
import { loadDeckTemplates } from "../flashcards/markup.js";
import { runDeckAction } from "../flashcards/actions.js";

/** Authorized shared Library cards are new cards in a temporary session without granting Library access. */
export async function mount(root, { shareContext, i18n, signal } = {}) {
    const deck = shareContext.payload.deck;
    const schemas = deck.schemas;
    const queue = [
        ...(shareContext.payload.cards ?? []),
        ...noteDetails(deck.notes),
    ];
    let practiceSession = createPracticeSession(queue);
    const templates = await runDeckAction(
        "load",
        () => loadDeckTemplates(signal),
        signal,
    );
    const modePreference = await createPracticeModePreference({
        i18n,
        templates,
        signal,
        isActive: () => Boolean(practiceSession.current),
        onChange: () => {
            practiceSession = createPracticeSession(queue);
            next();
        },
    });
    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        pageContext: {
            title: deck.name,
            subtitle: i18n.t("adapter.study.flashcards.page_subtitle"),
        },
        floatingMenu: [modePreference],
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
    modePreference.mount(composer.getFloatingSlot(modePreference.id));
    const next = () => {
        release?.();
        const target = root.querySelector("[data-shared-card]");
        if (!practiceSession.current) {
            target.innerHTML = `<p>${escapeHtml(i18n.t("adapter.study.flashcards.deck_finished"))}</p><button class="btn-neutral" type="button" data-shared-previous>${escapeHtml(i18n.t("adapter.study.flashcards.practice_previous"))}</button>`;
            target
                .querySelector("[data-shared-previous]")
                .addEventListener("click", () =>
                    runDeckAction(
                        "previous",
                        () => {
                            practiceSession.previous();
                            next();
                        },
                        signal,
                    ),
                );
            return;
        }
        release = mountPractice(target, {
            detail: practiceSession.current,
            answeredGrade: practiceSession.answeredGrade,
            onPrevious: practiceSession.canPrevious
                ? () => {
                      practiceSession.previous();
                      next();
                  }
                : null,
            templates,
            schemas,
            entries: queue.flatMap((detail) => [
                detail.entry,
                ...detail.references,
            ]),
            mode: modePreference.value,
            onAnswer: (grade) => practiceSession.answer(grade),
            i18n,
            signal,
            authenticated: false,
            onNext: async (grade) =>
                runDeckAction(
                    "review",
                    () => {
                        practiceSession.next(grade);
                        next();
                    },
                    signal,
                ),
        });
    };
    signal.addEventListener("abort", () => release?.(), { once: true });
    next();
}
