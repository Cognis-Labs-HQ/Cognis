/**
 * Animated flashcards using the same entry/reference context as Library details.
 * Exports: flashcardValues(detail, schemas, language) resolves localized question and answer text;
 * renderFlashcard(detail, schemas, entries, i18n, language) builds a reversible card;
 * mountFlashcard(root, options) binds reveal and recall grading.
 * Example: root.innerHTML = renderFlashcard(detail, schemas, entries, i18n, 'en');
 * @param {object} detail Entry, direct references, and optional dependant cards.
 * @returns {string} Escaped card markup.
 */
import { escapeHtml } from "/static/reuse/escape-html.js";

/**
 * @param {object} detail The card and its direct reference cards.
 * @param {object[]} schemas Schemas describing localized definition fields.
 * @param {string} language Viewer language.
 * @returns {{front: string, back: string, pronunciation: string, layer: string}} Quiz text.
 */
export function flashcardValues(detail, schemas = [], language = "en") {
    const entry = detail.entry;
    const schema = schemas.find((schema) => schema.id === entry.schemaId);
    const layer = schema?.layers.find((layer) => layer.id === entry.layer);
    const readings = entry.fields?.pronunciation;
    const pronunciation = (Array.isArray(readings) ? readings : [readings])
        .filter((value) => typeof value === "string")
        .join(" · ");
    const definitions = (detail.references ?? [])
        .filter((candidate) =>
            ["definition", "meaning"].includes(
                schema?.layers.find((layer) => layer.id === candidate.layer)
                    ?.semanticRole,
            ),
        )
        .map((candidate) => {
            const candidateLayer = schema.layers.find(
                (layer) => layer.id === candidate.layer,
            );
            const field =
                candidateLayer.definitionLocalization?.translationsField ??
                candidateLayer.fields?.find(
                    (field) => field.type === "localizedText",
                )?.id;
            const translations = candidate.fields?.[field];
            return (
                translations?.[language] ??
                translations?.[language.split("-")[0]] ??
                translations?.en ??
                candidate.label
            );
        });
    const ownTranslationField =
        layer?.definitionLocalization?.translationsField ??
        layer?.fields?.find((field) => field.type === "localizedText")?.id;
    const ownTranslations = entry.fields?.[ownTranslationField];
    const back =
        definitions.join("\n") ||
        ownTranslations?.[language] ||
        ownTranslations?.[language.split("-")[0]] ||
        ownTranslations?.en ||
        String(entry.fields?.definition ?? "");
    return {
        front: entry.label,
        back,
        pronunciation,
        layer: layer?.metadata?.labels?.[language] ?? layer?.id ?? "",
    };
}

/**
 * @param {object} detail Library detail context or an imported note context.
 * @param {object[]} schemas Available schema descriptors.
 * @param {object[]} entries Library context used by callers of card renderers.
 * @param {{t: function}} i18n Localized labels.
 * @param {string} language Viewer language.
 * @returns {string} Escaped reversible card markup.
 */
export function renderFlashcard(detail, schemas, entries, i18n, language) {
    const values = flashcardValues(detail, schemas, language);
    return `<section class="study-flashcard" data-flashcard><button type="button" class="study-flashcard-flip btn-neutral" data-flashcard-flip aria-label="${escapeHtml(i18n.t("adapter.study.flashcards.flashcard_reveal"))}" aria-pressed="false"><span class="study-flashcard-inner"><span class="study-flashcard-face study-flashcard-front"><strong>${escapeHtml(values.front)}</strong><span>${escapeHtml(values.layer)}</span></span><span class="study-flashcard-face study-flashcard-back" aria-hidden="true"><strong>${escapeHtml(values.pronunciation || values.front)}</strong><span>${escapeHtml(values.back)}</span></span></span></button><div class="study-flashcard-grades">${["again", "good", "easy"].map((grade) => `<button type="button" class="btn-${grade === "again" ? "cancel" : "confirm"}" disabled data-flashcard-grade="${grade}">${escapeHtml(i18n.t(`adapter.study.flashcards.flashcard_${grade}`))}</button>`).join("")}</div></section>`;
}

/** @param {HTMLElement} root Card container. @param {object} options Abort signal and asynchronous grade handler. @returns {void} */
export function mountFlashcard(root, { signal, onGrade }) {
    const card = root.querySelector("[data-flashcard]");
    card.querySelector("[data-flashcard-flip]").addEventListener(
        "click",
        (event) => {
            const revealed = card.classList.toggle("is-revealed");
            event.currentTarget.setAttribute("aria-pressed", String(revealed));
            card.querySelector(".study-flashcard-front").setAttribute(
                "aria-hidden",
                String(revealed),
            );
            card.querySelector(".study-flashcard-back").setAttribute(
                "aria-hidden",
                String(!revealed),
            );
            card.querySelectorAll("[data-flashcard-grade]").forEach(
                (button) => {
                    button.disabled = !revealed;
                },
            );
        },
        { signal },
    );
    card.querySelectorAll("[data-flashcard-grade]").forEach((button) =>
        button.addEventListener(
            "click",
            async () => {
                const buttons = card.querySelectorAll("button");
                buttons.forEach((button) => {
                    button.disabled = true;
                });
                try {
                    await onGrade(button.dataset.flashcardGrade);
                } finally {
                    if (card.isConnected)
                        buttons.forEach((button) => {
                            button.disabled = false;
                        });
                }
            },
            { signal },
        ),
    );
}
