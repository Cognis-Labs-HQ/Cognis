import {
    compositionReferenceGroups,
    layerForEntry,
    relationshipPresentationRole,
} from "./presentation.js";
import { distinctPronunciationLabels } from "./composition-links.js";

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

export function popupTitleDetailItems(detail, schemas, titleDefinition) {
    const spellingGroups = secondarySpellingGroups(detail, schemas);
    const spellingLabels = new Set(
        spellingGroups.map((group) =>
            group.map((entry) => entry.label).join(""),
        ),
    );
    const spellingItems = spellingGroups.flatMap((group, groupIndex) => [
        ...(groupIndex ? [{ label: " · " }] : []),
        ...linkedItems(group),
    ]);
    const pronunciationItems = distinctPronunciationLabels(
        detail.entry,
        spellingLabels,
    ).flatMap((label, pronunciationIndex) => [
        ...(pronunciationIndex || spellingItems.length
            ? [{ label: " · " }]
            : []),
        { label },
    ]);
    const items = [...spellingItems, ...pronunciationItems];
    if (titleDefinition) {
        items.push(...(items.length ? [{ label: " · " }] : []), {
            label: titleDefinition,
        });
    }
    return items;
}
