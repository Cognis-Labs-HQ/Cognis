export type LibraryScope = "global" | "class" | "user";

export type LocalizedText = Readonly<Record<string, string>>;

export const STRING_LOCALIZATION_CAPABILITY = "localization:translateString";

export interface StringLocalizationCapability {
    translate(request: {
        stringKey: string;
        sourceText: string;
        sourceLanguage: string;
        targetLanguage: string;
    }): Promise<string | null>;
}

export type LibrarySemanticRole =
    | "atomicWritingUnit"
    | "compoundWritingUnit"
    | "lexicalUnit"
    | "orderedLexicalSequence"
    | "passage"
    | "definition"
    | "meaning"
    | "particle"
    | "practicePrompt";

export interface LibraryDetailHint {
    renderer: "text" | "number" | "boolean" | "badge" | "media" | "stroke";
    order?: number;
    group?: string;
    /** When true, selecting a filter in this group clears its other filters. */
    exclusive?: boolean;
    /** When true, the filter group must retain at least one selected tag. */
    required?: boolean;
    /** A tag value that the module requests be selected initially. */
    defaultTag?: string;
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
        | "asset"
        | "audio";
    required?: boolean;
    /** Provider-owned editing and linking semantics. Labels remain in metadata. */
    input?: {
        control:
            | "freeText"
            | "tagList"
            | "singleSelect"
            | "multiSelect"
            | "checkbox"
            | "number"
            | "localizedText"
            | "audioFile";
        options?: readonly {
            value: string;
            metadata: { labels: LocalizedText };
        }[];
        immutable?: boolean;
        /** Relationship whose targets make values in this field deep-linkable. */
        linkRelationship?: string;
        /** File namespace and language-relative prefix used by audioFile controls. */
        file?: { namespace: string; prefix?: string };
    };
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
    onDelete: "restrict" | "detach" | "cascade";
    resolverRole?: "grapheme" | "token" | "longestMatch" | "explicit";
    presentationRole?: "composition" | "alternateSpelling" | "pronunciation";
    variant?: boolean;
    /** Unfold this relationship as a spatial parent/child card hierarchy. */
    child?: boolean;
}

export interface LibraryCardConstructor {
    /** Localized label for the card's primary label control. */
    label: { labels: LocalizedText; descriptions?: LocalizedText };
    /** Field IDs to render, in form order. Omitted fields receive defaults only. */
    fields?: readonly string[];
    /** Relationship IDs to render, in form order. */
    relationships?: readonly string[];
    /** Initial provider-owned field values for a new card. */
    defaults?: Record<string, unknown>;
    /** Expose Cognis' preview-definition switch for this layer. */
    allowAlwaysShowDefinition?: boolean;
    /** Expose Cognis' hidden-card switch for this layer. */
    allowHidden?: boolean;
}

export interface LibraryLayerSchema {
    id: string;
    metadata: { labels: LocalizedText; descriptions?: LocalizedText };
    semanticRole?: LibrarySemanticRole;
    /** Prefer the localized definition referenced by each entry as its display text. */
    displayDefinition?: boolean;
    /** Render entry cards using only their primary display content. */
    minimal?: boolean;
    definitionLocalization?: {
        /** Module-owned prefix used to generate a stable key for each definition. */
        stringKeyPrefix: string;
        stringKeyField: string;
        translationsField: string;
    };
    fields?: readonly LibraryFieldSchema[];
    relationships?: readonly LibraryRelationshipSchema[];
    /** Provider-owned specification for composing new cards in this layer. */
    cardConstructor?: LibraryCardConstructor;
    detail?: { titleField?: string; fieldOrder?: readonly string[] };
    grid?: {
        rowSize: number;
        items: readonly (string | number | { blank: true } | null)[];
    };
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
    /** Exclude the entry and its descendants from direct browsing while retaining references. */
    hidden?: boolean;
    /** Keep the primary localized definition visible in card previews. */
    alwaysShowDefinition?: boolean;
    fields?: Record<string, unknown>;
    references?: LibraryReferenceInput[];
    /** Languages requested by a definition form; used by an optional localization provider. */
    definitionLanguages?: string[];
    /** Explicit confirmation after the API reports matching global content. */
    allowConflict?: boolean;
}

export interface LibraryEntry extends LibraryEntryInput {
    id: string;
    sourceRecordId?: string;
    displayId?: number;
    schemaVersion: number;
    language: string;
    scope: LibraryScope;
    scopeId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    /** Provider-owned content cannot be moved or deleted by users. */
    protected: boolean;
    /** Request-scoped permission hint; never persisted. */
    canDelete?: boolean;
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

export interface LibraryFormContribution {
    id: string;
    schemaId: string;
    layerId: string;
    /** Complete provider-owned creation form specification for the layer. */
    cardConstructor?: LibraryCardConstructor;
    /** Provider-defined field-control overrides keyed by existing field IDs. */
    fields?: readonly LibraryFieldSchema[];
}

export interface LibraryPushRequest {
    id: string;
    sourceEntryId: string;
    destination: LibraryLocation;
    requestedBy: string;
    status: "pending" | "approved" | "rejected";
    /** Included only in authorized review listings. */
    source?: LibraryEntry;
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
    /** Remove records from prior pack versions when they are absent from this version. */
    pruneOmittedRecords?: boolean;
    /** Protect every record in this provider pack from deletion and scope changes. */
    protected?: boolean;
    license: {
        id: string;
        url?: string;
        attribution?: string;
    };
}

export interface LibraryContentRecord {
    id: string;
    /** Optional module-owned numeric position identifier used by a layer grid. */
    displayId?: number;
    /** Exclude the record and its descendants from direct Library browsing. */
    hidden?: boolean;
    alwaysShowDefinition?: boolean;
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
    assets: Array<{
        path: string;
        mediaType:
            | "image/svg+xml"
            | "application/json"
            | "audio/mpeg"
            | "audio/ogg"
            | "audio/wav"
            | "audio/webm"
            | "audio/mp4";
        data: string;
    }>;
}

export interface LibraryAsset {
    mediaType:
        | "image/svg+xml"
        | "application/json"
        | "audio/mpeg"
        | "audio/ogg"
        | "audio/wav"
        | "audio/webm"
        | "audio/mp4";
    data: Buffer;
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
