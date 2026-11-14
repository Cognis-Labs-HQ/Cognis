import { pronunciationClass } from "/static/gateways/study/reuse/pronunciation.js";

/** Resolve localized Library card values and render linked practice answers. */
function localizedMeaning(entry, layer, language) {
    const field =
        layer?.definitionLocalization?.translationsField ??
        layer?.fields?.find(({ type }) => type === "localizedText")?.id;
    const translations = entry.fields?.[field];
    return (
        translations?.[language] ||
        translations?.[language.split("-")[0]] ||
        translations?.en ||
        String(entry.fields?.definition ?? "")
    );
}

/**
 * @param {object} detail The card and its direct reference cards.
 * @param {object[]} schemas Schemas describing localized definition fields.
 * @param {string} language Viewer language.
 * @returns {{front: string, back: string, pronunciation: string}} Quiz text.
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
            return (
                localizedMeaning(candidate, candidateLayer, language) ||
                candidate.label
            );
        });
    return {
        front: entry.label,
        back:
            definitions.join("\n") ||
            localizedMeaning(entry, layer, language) ||
            (layer?.semanticRole === "atomicWritingUnit"
                ? pronunciation.split(" · ")[0]
                : ""),
        pronunciation,
    };
}

/** Group declared references so pronunciations and definitions appear once with canonical links. */
export function renderFlashcard(detail, schemas, language, link) {
    const values = flashcardValues(detail, schemas, language);
    const references = detail.references ?? [];
    const role = (entry) =>
        schemas
            .find(({ id }) => id === entry.schemaId)
            ?.layers.find(({ id }) => id === entry.layer)?.semanticRole;
    const pronunciations = values.pronunciation.split(" · ").filter(Boolean);
    const readings = pronunciations.map((reading) => {
        const source =
            references.find(
                (entry) =>
                    entry.label === reading && role(entry) === "lexicalUnit",
            ) ?? detail.entry;
        return `<span class="${pronunciationClass(reading)}">${link(source, reading, schemas)}</span>`;
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
            !pronunciations.includes(entry.label),
    );
    return `<div class="study-flashcard-face"><strong>${link(detail.entry, values.front, schemas)}</strong><div>${readings.join(" · ")}</div><div>${meanings.join(" · ")}</div>${related.length ? `<div>${related.map((entry) => link(entry, entry.label, schemas)).join(" · ")}</div>` : ""}</div>`;
}

/** Map imported notes to the same entry context as Library-backed deck cards. */
export function noteDetails(notes) {
    return notes.map(({ id, front, back, pronunciation }) => ({
        entry: {
            id,
            label: front,
            fields: { definition: back, pronunciation },
        },
        references: [],
    }));
}
