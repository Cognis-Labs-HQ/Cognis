import {
    fetchLibraryEntries,
    fetchLibraryLocations,
} from "/static/gateways/study/ui/library-client.js";

export async function loadDictionaryReferences(results, schemas) {
    const { readable } = await fetchLibraryLocations();
    const requests = new Map();
    for (const result of results) {
        const schema = schemas.find(({ id }) => id === result.schemaId);
        const layer = schema?.layers.find(({ id }) => id === result.layer);
        for (const relationship of layer?.relationships ?? []) {
            const target = schema.layers.find(
                ({ id }) => id === relationship.targetLayer,
            );
            const key = `${schema.id}:${target.id}`;
            const selected = requests.get(key) ?? {
                schemaId: schema.id,
                layer: target.id,
                ids: new Set(),
                all: false,
            };
            const references = [
                ...(result.references ?? []),
                ...Object.values(result.referenceGroups ?? {}).flat(2),
            ];
            for (const reference of references) {
                if (reference.relation === relationship.id)
                    selected.ids.add(reference.entryId);
            }
            if (
                target.semanticRole === "atomicWritingUnit" &&
                relationship.presentationRole === "pronunciation" &&
                result.fields?.pronunciation
            )
                selected.all = true;
            if (selected.all || selected.ids.size) requests.set(key, selected);
        }
    }
    const entries = (
        await Promise.all(
            [...requests.values()].flatMap(({ schemaId, layer, ids, all }) =>
                readable.flatMap((location) => {
                    const filters = { ...location, schemaId, layer };
                    if (all) return [fetchLibraryEntries(filters)];
                    return [
                        fetchLibraryEntries({ ...filters, entryIds: [...ids] }),
                        fetchLibraryEntries({
                            ...filters,
                            sourceRecordIds: [...ids],
                        }),
                    ];
                }),
            ),
        )
    ).flat();
    return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}
