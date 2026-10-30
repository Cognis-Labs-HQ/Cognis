import type {
    LibraryContentRecord,
    LibraryEntry,
    LibraryMetadata,
    LibraryReferenceInput,
    LibrarySchema,
    LibraryTransformSet,
} from "../../types.js";

type Source = Pick<LibraryContentRecord, "label" | "fields" | "tags" | "class">;

type Reference = NonNullable<LibraryReferenceInput["transformation"]>;

type Rule = LibraryTransformSet["rules"][number];

export interface TransformationNode {
    class?: string;
    state: string;
    value: string;
    pronunciation: string;
    depth: number;
    path: string[];
    rule?: Rule;
    definition?: LibraryMetadata;
    definitionRules?: Rule[];
    parent?: number;
}

export interface TransformationPathway {
    set: LibraryTransformSet;
    nodes: TransformationNode[];
}

type Selection = { set: LibraryTransformSet; node: TransformationNode };

export function generatedTransformationCard(
    source: LibraryEntry,
    schema: LibrarySchema,
    reference?: Reference,
): LibraryEntry;

export function transformationPathways(
    source: Source,
    schema: LibrarySchema,
): TransformationPathway[];

export function matchingTransformation(
    source: Source,
    schema: LibrarySchema,
    text: string,
): Selection | undefined;

export function referencedTransformation(
    source: Source,
    schema: LibrarySchema,
    reference?: Reference,
): Selection | null;

export function referenceMatchesTransformation(
    reference: Pick<LibraryReferenceInput, "transformation">,
    selection?: Reference | Selection | null,
): boolean;

export function dependantsMatchingTransformation(
    entries: readonly LibraryEntry[],
    targetEntryId: string,
    selection?: Reference | Selection | null,
): readonly LibraryEntry[];

export function transformedDefinition(
    definition: string,
    node: TransformationNode,
    language: string,
): string;

export function transformedDefinitions(
    definitions: readonly string[],
    node: TransformationNode,
    language: string,
): string[];
