import {
    compositionReferenceGroups,
    layerForEntry,
    relationshipPresentationRole,
} from "./presentation.js";

export function secondarySpellingGroups(detail, schemas) {
    const semanticRole = layerForEntry(schemas, detail.entry)?.semanticRole;
    if (!["lexicalUnit", "orderedLexicalSequence"].includes(semanticRole)) {
        return [];
    }
    const referencedSpellings = compositionReferenceGroups(detail, schemas)
        .filter(
            (group) =>
                group.presentationRole === "alternateSpelling" &&
                group.entries.length > 0,
        )
        .map((group) => group.entries);
    const sourceLayer = layerForEntry(schemas, detail.entry);
    const dependentSpellings = (detail.usedBy ?? []).flatMap((candidate) => {
        const candidateLayer = layerForEntry(schemas, candidate);
        const alternate = (candidate.references ?? []).some((reference) => {
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
        });
        return alternate &&
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
