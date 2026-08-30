export const LIBRARY_LAYERS = [
    "alphabet",
    "alt_characters",
    "definitions",
    "words",
    "sentences",
    "exercises",
    "workouts",
    "routines",
    "collections",
] as const;

export type LibraryLayer = (typeof LIBRARY_LAYERS)[number];
export type LibraryScope = "global" | "class" | "user";

export interface LibraryLayerLink {
    layer: LibraryLayer;
    relation: string;
    required?: boolean;
}

export interface LibraryLayerTemplate {
    id: LibraryLayer;
    links: readonly LibraryLayerLink[];
}

export interface LibraryTemplate {
    id: string;
    layers: readonly LibraryLayerTemplate[];
}

export interface LibraryReferenceInput {
    entryId: string;
    relation?: string;
    position?: number;
}

export interface LibraryEntryInput {
    layer: LibraryLayer;
    language?: string;
    label: string;
    fields?: Record<string, unknown>;
    references?: LibraryReferenceInput[];
}

export interface LibraryEntry extends LibraryEntryInput {
    id: string;
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

export interface LibraryPushRequest {
    id: string;
    sourceEntryId: string;
    destination: LibraryLocation;
    requestedBy: string;
    status: "pending" | "approved" | "rejected";
}
