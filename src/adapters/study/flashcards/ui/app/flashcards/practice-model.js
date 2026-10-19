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
    const records = new Map(
        [...entries, ...(detail.references ?? [])].map((entry) => [
            entry.id,
            entry,
        ]),
    );
    const answerFor = (entry) => {
        const references =
            entry.id === detail.entry.id
                ? (detail.references ?? [])
                : (entry.references ?? [])
                      .map(({ entryId }) => records.get(entryId))
                      .filter(Boolean);
        return flashcardValues({ entry, references }, schemas, language)
            .back.split("\n")[0]
            .trim();
    };
    const correct = answerFor(detail.entry);
    if (!correct) return [];
    const choices = [
        {
            entry: detail.entry,
            entryId: detail.entry.id,
            text: correct,
            correct: true,
        },
    ];
    const normalized = (value) =>
        value.normalize("NFKC").toLocaleLowerCase().trim();
    const seen = new Set([normalized(correct)]);
    const candidates = [
        ...new Map(
            [
                ...similarEntries(detail.entry, entries, entries.length),
                ...entries.filter(
                    (entry) =>
                        entry.id !== detail.entry.id &&
                        entry.schemaId === detail.entry.schemaId &&
                        entry.layer === detail.entry.layer &&
                        entry.language === detail.entry.language &&
                        entry.hidden !== true,
                ),
            ].map((entry) => [entry.id, entry]),
        ).values(),
    ];
    for (const entry of candidates) {
        const text = answerFor(entry);
        if (!text || seen.has(normalized(text))) continue;
        seen.add(normalized(text));
        choices.push({ entry, entryId: entry.id, text, correct: false });
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
