import {
    compositionReferenceGroups,
    layerForEntry,
    relationshipPresentationRole,
} from "./presentation.js";
import {
    distinctPronunciationLabels,
    excludeTitleReferenceDuplicates,
    resolveReferenceAliasComposition,
} from "./composition-links.js";
import { visibleTitleDefinition } from "./title-definition.js";

function linkedItems(entries) {
    return entries.map((entry) => ({
        label: entry.label,
        actionId: `open-title-reference:${entry.id}`,
    }));
}

export function secondarySpellingGroups(detail, schemas) {
    const semanticRole = layerForEntry(schemas, detail.entry)?.semanticRole;
    if (
        semanticRole !== "lexicalUnit" &&
        semanticRole !== "orderedLexicalSequence"
    ) {
        return [];
    }
    const sourceLayer = layerForEntry(schemas, detail.entry);
    const referencedSpellings = compositionReferenceGroups(detail, schemas)
        .filter(
            (group) =>
                group.presentationRole === "alternateSpelling" &&
                group.entries.length > 0,
        )
        .map((group) => group.entries);
    const dependentSpellings = (detail.usedBy ?? []).flatMap((candidate) => {
        const candidateLayer = layerForEntry(schemas, candidate);
        const isAlternateSpelling = (candidate.references ?? []).some(
            (reference) => {
                if (reference.entryId !== detail.entry.id) return false;
                const relationship = (candidateLayer?.relationships ?? []).find(
                    ({ id }) => id === reference.relation,
                );
                return (
                    relationship &&
                    relationshipPresentationRole(
                        relationship,
                        candidateLayer,
                        schemas,
                    ) === "alternateSpelling"
                );
            },
        );
        return isAlternateSpelling &&
            candidateLayer?.semanticRole === sourceLayer?.semanticRole
            ? [[candidate]]
            : [];
    });
    const seen = new Set();
    return [...referencedSpellings, ...dependentSpellings].filter((group) => {
        const key = group.map((entry) => entry.id).join("\u0000");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function popupTitleDetailItems(
    detail,
    schemas,
    titleDefinition,
    sourceDefinition = "",
    titleReferences = [],
) {
    const layer = layerForEntry(schemas, detail.entry);
    const spellingGroups = excludeTitleReferenceDuplicates(
        secondarySpellingGroups(detail, schemas),
        titleReferences,
    );
    const spellingLabels = new Set(
        spellingGroups.map((group) =>
            group.map((entry) => entry.label).join(""),
        ),
    );
    const spellingItems = spellingGroups.flatMap((group, groupIndex) => [
        ...(groupIndex ? [{ label: " · " }] : []),
        ...linkedItems(group),
    ]);
    const pronunciationField = (layer?.fields ?? []).find(
        ({ id }) => id === "pronunciation",
    );
    const linkRelationships = new Set(
        pronunciationField?.input?.linkRelationships ?? [],
    );
    const linkedPronunciationEntries = linkRelationships.size
        ? (detail.entry.references ?? [])
              .map((reference, authoredIndex) => ({
                  entry: (detail.references ?? []).find(
                      ({ id }) => id === reference.entryId,
                  ),
                  authoredIndex,
                  position: reference.position ?? authoredIndex,
                  relation: reference.relation,
              }))
              .filter(
                  ({ entry, relation }) =>
                      entry && linkRelationships.has(relation),
              )
              .sort(
                  (left, right) =>
                      left.position - right.position ||
                      left.authoredIndex - right.authoredIndex,
              )
              .map(({ entry }) => entry)
        : [];
    const pronunciationItems = distinctPronunciationLabels(
        detail.entry,
        spellingLabels,
    ).flatMap((label, pronunciationIndex) => {
        const linked = linkRelationships.size
            ? resolveReferenceAliasComposition(
                  label,
                  linkedPronunciationEntries,
              )
            : [];
        return [
            ...(pronunciationIndex || spellingItems.length
                ? [{ label: " · " }]
                : []),
            ...(linked.length ? linkedItems(linked) : [{ label }]),
        ];
    });
    const placement =
        detail.entry.class === "composite" ? "reading" : undefined;
    const items = [...spellingItems, ...pronunciationItems].map((item) => ({
        ...item,
        placement,
    }));
    const visibleDefinition = visibleTitleDefinition(
        detail.entry.label,
        layer?.semanticRole,
        titleDefinition,
        sourceDefinition,
    );
    if (visibleDefinition) {
        items.push(
            ...(items.length && detail.entry.class !== "composite"
                ? [{ label: " · " }]
                : []),
            {
                label: visibleDefinition,
                placement:
                    detail.entry.class === "composite"
                        ? "definition"
                        : undefined,
            },
        );
    }
    return items;
}
