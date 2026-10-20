import type {
    LibrarySchema,
    LibraryReferenceInput,
    LibraryEntry,
} from "../types.js";

export function validateReferenceTransformation(
    schema: LibrarySchema,
    reference: LibraryReferenceInput,
    target: LibraryEntry,
): void {
    if (!reference.transformation) return;
    const set = (schema.transformSets ?? []).find(
        ({ id }) => id === reference.transformation?.setId,
    );
    if (
        !set ||
        !set.matchTags.every((tag) => target.tags?.includes(tag)) ||
        (set.optInTag !== undefined && !target.tags?.includes(set.optInTag)) ||
        !reference.transformation.path.length
    )
        throw new Error("invalid_reference_transformation");
    let state = set.baseState;
    let value = target.label;
    for (const ruleId of reference.transformation.path) {
        const rule = set.rules.find(
            (candidate) =>
                candidate.id === ruleId && candidate.fromState === state,
        );
        if (!rule || !value.endsWith(rule.removeSuffix))
            throw new Error("invalid_reference_transformation");
        value = `${value.slice(0, -rule.removeSuffix.length || undefined)}${rule.append}`;
        state = rule.toState;
    }
}
