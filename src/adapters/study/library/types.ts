export type LibraryScope = "global" | "class" | "user";

export type LocalizedText = Readonly<Record<string, string>>;

export type LibrarySemanticRole =
    | "atomicWritingUnit"
    | "compoundWritingUnit"
    | "lexicalUnit"
    | "orderedLexicalSequence"
    | "passage"
    | "definition"
    | "practicePrompt";

export interface LibraryDetailHint {
    renderer: "text" | "number" | "boolean" | "badge" | "media" | "stroke";
    order?: number;
    group?: string;
    hidden?: boolean;
}

export interface LibraryFieldSchema {
    id: string;
    metadata: { labels: LocalizedText; descriptions?: LocalizedText };
    type:
        | "string"
        | "number"
        | "integer"
        | "boolean"
        | "localizedText"
        | "stringList"
        | "asset";
    required?: boolean;
    detail?: LibraryDetailHint;
}

export interface LibraryRelationshipSchema {
    id: string;
    targetLayer: string;
    metadata: { labels: LocalizedText; descriptions?: LocalizedText };
    minimum?: number;
    maximum?: number;
    ordered?: boolean;
    requiredTarget?: boolean;
    onDelete?: "restrict" | "detach" | "cascade";
    resolverRole?: "grapheme" | "token" | "longestMatch" | "explicit";
}

export interface LibraryLayerSchema {
    id: string;
    metadata: { labels: LocalizedText; descriptions?: LocalizedText };
    semanticRole?: LibrarySemanticRole;
    fields?: readonly LibraryFieldSchema[];
    relationships?: readonly LibraryRelationshipSchema[];
    detail?: { titleField?: string; fieldOrder?: readonly string[] };
    activityCompatibility?: readonly string[];
    interestVeins?: readonly string[];
    strokeAsset?: {
        field: string;
        format: "svg" | "json";
        coordinateSystem?: string;
    };
}

export interface LibrarySchema {
    id: string;
    version: number;
    namespace: string;
    language: string;
    metadata: { labels: LocalizedText; descriptions?: LocalizedText };
    layers: readonly LibraryLayerSchema[];
}

export interface LibraryReferenceInput {
    entryId: string;
    relation: string;
    position?: number;
}

export interface LibraryEntryInput {
    schemaId: string;
    schemaVersion?: number;
    layer: string;
    label: string;
    fields?: Record<string, unknown>;
    references?: LibraryReferenceInput[];
}

export interface LibraryEntry extends LibraryEntryInput {
    id: string;
    schemaVersion: number;
    language: string;
    scope: LibraryScope;
    scopeId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface LibraryLocation {
    scope: LibraryScope;
    scopeId?: string;
}

export interface LibraryResolutionProposal {
    relationship: string;
    references: LibraryReferenceInput[];
    unresolved: string[];
    resolver: string;
    deterministic: boolean;
}

export interface LibraryLookupSuggestion {
    provider: string;
    fields?: Record<string, unknown>;
    references?: LibraryReferenceInput[];
    provenance: string;
    confidence: number;
}

export interface LibraryLookupProvider {
    id: string;
    supports(schema: LibrarySchema, layer: LibraryLayerSchema): boolean;
    lookup(input: {
        schema: LibrarySchema;
        layer: LibraryLayerSchema;
        label: string;
    }): Promise<LibraryLookupSuggestion[]>;
}

export interface LibraryPushRequest {
    id: string;
    sourceEntryId: string;
    destination: LibraryLocation;
    requestedBy: string;
    status: "pending" | "approved" | "rejected";
}

export interface LibraryContentPackManifest {
    id: string;
    publisher: string;
    version: string;
    contentRevision: string;
    namespace: string;
    schema: string;
    content: string;
    assets?: string;
    license: {
        id: string;
        url?: string;
        attribution?: string;
    };
}

export interface LibraryContentRecord {
    id: string;
    label: string;
    fields?: Record<string, unknown>;
    references?: LibraryReferenceInput[];
}

export interface LibraryContentPackPlan {
    root: string;
    manifest: LibraryContentPackManifest;
    schema: LibrarySchema;
    digest: string;
    records: Array<LibraryContentRecord & { layer: string }>;
}

export interface LibraryContentPackReceipt {
    packId: string;
    publisher: string;
    version: string;
    contentRevision: string;
    schemaId: string;
    schemaVersion: number;
    digest: string;
    recordCount: number;
    relationshipCount: number;
    unchanged: boolean;
}
