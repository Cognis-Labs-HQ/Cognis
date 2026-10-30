import { entryExploreUrl } from "/static/gateways/study/reuse/explore.js";
import { pronunciationClass } from "/static/gateways/study/reuse/pronunciation.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { openPopup } from "/static/reuse/popup.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { openDrawingPad } from "/static/gateways/study/reuse/drawing.js";
import { renderFavourite } from "/static/gateways/study/reuse/favourites.js";
import { flashcardValues, renderFlashcard } from "../reuse/flashcard.js";
import { readingChoices, writingPattern } from "./practice-model.js";
import { runDeckAction } from "./actions.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { isCorrectReadingChoice } from "../reuse/reading-answer.js";

function entryAction(entry, text, schemas, pieceIndex) {
    if (!text) return "";
    const url = entryExploreUrl(entry, schemas);
    return url
        ? `<button type="button" class="study-entry-link btn-neutral${pieceIndex !== undefined ? " study-practice-piece" : ""}" data-practice-link data-entry-id="${escapeHtml(entry.id)}"${pieceIndex !== undefined ? ` data-practice-piece="${pieceIndex}"` : ""}>${escapeHtml(text)}</button>`
        : escapeHtml(text);
}

export function mountPractice(
    target,
    {
        detail,
        templates,
        entries,
        schemas,
        mode,
        i18n,
        signal,
        onNext,
        onPrevious,
        answeredGrade,
        onDeparture,
        onAnswer,
        navigationEntryIds = [],
        authenticated = true,
    },
) {
    const controller = new AbortController();
    signal.addEventListener("abort", () => controller.abort(), { once: true });
    const language = document.documentElement.lang;
    const values = flashcardValues(detail, schemas, language);
    const presentation = uiCtx.capabilities.get("study:library:presentation");
    if (!presentation) throw new Error("library_presentation_unavailable");
    const titlePieces = presentation.titleComposition(detail, schemas);
    const heading = titlePieces.length
        ? `<span class="study-practice-composition">${titlePieces.map((piece, index) => (piece.id ? entryAction(piece, piece.label, schemas, index) : escapeHtml(piece.label))).join("")}</span>`
        : entryAction(detail.entry, values.front, schemas);
    const primaryPronunciation =
        values.pronunciation.split(" · ").find(Boolean) ?? "";
    const showPronunciation =
        mode === "reading" &&
        primaryPronunciation &&
        primaryPronunciation.normalize("NFKC").trim() !==
            values.front.normalize("NFKC").trim();
    const choices = readingChoices(detail, entries, schemas, language);
    const pattern = writingPattern(detail, entries, schemas);
    const available = [
        pattern ? "writing" : null,
        choices.length ? "reading" : null,
    ].filter(Boolean);
    const previewing = answeredGrade === "good";
    let grade = answeredGrade ?? (previewing ? "good" : null);
    let assisted = false;
    let drawing;
    let revision = 0;
    const label = (key) =>
        escapeHtml(i18n.t(`adapter.study.flashcards.practice_${key}`));
    const navigateToEntry = async (entry) => {
        await onDeparture?.(grade ?? "again");
        await navigateTo(entryExploreUrl(entry, schemas), {
            state: {
                studyEntryId: entry.id,
                studyEntryIds: navigationEntryIds,
                studyEntryTransformation: entry.referenceTransformation,
            },
        });
    };
    const render = async () => {
        const currentRevision = ++revision;
        drawing?.close();
        const activeMode = mode;
        const task = previewing
            ? ""
            : activeMode === "writing" && pattern
              ? "<div data-practice-drawing></div>"
              : activeMode === "reading" && choices.length
                ? `<div class="study-reading-choices">${choices.map((choice, index) => `<div><button type="button" class="btn-neutral ${pronunciationClass(choice.text)}" data-reading-choice="${index}">${escapeHtml(choice.text)}</button></div>`).join("")}</div>`
                : `<p>${label("unavailable")}</p>${activeMode === "reading" ? `<button type="button" class="btn-neutral" data-practice-reveal>${label("show_answer")}</button>` : ""}`;
        const answer = renderFlashcard(detail, schemas, language, entryAction);
        const writing = activeMode === "writing";
        const navigation = formatTemplate(templates["practice-navigation"], {
            previous_label: label("previous"),
            next_label: label("next"),
            previous_content: writing
                ? '<span class="study-practice-arrow" aria-hidden="true"></span>'
                : label("previous"),
            next_content: writing
                ? '<span class="study-practice-arrow study-practice-arrow--next" aria-hidden="true"></span>'
                : label("next"),
        });
        target.innerHTML = formatTemplate(templates.practice, {
            favourite: authenticated
                ? renderFavourite("flashcard", detail.entry.id, i18n)
                : "",
            mode: activeMode,
            long_content:
                [...values.front].length > 24 ||
                schemas.some(
                    (schema) =>
                        schema.id === detail.entry.schemaId &&
                        schema.layers.some(
                            (layer) =>
                                layer.id === detail.entry.layer &&
                                layer.semanticRole === "orderedLexicalSequence",
                        ),
                ) ||
                choices.some((choice) => [...choice.text].length > 70)
                    ? " study-practice--long"
                    : "",
            entry_heading:
                writing && pattern && !previewing
                    ? ""
                    : `<div class="study-practice-prompt">${heading}${showPronunciation ? `<span class="study-practice-pronunciation ${pronunciationClass(primaryPronunciation)}">${escapeHtml(primaryPronunciation)}</span>` : ""}</div>`,
            writing_navigation: writing ? navigation : "",
            reading_navigation: writing ? "" : navigation,
            modes: writing ? "" : label(activeMode),
            reading_hint:
                !writing && !grade && choices.length
                    ? formatTemplate(templates["practice-hint"], {
                          hint_label: label("hint"),
                      })
                    : "",
            task,
            answer,
            previous_label: label("previous"),
            next_label: label("next"),
        });
        target.querySelector("[data-practice-answer]").hidden =
            writing || (!previewing && grade !== "again");
        target.querySelector("[data-practice-next]").disabled =
            !grade && available.includes(activeMode);
        target.querySelector("[data-practice-previous]").disabled = !onPrevious;
        if (grade === "again" && !writing) revealAnswer();
        if (!previewing && writing && pattern) {
            const session = await openDrawingPad({
                card: detail.entry,
                definition: values.back,
                pronunciations: [values.pronunciation],
                strokePattern: pattern,
                container: target.querySelector("[data-practice-drawing]"),
                signal: controller.signal,
                suppressRetry: true,
                onNavigate: (entry) =>
                    runDeckAction(
                        "depart",
                        () => navigateToEntry(entry),
                        controller.signal,
                    ),
                onResult: ({ correct, assisted: drawingAssisted }) =>
                    void runDeckAction(
                        "answer",
                        () => {
                            grade =
                                correct && !drawingAssisted && grade !== "again"
                                    ? "good"
                                    : "again";
                            onAnswer?.(grade);

                            target.querySelector(
                                "[data-practice-next]",
                            ).disabled = false;
                        },
                        controller.signal,
                    ),
            });
            if (controller.signal.aborted || currentRevision !== revision)
                await session?.close();
            else drawing = session;
        }
    };
    function revealAnswer() {
        target.querySelector("[data-practice-answer]").hidden = false;
    }
    void render().catch(() =>
        showToast(i18n.t("adapter.study.flashcards.deck_load_error"), {
            variant: "error",
        }),
    );
    target.addEventListener(
        "click",
        async (event) => {
            const link = event.target.closest("[data-practice-link]");
            if (link) {
                event.preventDefault();
                const entry =
                    link.dataset.practicePiece !== undefined
                        ? titlePieces[Number(link.dataset.practicePiece)]
                        : [detail.entry, ...detail.references, ...entries].find(
                              (entry) => entry.id === link.dataset.entryId,
                          );
                const url = entry && entryExploreUrl(entry, schemas);
                if (!url) return;
                await runDeckAction(
                    "depart",
                    async () => {
                        const choice = await openPopup({
                            title: i18n.t(
                                "adapter.study.flashcards.practice_leave",
                            ),
                            body: i18n.t(
                                "adapter.study.flashcards.practice_leave_body",
                            ),
                            actions: [
                                {
                                    id: "leave",
                                    label: i18n.t("ui.reuse.continue"),
                                    variant: "confirm",
                                },
                                {
                                    id: "cancel",
                                    label: i18n.t("ui.reuse.cancel"),
                                    variant: "neutral",
                                },
                            ],
                        });
                        if (choice === "leave") await navigateToEntry(entry);
                    },
                    controller.signal,
                );
            }
            if (
                event.target.closest("[data-practice-reveal]") &&
                mode === "reading" &&
                !available.includes(mode)
            ) {
                await runDeckAction(
                    "answer",
                    () => {
                        grade = "again";
                        onAnswer?.(grade);
                        target.querySelector("[data-practice-reveal]").hidden =
                            true;
                        revealAnswer();
                        target.querySelector("[data-practice-next]").disabled =
                            false;
                    },
                    controller.signal,
                );
            }
            const hint = event.target.closest("[data-reading-hint]");
            if (hint && mode === "reading")
                await runDeckAction(
                    "hint",
                    async () => {
                        if (grade || assisted || !choices.length) return;
                        const index = choices.findIndex((choice) =>
                            isCorrectReadingChoice(choice, choices),
                        );
                        if (index < 0) return;
                        assisted = true;
                        const answer = target.querySelector(
                            `[data-reading-choice="${index}"]`,
                        );
                        answer.classList.add("study-reading-hinted");
                        answer.setAttribute(
                            "aria-label",
                            i18n
                                .t(
                                    "adapter.study.flashcards.practice_hint_answer",
                                )
                                .replace("{{ answer }}", choices[index].text),
                        );
                        hint.setAttribute("aria-pressed", "true");
                        hint.disabled = true;
                        answer.focus();
                        await onAnswer?.("again");
                    },
                    controller.signal,
                );
            const choice = event.target.closest("[data-reading-choice]");
            if (choice && mode === "reading")
                await runDeckAction(
                    "answer",
                    () => {
                        if (grade) return;
                        const selected =
                            choices[Number(choice.dataset.readingChoice)];
                        if (!selected) return;
                        const correct = isCorrectReadingChoice(
                            selected,
                            choices,
                        );
                        grade = correct && !assisted ? "good" : "again";
                        const hint = target.querySelector(
                            "[data-reading-hint]",
                        );
                        if (hint) hint.disabled = true;
                        onAnswer?.(grade);
                        choice.classList.remove("btn-neutral");
                        choice.classList.add(
                            correct ? "btn-confirm" : "btn-cancel",
                        );
                        choice.dataset.readingResult = correct
                            ? "correct"
                            : "incorrect";
                        const feedback = target.querySelector(
                            "[data-practice-feedback]",
                        );
                        feedback.dataset.result = correct
                            ? "correct"
                            : "incorrect";
                        feedback.textContent = i18n.t(
                            `adapter.study.flashcards.practice_${correct ? "correct" : "incorrect"}`,
                        );
                        feedback.hidden = false;
                        target
                            .querySelectorAll("[data-reading-choice]")
                            .forEach((button) => {
                                button.disabled = true;
                            });
                        if (!correct) revealAnswer();
                        target.querySelector("[data-practice-next]").disabled =
                            false;
                    },
                    controller.signal,
                );
            if (event.target.closest("[data-practice-previous]") && onPrevious)
                await runDeckAction("previous", onPrevious, controller.signal);
            if (event.target.closest("[data-practice-next]")) {
                const button = target.querySelector("[data-practice-next]");
                if (button.disabled) return;
                button.disabled = true;
                try {
                    await onNext(grade);
                } finally {
                    if (button.isConnected) button.disabled = false;
                }
            }
        },
        { signal: controller.signal },
    );
    return () => {
        drawing?.close();
        controller.abort();
    };
}
