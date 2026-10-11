import { similarEntries } from "/static/gateways/study/reuse/similar-items.js";
import { drawingPattern } from "/static/gateways/study/reuse/drawing-pattern.js";
import { flashcardValues } from "../../reuse/flashcard.js";
import { isCardDue } from "../../reuse/review.js";

export function cardStatus(progress, id, now = Date.now()) {
    if (!progress?.[id]) return "new";
    return isCardDue(progress, id, now) ? "due" : "done";
}

export function practiceSummary(cards, progress, now = Date.now()) {
    const summary = { total: cards.length, done: 0, due: 0, new: 0 };
    for (const { entry } of cards)
        summary[cardStatus(progress, entry.id, now)]++;
    return summary;
}

export function practiceQueue(cards, progress, filter, now = Date.now()) {
    return cards.filter(
        ({ entry }) =>
            filter === "total" ||
            cardStatus(progress, entry.id, now) === filter,
    );
}

export function readingChoices(detail, entries, schemas, language) {
    const correct = flashcardValues(
        detail,
        schemas,
        language,
    ).pronunciation.split(" · ")[0];
    if (!correct) return [];
    const choices = [{ entry: detail.entry, text: correct, correct: true }];
    const seen = new Set([correct]);
    for (const entry of similarEntries(detail.entry, entries, entries.length)) {
        const text = flashcardValues(
            { entry },
            schemas,
            language,
        ).pronunciation.split(" · ")[0];
        if (!text || seen.has(text)) continue;
        seen.add(text);
        choices.push({ entry, text, correct: false });
        if (choices.length === 4) break;
    }
    if (choices.length !== 4) return [];
    for (let index = choices.length - 1; index > 0; index--) {
        const random = new Uint32Array(1);
        crypto.getRandomValues(random);
        const position = random[0] % (index + 1);
        [choices[index], choices[position]] = [
            choices[position],
            choices[index],
        ];
    }
    return choices;
}

export function writingPattern(detail, entries, schemas) {
    const schema = schemas.find(({ id }) => id === detail.entry.schemaId);
    const layer = schema?.layers.find(({ id }) => id === detail.entry.layer);
    return drawingPattern(detail.entry, layer, entries, schemas);
}
