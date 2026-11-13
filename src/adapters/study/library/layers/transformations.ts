import type {
    LibrarySchema,
    LibraryMetadata,
    LibraryTransformText,
    LibraryTransformSet,
} from "../types.js";
import { CONTENT_CLASS_PATTERN } from "../identifiers.js";

function validateText(
    operation: LibraryTransformText,
    code: string,
    depth = 0,
): void {
    if (
        !operation ||
        depth > 1 ||
        typeof operation.removeSuffix !== "string" ||
        typeof operation.append !== "string" ||
        operation.removeSuffix.length > 500 ||
        operation.append.length > 500 ||
        [operation.prepend, operation.removePrefix].some(
            (value) =>
                value !== undefined &&
                (typeof value !== "string" || value.length > 500),
        )
    )
        throw new Error(code);
    if (operation.suffixes !== undefined) {
        if (
            !Array.isArray(operation.suffixes) ||
            !operation.suffixes.length ||
            operation.suffixes.length > 64
        )
            throw new Error(code);
        for (const suffix of operation.suffixes)
            validateText(suffix, code, depth + 1);
    }
}

function validateDefinition(
    definitionTransform: LibraryTransformSet["rules"][number]["definitionTransform"],
    validateMetadata: (value: LibraryMetadata, code: string) => void,
): void {
    if (definitionTransform === undefined) return;
    if (
        !definitionTransform ||
        typeof definitionTransform !== "object" ||
        (definitionTransform.replacements !== undefined &&
            (!Array.isArray(definitionTransform.replacements) ||
                definitionTransform.replacements.length > 100))
    )
        throw new Error("invalid_transform_definition");
    for (const value of [
        definitionTransform?.matchPrefix,
        definitionTransform?.matchSuffix,
        definitionTransform?.template,
    ]) {
        if (value !== undefined && typeof value === "string" && !value)
            throw new Error("invalid_transform_definition");
        if (value !== undefined && typeof value !== "string")
            validateMetadata(value, "invalid_transform_definition");
    }
    for (const replacement of definitionTransform?.replacements ?? []) {
        if (
            !replacement ||
            replacement.match === undefined ||
            replacement.replacement === undefined
        )
            throw new Error("invalid_transform_definition");
        for (const value of [replacement.match, replacement.replacement]) {
            if (value !== undefined && typeof value === "string" && !value)
                throw new Error("invalid_transform_definition");
            if (value !== undefined && typeof value !== "string")
                validateMetadata(value, "invalid_transform_definition");
        }
    }
    if (
        definitionTransform &&
        !definitionTransform.template &&
        !definitionTransform.replacements?.length
    )
        throw new Error("invalid_transform_definition");
}

export function validateTransformSets(
    schema: LibrarySchema,
    validators: {
        assertIdentifier(value: string, code: string): void;
        validateMetadata(value: LibraryMetadata, code: string): void;
    },
): void {
    const { assertIdentifier, validateMetadata } = validators;
    const transformSetIds = new Set<string>();
    for (const set of schema.transformSets ?? []) {
        assertIdentifier(set.id, "invalid_transform_set_id");
        if (transformSetIds.has(set.id))
            throw new Error("duplicate_transform_set");
        transformSetIds.add(set.id);
        validateMetadata(set.metadata, "transform_set_metadata_required");
        if (
            typeof set.flag !== "string" ||
            !set.flag.trim() ||
            set.flag.length > 50
        )
            throw new Error("transform_flag_required");
        if (
            typeof set.baseState !== "string" ||
            !set.baseState.trim() ||
            !Array.isArray(set.matchTags) ||
            !set.matchTags.length ||
            set.matchTags.some(
                (tag) =>
                    typeof tag !== "string" || !tag.trim() || tag.length > 50,
            ) ||
            !Array.isArray(set.rules) ||
            !set.rules.length
        )
            throw new Error("invalid_transform_set");
        const ruleIds = new Set<string>();
        const transitions = new Set<string>();
        for (const rule of set.rules) {
            if (
                rule.resultClass !== undefined &&
                (typeof rule.resultClass !== "string" ||
                    !CONTENT_CLASS_PATTERN.test(rule.resultClass))
            )
                throw new Error("invalid_content_class");
            assertIdentifier(rule.id, "invalid_transform_rule_id");
            if (ruleIds.has(rule.id))
                throw new Error("duplicate_transform_rule");
            ruleIds.add(rule.id);
            validateMetadata(rule.metadata, "transform_rule_metadata_required");
            if (
                typeof rule.fromState !== "string" ||
                !rule.fromState.trim() ||
                typeof rule.toState !== "string" ||
                !rule.toState.trim()
            )
                throw new Error("invalid_transform_rule");
            const transition = `${rule.fromState}\u0000${rule.toState}\u0000${rule.removeSuffix}`;
            if (
                transitions.has(transition) ||
                (rule.removeSuffix === "" &&
                    rule.append === "" &&
                    !rule.prepend &&
                    !rule.removePrefix &&
                    !rule.forms &&
                    !rule.suffixes)
            )
                throw new Error("invalid_transform_rule");
            validateText(rule, "invalid_transform_rule");
            if (rule.pronunciation)
                validateText(
                    rule.pronunciation,
                    "invalid_transform_pronunciation",
                );
            if (rule.forms !== undefined) {
                if (
                    !rule.forms ||
                    typeof rule.forms !== "object" ||
                    Array.isArray(rule.forms) ||
                    Object.keys(rule.forms).length > 5000
                )
                    throw new Error("invalid_transform_forms");
                for (const lemma of Object.keys(rule.forms)) {
                    const form = rule.forms[lemma];
                    if (!lemma.trim() || lemma.length > 500)
                        throw new Error("invalid_transform_forms");
                    validateText(form, "invalid_transform_forms");
                    validateDefinition(
                        form.definitionTransform,
                        validateMetadata,
                    );
                    if (form.pronunciation)
                        validateText(
                            form.pronunciation,
                            "invalid_transform_pronunciation",
                        );
                }
            }
            if (rule.definition)
                validateMetadata(
                    rule.definition,
                    "transform_definition_metadata_required",
                );
            validateDefinition(rule.definitionTransform, validateMetadata);
            transitions.add(transition);
        }
    }
}
