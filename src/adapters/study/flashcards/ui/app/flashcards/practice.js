import { pronunciationClass } from "/static/gateways/study/reuse/pronunciation.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { openPopup } from "/static/reuse/popup.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { openDrawingPad } from "/static/gateways/study/reuse/drawing.js";
import { renderFavourite } from "/static/gateways/study/reuse/favourites.js";
import { flashcardValues, renderFlashcard } from "../../reuse/flashcard.js";
import { readingChoices, writingPattern } from "./practice-model.js";
import { runDeckAction } from "./actions.js";

export function exploreUrl(entry, schemas) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const sourceLayer = schema?.layers.find(({ id }) => id === entry.layer);
    const browseable = (layer) =>
        !["definition", "meaning", "particle"].includes(layer.semanticRole);
    const layer =
        sourceLayer &&
        (browseable(sourceLayer)
            ? sourceLayer
            : schema.layers.find(browseable));
    return schema && layer
        ? `/study/explore/${encodeURIComponent(schema.language)}/${encodeURIComponent(layer.navigationSlug ?? layer.id)}/${encodeURIComponent(entry.id)}`
        : "";
}

function entryLink(entry, text, schemas) {
    if (!text) return "";
    const url = exploreUrl(entry, schemas);
    return url
        ? `<a class="study-entry-link btn-neutral" href="${escapeHtml(url)}" data-practice-link data-entry-id="${escapeHtml(entry.id)}">${escapeHtml(text)}</a>`
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
    const render = async () => {
        const currentRevision = ++revision;
        drawing?.close();
        const activeMode = mode;
        const task = previewing
            ? ""
            : activeMode === "writing" && pattern
              ? "<div data-practice-drawing></div>"
              : activeMode === "reading" && choices.length
                ? `<div class="study-reading-choices">${choices.map((choice, index) => `<div><button type="button" class="btn-neutral ${pronunciationClass(choice.text)}" data-reading-choice="${index}">${escapeHtml(choice.text)}</button>${entryLink(choice.entry, "↗", schemas)}</div>`).join("")}</div>`
                : `<p>${label("unavailable")}</p>${activeMode === "reading" ? `<button type="button" class="btn-neutral" data-practice-reveal>${label("flip")}</button>` : ""}`;
        const answer = renderFlashcard(detail, schemas, language, entryLink);
        const writing = activeMode === "writing";
        target.innerHTML = formatTemplate(templates.practice, {
            favourite: authenticated
                ? renderFavourite("flashcard", detail.entry.id, i18n)
                : "",
            entry_heading: writing
                ? `<button type="button" class="btn-neutral" data-practice-reveal aria-label="${label("reveal")}" aria-expanded="false">•••</button>`
                : entryLink(detail.entry, values.front, schemas),
            modes: label(activeMode),
            task,
            front: renderFlashcard(
                detail,
                schemas,
                language,
                entryLink,
                "front",
            ),
            answer,
            flip_label: label("flip"),
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
                onResult: ({ correct }) =>
                    void runDeckAction(
                        "answer",
                        () => {
                            grade =
                                correct && !assisted && grade !== "again"
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
        target.querySelector("[data-practice-front]").hidden = true;
        target.querySelector("[data-practice-back]").hidden = false;
        target
            .querySelector("[data-practice-flip]")
            .setAttribute("aria-pressed", "true");
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
                if (
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey ||
                    event.altKey
                ) {
                    await runDeckAction(
                        "depart",
                        () => {
                            assisted ||= !grade;
                            onDeparture?.(grade ?? "again");
                        },
                        controller.signal,
                    );
                    return;
                }
                event.preventDefault();
                if (!link.dataset.entryId || !link.getAttribute("href")) return;
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
                        if (choice === "leave") {
                            onDeparture?.(grade ?? "again");
                            await navigateTo(link.getAttribute("href"), {
                                state: {
                                    studyEntryId: link.dataset.entryId,
                                    studyEntryIds: navigationEntryIds,
                                },
                            });
                        }
                    },
                    controller.signal,
                );
            }
            if (
                event.target.closest("[data-practice-reveal]") &&
                (mode === "writing" || !available.includes(mode))
            ) {
                await runDeckAction(
                    "answer",
                    () => {
                        grade = "again";
                        onAnswer?.(grade);
                        const reveal = target.querySelector(
                            "[data-practice-reveal]",
                        );
                        if (mode === "writing")
                            reveal.textContent = values.front;
                        else reveal.hidden = true;
                        reveal.setAttribute("aria-expanded", "true");
                        revealAnswer();
                        target.querySelector("[data-practice-next]").disabled =
                            false;
                    },
                    controller.signal,
                );
            }
            const choice = event.target.closest("[data-reading-choice]");
            if (choice && mode === "reading")
                await runDeckAction(
                    "answer",
                    () => {
                        if (grade) return;
                        const correct =
                            choices[Number(choice.dataset.readingChoice)]
                                .correct;
                        grade = correct && !assisted ? "good" : "again";
                        onAnswer?.(grade);
                        choice.classList.remove("btn-neutral");
                        choice.classList.add(
                            correct ? "btn-confirm" : "btn-cancel",
                        );
                        choice.dataset.readingResult = correct
                            ? "correct"
                            : "incorrect";
                        showToast(
                            i18n.t(
                                `adapter.study.flashcards.practice_${correct ? "correct" : "incorrect"}`,
                            ),
                            {
                                variant: correct ? "success" : "warning",
                            },
                        );
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
            if (
                event.target.closest("[data-practice-flip]") ||
                (!link && event.target.closest("[data-practice-front]"))
            )
                await runDeckAction(
                    "flip",
                    () => {
                        const back = target.querySelector(
                            "[data-practice-back]",
                        );
                        const showBack = back.hidden;
                        back.hidden = !showBack;
                        target.querySelector("[data-practice-front]").hidden =
                            showBack;
                        target
                            .querySelector("[data-practice-flip]")
                            .setAttribute("aria-pressed", String(showBack));
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
