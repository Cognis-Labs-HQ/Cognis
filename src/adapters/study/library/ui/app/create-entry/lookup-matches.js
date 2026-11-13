import { referencedLinkedEntries } from "../linked-entries.js";

const normalized = (value) =>
    String(value ?? "")
        .trim()
        .normalize("NFKC");
const unique = (values) => [
    ...new Map(values.map((value) => [JSON.stringify(value), value])).values(),
];

/** Combine exact-composition dictionary results without mixing expanded spellings or alias keys. */
export function groupLookupSuggestions(suggestions, layer) {
    const groups = new Map();
    for (const suggestion of suggestions) {
        const identity = normalized(suggestion.label);
        const group = groups.get(identity) ?? [];
        group.push(suggestion);
        groups.set(identity, group);
    }
    return [...groups.values()].map((group) => {
        if (group.length === 1) return group[0];
        const ordered = group.toSorted(
            (left, right) => (right.confidence ?? 0) - (left.confidence ?? 0),
        );
        const result = structuredClone(ordered[0]);
        result.fields = { ...result.fields, pronunciation: [] };
        result.references = [];
        result.referenceGroups = {};
        result.linkedEntries = [];
        result.definitions = unique(
            ordered.flatMap(({ definitions }) => definitions ?? []),
        );
        result.tags = [...new Set(ordered.flatMap(({ tags }) => tags ?? []))];
        result.prerequisites = unique(
            ordered.flatMap(({ prerequisites }) => prerequisites ?? []),
        );
        for (const [index, suggestion] of ordered.entries()) {
            const aliases = new Map(
                (suggestion.linkedEntries ?? []).map(({ key }) => [
                    key,
                    `match:${index}:${key}`,
                ]),
            );
            const resolve = (reference) => ({
                ...reference,
                entryId: aliases.get(reference.entryId) ?? reference.entryId,
            });
            const readings = Array.isArray(suggestion.fields?.pronunciation)
                ? suggestion.fields.pronunciation
                : [];
            const previous = [...result.fields.pronunciation];
            result.fields.pronunciation.push(
                ...readings.filter((reading) => !previous.includes(reading)),
            );
            result.references.push(
                ...(suggestion.references ?? []).map(resolve),
            );
            for (const [relation, sourceGroups] of Object.entries(
                suggestion.referenceGroups ?? {},
            )) {
                const relationship = layer.relationships?.find(
                    ({ id }) => id === relation,
                );
                const selected =
                    relationship?.presentationRole === "pronunciation"
                        ? sourceGroups.filter(
                              (_group, position) =>
                                  !previous.includes(readings[position]),
                          )
                        : sourceGroups;
                result.referenceGroups[relation] = unique([
                    ...(result.referenceGroups[relation] ?? []),
                    ...selected.map((group) => group.map(resolve)),
                ]);
            }
            result.linkedEntries.push(
                ...(suggestion.linkedEntries ?? []).map(({ key, entry }) => ({
                    key: aliases.get(key),
                    entry: {
                        ...entry,
                        references: entry.references?.map(resolve),
                        referenceGroups: Object.fromEntries(
                            Object.entries(entry.referenceGroups ?? {}).map(
                                ([relation, groups]) => [
                                    relation,
                                    groups.map((group) => group.map(resolve)),
                                ],
                            ),
                        ),
                    },
                })),
            );
        }
        result.references = unique(result.references);
        result.linkedEntries = referencedLinkedEntries(
            result,
            result.linkedEntries,
        );
        result.fields.dictionary_data = JSON.stringify({
            records: ordered
                .map(({ fields }) => fields?.dictionary_data)
                .filter(Boolean),
        });
        return result;
    });
}
