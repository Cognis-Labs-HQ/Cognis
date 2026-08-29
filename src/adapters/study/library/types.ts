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
