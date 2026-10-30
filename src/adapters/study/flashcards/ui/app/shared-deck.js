import { supportsDeckWriting } from "./practice-model.js";
import { createPracticeModePreference } from "../reuse/practice-mode.js";
import { createPracticeSession } from "./practice-session.js";
import { noteDetails } from "../reuse/flashcard.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { mountPractice } from "./practice.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { languageFlashcardsUrl } from "/static/gateways/study/reuse/explore.js";
import { loadDeckTemplates, renderDeckCompletion } from "./markup.js";
import { runDeckAction } from "./actions.js";

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
        writingAvailable: supportsDeckWriting(
            queue,
            queue.flatMap((detail) => [detail.entry, ...detail.references]),
            schemas,
        ),
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
            target.innerHTML = renderDeckCompletion(
                templates,
                i18n,
                queue.length > 0,
            );
            target.querySelector("[data-practice-restart]")?.addEventListener(
                "click",
                () =>
                    runDeckAction(
                        "restart",
                        () => {
                            practiceSession.restart();
                            next();
                        },
                        signal,
                    ),
                { signal },
            );
            target
                .querySelector('[data-deck-action="browse"]')
                .addEventListener(
                    "click",
                    () =>
                        runDeckAction(
                            "browse",
                            () =>
                                navigateTo(
                                    languageFlashcardsUrl(deck.language),
                                ),
                            signal,
                        ),
                    { signal },
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
