import {
    createLibraryEntry,
    fetchLibraryEntry,
    fetchLibraryLookupSuggestions,
    fetchLibraryLookupProviders,
} from "/static/gateways/study/ui/library-client.js";
import { appendHorizontalCarouselItem } from "/static/reuse/horizontal-carousel.js";
import { findMatchingEntry } from "./entry-match.js";
import { resolveLookupReferences } from "./lookup-references.js";
import { separateLookupDefinitions } from "./lookup-definitions.js";
import { DEFINITION_LANGUAGES } from "../definition-languages.js";

/** Keep the imported spelling graph only while its original query still matches the card. */
export function lookupCompositionReferences(form, references) {
    if (
        form.elements.label.value.trim().normalize("NFKC") !==
            form.libraryLookupLabel ||
        !form.libraryLookupReferences?.length
    )
        return references;
    const relations = new Set(
        form.libraryLookupReferences.map(({ relation }) => relation),
    );
    return [
        ...references.filter(({ relation }) => !relations.has(relation)),
        ...form.libraryLookupReferences,
    ];
}

/** Resolve provider-declared prerequisites only after a composer match is selected. */
export async function resolveLookupPrerequisites(
    suggestion,
    { providerId, schema, layer: sourceLayer, entries, location, form },
) {
    const prerequisites = suggestion.prerequisites ?? [];
    if (!Array.isArray(prerequisites) || prerequisites.length > 100)
        throw new Error("invalid_lookup_prerequisites");
    const keys = new Set(
        (suggestion.linkedEntries ?? []).map(({ key }) => key),
    );
    for (const prerequisite of prerequisites) {
        const target = schema.layers.find(
            ({ id }) => id === prerequisite?.layer,
        );
        if (
            !target ||
            target.semanticRole !== "compoundWritingUnit" ||
            typeof prerequisite.key !== "string" ||
            !prerequisite.key ||
            prerequisite.key.length > 200 ||
            prerequisite.key === "$root" ||
            keys.has(prerequisite.key) ||
            typeof prerequisite.label !== "string" ||
            !prerequisite.label.trim() ||
            prerequisite.label.length > 100
        )
            throw new Error("invalid_lookup_prerequisite");
        keys.add(prerequisite.key);
    }
    const aliases = new Map();
    for (const prerequisite of prerequisites) {
        const layer = schema.layers.find(({ id }) => id === prerequisite.layer);
        const input = {
            schemaId: schema.id,
            layer: layer.id,
            label: prerequisite.label,
        };
        let entry = findMatchingEntry(entries, input, location);
        if (!entry) {
            const matches = await fetchLibraryLookupSuggestions(
                providerId,
                input,
            );
            const match = matches.find(
                ({ label }) =>
                    label?.normalize("NFKC") === input.label.normalize("NFKC"),
            );
            if (!match) throw new Error("lookup_prerequisite_not_found");
            const fields = { ...match.fields };
            const missingFields = () =>
                (layer.fields ?? [])
                    .filter(
                        ({ id, required }) =>
                            required &&
                            (fields[id] === undefined ||
                                fields[id] === null ||
                                fields[id] === "" ||
                                (Array.isArray(fields[id]) &&
                                    !fields[id].length)),
                    )
                    .map(({ id }) => id);
            if (missingFields().length) {
                const providers = await fetchLibraryLookupProviders(input);
                for (const provider of providers) {
                    const needed = missingFields().filter((id) =>
                        provider.fields?.includes(id),
                    );
                    if (
                        !needed.length ||
                        !provider.capabilities?.includes("strokePattern")
                    )
                        continue;
                    const [result] = await fetchLibraryLookupSuggestions(
                        provider.id,
                        input,
                    );
                    for (const id of needed)
                        if (result?.fields?.[id] !== undefined)
                            fields[id] = result.fields[id];
                }
                if (missingFields().length)
                    throw new Error("lookup_prerequisite_field_required");
            }
            const resolved = resolveLookupReferences(
                match,
                entries,
                schema,
                layer,
            );
            if (resolved.unresolved)
                throw new Error("lookup_prerequisite_unresolved");
            const definitionRelationship = layer.relationships?.find(
                ({ targetLayer }) =>
                    schema.layers.find(({ id }) => id === targetLayer)
                        ?.semanticRole === "definition",
            );
            const definitionLayer = schema.layers.find(
                ({ id }) => id === definitionRelationship?.targetLayer,
            );
            const definitions = definitionLayer
                ? separateLookupDefinitions(match.definitions).map(
                      (definition, index) => ({
                          key: `lookup-definition:${index}`,
                          entry: {
                              schemaId: schema.id,
                              layer: definitionLayer.id,
                              label: definition.translations.en,
                              class: "definition",
                              hidden: true,
                              definitionLanguages: DEFINITION_LANGUAGES,
                              fields: {
                                  [definitionLayer.definitionLocalization
                                      .translationsField]:
                                      definition.translations,
                              },
                          },
                      }),
                  )
                : [];
            const definitionReferences = definitions.map(({ key }) => ({
                entryId: key,
                relation: definitionRelationship.id,
            }));
            const candidate = {
                ...input,
                label: match.label,
                class: match.class,
                tags: match.tags,
                fields,
                references: [
                    ...resolved.suggestion.references,
                    ...definitionReferences,
                ],
                referenceGroups: resolved.suggestion.referenceGroups,
                linkedEntries: [
                    ...(resolved.suggestion.linkedEntries ?? []).map(
                        ({ key, entry }) => ({
                            key,
                            entry: {
                                ...entry,
                                references: [
                                    ...(entry.references ?? []),
                                    ...definitionReferences,
                                ],
                            },
                        }),
                    ),
                    ...definitions,
                ],
            };
            try {
                entry = await createLibraryEntry(location, candidate);
            } catch (error) {
                if (
                    error.message !== "content_conflict" ||
                    !error.details?.conflictEntryId
                )
                    throw error;
                const detail = await fetchLibraryEntry(
                    error.details.conflictEntryId,
                );
                entry = findMatchingEntry([detail.entry], input, location);
                if (!entry)
                    throw new Error("lookup_prerequisite_scope_conflict");
            }
            entries.push(entry);
        }
        aliases.set(prerequisite.key, entry.id);
        // Expose the created card in the carousel without changing staged input.
        for (const relationship of form
            ? (sourceLayer.relationships ?? [])
            : []) {
            if (relationship.targetLayer !== layer.id) continue;
            const select = form.elements[`relationship:${relationship.id}`];
            if (
                !select ||
                [...select.options].some(({ value }) => value === entry.id)
            )
                continue;
            select.append(new Option(entry.label, entry.id));
            const carousel = form.querySelector(
                `[data-horizontal-carousel="${CSS.escape(relationship.id)}"]`,
            );
            if (carousel)
                appendHorizontalCarouselItem(carousel, {
                    value: entry.id,
                    label: entry.label,
                });
        }
    }
    const resolve = (input) => ({
        ...input,
        references: input.references?.map((reference) => ({
            ...reference,
            entryId: aliases.get(reference.entryId) ?? reference.entryId,
        })),
        referenceGroups: Object.fromEntries(
            Object.entries(input.referenceGroups ?? {}).map(
                ([relation, groups]) => [
                    relation,
                    groups.map((group) =>
                        group.map((reference) => ({
                            ...reference,
                            entryId:
                                aliases.get(reference.entryId) ??
                                reference.entryId,
                        })),
                    ),
                ],
            ),
        ),
    });
    return {
        ...resolve(suggestion),
        linkedEntries: suggestion.linkedEntries?.map(({ key, entry }) => ({
            key,
            entry: resolve(entry),
        })),
    };
}
