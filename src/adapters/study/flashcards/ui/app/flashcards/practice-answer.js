import { flashcardValues } from "../../reuse/flashcard.js";

/** Group declared references so pronunciations and definitions appear once with canonical links. */
export function practiceAnswer(detail, schemas, language, link) {
    const values = flashcardValues(detail, schemas, language);
    const references = detail.references ?? [];
    const role = (entry) =>
        schemas
            .find(({ id }) => id === entry.schemaId)
            ?.layers.find(({ id }) => id === entry.layer)?.semanticRole;
    const readings = values.pronunciation
        .split(" · ")
        .filter(Boolean)
        .map((reading) => {
            const source =
                references.find(
                    (entry) =>
                        entry.label === reading &&
                        role(entry) === "lexicalUnit",
                ) ?? detail.entry;
            return link(source, reading, schemas);
        });
    const meanings = references
        .filter((entry) => ["definition", "meaning"].includes(role(entry)))
        .map((entry) => {
            const text = flashcardValues({ entry }, schemas, language);
            return link(entry, text.back || text.front, schemas);
        });
    if (!meanings.length && values.back)
        meanings.push(link(detail.entry, values.back, schemas));
    const related = references.filter(
        (entry) =>
            !["definition", "meaning"].includes(role(entry)) &&
            !values.pronunciation.split(" · ").includes(entry.label),
    );
    return `<div class="study-flashcard-face"><strong>${link(detail.entry, values.front, schemas)}</strong><div>${readings.join(" · ")}</div><div>${meanings.join(" · ")}</div>${related.length ? `<div>${related.map((entry) => link(entry, entry.label, schemas)).join(" · ")}</div>` : ""}</div>`;
}
