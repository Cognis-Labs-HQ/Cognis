export type LibraryScope = "global" | "class" | "user";

export interface LibraryFieldSchema {
    id: string;
    label: string;
    type: "string" | "number" | "boolean";
    required?: boolean;
}

export interface LibraryRelationshipSchema {
    id: string;
    targetLayer: string;
    label: string;
    minimum?: number;
    maximum?: number;
    ordered?: boolean;
    resolver?: "grapheme" | "longest-match" | "explicit";
}

export interface LibraryLayerSchema {
    id: string;
    label: string;
    fields?: readonly LibraryFieldSchema[];
    relationships?: readonly LibraryRelationshipSchema[];
}

export interface LibrarySchema {
    id: string;
    version: number;
    language: string;
    label: string;
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
