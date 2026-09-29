import {
    compositionReferenceGroups,
    layerForEntry,
    pronunciationValues,
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

function normalizedTitleText(value) {
    return String(value).trim().normalize("NFKC").replaceAll(/\s+/g, "");
}

export const hasReadingDetails = (items) =>
    items.some(({ placement }) => placement === "reading");

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
    const displayedSpellingGroups = spellingGroups.map((group) =>
        normalizedTitleText(group.map((entry) => entry.label).join("")) ===
        normalizedTitleText(detail.entry.label)
            ? group.map((entry) => ({
                  ...entry,
                  label: pronunciationValues(entry)[0] ?? entry.label,
              }))
            : group,
    );
    const spellingItems = displayedSpellingGroups.flatMap(
        (group, groupIndex) => [
            ...(groupIndex ? [{ label: " · " }] : []),
            ...linkedItems(group),
        ],
    );
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
    const linkedPronunciationGroups = Array.from(linkRelationships).flatMap(
        (relation) =>
            (detail.entry.referenceGroups?.[relation] ?? []).map((group) =>
                group
                    .slice()
                    .sort(
                        (left, right) =>
                            (left.position ?? 0) - (right.position ?? 0),
                    )
                    .map(({ entryId }) =>
                        (detail.references ?? []).find(
                            ({ id }) => id === entryId,
                        ),
                    )
                    .filter(Boolean),
            ),
    );
    const pronunciationGroups = distinctPronunciationLabels(
        detail.entry,
        spellingLabels,
    )
        .map((label, pronunciationIndex) => {
            const linked = linkRelationships.size
                ? resolveReferenceAliasComposition(
                      label,
                      linkedPronunciationGroups.length
                          ? (linkedPronunciationGroups[pronunciationIndex] ??
                                [])
                          : linkedPronunciationEntries,
                  )
                : [];
            const linkedLabel = linked.map((entry) => entry.label).join("");
            const displayedLinked =
                linked.length &&
                normalizedTitleText(linkedLabel) ===
                    normalizedTitleText(detail.entry.label)
                    ? linked.map((entry) => ({
                          ...entry,
                          label: pronunciationValues(entry)[0] ?? entry.label,
                      }))
                    : linked;
            return { label, linked: displayedLinked };
        })
        .filter(({ label, linked }) => {
            const displayedPronunciation = linked.length
                ? linked.map((entry) => entry.label).join("")
                : label;
            return (
                normalizedTitleText(displayedPronunciation) !==
                normalizedTitleText(detail.entry.label)
            );
        });
    const pronunciationItems = pronunciationGroups.flatMap(
        ({ label, linked }, pronunciationIndex) => [
            ...(pronunciationIndex || spellingItems.length
                ? [{ label: " · " }]
                : []),
            ...(linked.length ? linkedItems(linked) : [{ label }]),
        ],
    );
    const placement = "reading";
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
        items.push({
            label: visibleDefinition,
            placement: "definition",
        });
    }
    return items;
}
