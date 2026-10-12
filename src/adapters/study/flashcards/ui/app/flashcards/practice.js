import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { openPopup } from "/static/reuse/popup.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { openDrawingPad } from "/static/gateways/study/reuse/drawing.js";
import { renderFavourite } from "/static/gateways/study/reuse/favourites.js";
import { flashcardValues, renderFlashcard } from "../../reuse/flashcard.js";
import {
    cardStatus,
    readingChoices,
    writingPattern,
} from "./practice-model.js";
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
        ? `/study/explore/${encodeURIComponent(schema.language)}/${encodeURIComponent(layer.navigationSlug ?? layer.id)}`
        : "";
}

function entryLink(entry, text, schemas) {
    if (!text) return "";
    const url = exploreUrl(entry, schemas);
    return url
        ? `<a href="${escapeHtml(url)}" data-practice-link data-entry-id="${escapeHtml(entry.id)}">${escapeHtml(text)}</a>`
        : escapeHtml(text);
}

export function mountPractice(
    target,
    {
        detail,
        templates,
        entries,
        schemas,
        progress,
        filter,
        mode,
        i18n,
        signal,
        onNext,
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
    const isNew =
        filter === "new" ||
        (filter === "total" && cardStatus(progress, detail.entry.id) === "new");
    let grade = isNew ? "good" : null;
    let drawing;
    let revision = 0;
    const label = (key) =>
        escapeHtml(i18n.t(`adapter.study.flashcards.practice_${key}`));
    const render = async () => {
        const currentRevision = ++revision;
        drawing?.close();
        const activeMode = available.includes(mode) ? mode : available[0];
        const task = isNew
            ? ""
            : activeMode === "writing"
              ? "<div data-practice-drawing></div>"
              : activeMode === "reading"
                ? `<div class="study-reading-choices">${choices.map((choice, index) => `<div><button type="button" class="btn-neutral" data-reading-choice="${index}">${escapeHtml(choice.text)}</button>${entryLink(choice.entry, "↗", schemas)}</div>`).join("")}</div>`
                : `<p>${label("unavailable")}</p>`;
        const answer = renderFlashcard(detail, schemas, language, entryLink);
        target.innerHTML = formatTemplate(templates.practice, {
            favourite: authenticated
                ? renderFavourite("flashcard", detail.entry.id, i18n)
                : "",
            entry_heading: entryLink(detail.entry, values.front, schemas),
            modes: isNew
                ? ""
                : available
                      .map(
                          (value) =>
                              `<button type="button" class="btn-neutral" data-practice-mode="${value}" aria-pressed="${value === activeMode}">${label(value)}</button>`,
                      )
                      .join(""),
            task,
            answer,
            next_label: label("next"),
        });
        target.querySelector("[data-practice-answer]").hidden =
            !isNew && grade !== "again";
        target.querySelector("[data-practice-next]").disabled =
            !grade && available.length > 0;
        if (!isNew && activeMode === "writing") {
            const session = await openDrawingPad({
                card: detail.entry,
                strokePattern: pattern,
                container: target.querySelector("[data-practice-drawing]"),
                signal: controller.signal,
                onResult: ({ correct }) =>
                    void runDeckAction(
                        "answer",
                        () => {
                            grade =
                                correct && grade !== "again" ? "good" : "again";
                            if (!correct)
                                target.querySelector(
                                    "[data-practice-answer]",
                                ).hidden = false;
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
                        if (choice === "leave")
                            await navigateTo(link.getAttribute("href"), {
                                state: { studyEntryId: link.dataset.entryId },
                            });
                    },
                    controller.signal,
                );
            }
            const modeButton = event.target.closest("[data-practice-mode]");
            if (modeButton)
                await runDeckAction(
                    "practiceMode",
                    () => {
                        mode = modeButton.dataset.practiceMode;
                        return render();
                    },
                    controller.signal,
                );
            const choice = event.target.closest("[data-reading-choice]");
            if (choice)
                await runDeckAction(
                    "answer",
                    () => {
                        if (grade) return;
                        const correct =
                            choices[Number(choice.dataset.readingChoice)]
                                .correct;
                        grade = correct ? "good" : "again";
                        choice.classList.add(
                            correct ? "btn-confirm" : "btn-cancel",
                        );
                        target
                            .querySelectorAll("[data-reading-choice]")
                            .forEach((button) => {
                                button.disabled = true;
                            });
                        target.querySelector("[data-practice-answer]").hidden =
                            correct;
                        target.querySelector("[data-practice-next]").disabled =
                            false;
                    },
                    controller.signal,
                );
            if (event.target.closest("[data-practice-next]")) {
                const button = target.querySelector("[data-practice-next]");
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
