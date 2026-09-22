const SEGMENTER =
    typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;

function units(value) {
    const normalized = String(value ?? "")
        .normalize("NFKC")
        .toLocaleLowerCase()
        .trim();
    if (!normalized) return new Set();
    const words = normalized.split(/[\s\p{P}\p{S}]+/u).filter(Boolean);
    const graphemes = SEGMENTER
        ? Array.from(SEGMENTER.segment(normalized), ({ segment }) => segment)
        : Array.from(normalized);
    return new Set([
        ...words,
        ...graphemes.filter((item) => /[\p{L}\p{N}]/u.test(item)),
    ]);
}

function primitiveFieldText(entry) {
    return Object.values(entry.fields ?? {})
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value) => ["string", "number"].includes(typeof value))
        .join(" ");
}

function overlap(left, right) {
    let count = 0;
    for (const value of left) if (right.has(value)) count += 1;
    return count;
}

/** Rank concise same-layer suggestions from labels, vocabulary metadata, and shared references. */
export function similarEntries(entry, entries, limit = 6) {
    const sourceLabel = units(entry.label);
    const sourceFields = units(primitiveFieldText(entry));
    const sourceReferences = new Set(
        (entry.references ?? []).map(({ entryId }) => entryId),
    );
    return entries
        .filter(
            (candidate) =>
                candidate.id !== entry.id &&
                candidate.schemaId === entry.schemaId &&
                candidate.layer === entry.layer &&
                candidate.language === entry.language &&
                candidate.hidden !== true,
        )
        .map((candidate) => {
            const labelScore = overlap(sourceLabel, units(candidate.label));
            const fieldScore = overlap(
                sourceFields,
                units(primitiveFieldText(candidate)),
            );
            const referenceScore = overlap(
                sourceReferences,
                new Set(
                    (candidate.references ?? []).map(({ entryId }) => entryId),
                ),
            );
            return {
                candidate,
                score: labelScore * 5 + referenceScore * 4 + fieldScore,
            };
        })
        .filter(({ score }) => score > 0)
        .sort(
            (left, right) =>
                right.score - left.score ||
                left.candidate.label.localeCompare(right.candidate.label),
        )
        .slice(0, limit)
        .map(({ candidate }) => candidate);
}
