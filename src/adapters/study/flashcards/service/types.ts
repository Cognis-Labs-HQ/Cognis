export interface DeckActor {
    accountId: string;
    role: string;
    claims?: { sub: string };
}

export interface DeckCard {
    id: string;
    label: string;
    schemaId?: string;
    layer?: string;
    fields?: Record<string, unknown>;
    sourceRecordId?: string;
    language?: string;
}

export interface DeckDetail {
    entry: DeckCard;
    references: DeckCard[];
    usedBy?: DeckCard[];
}

export interface DeckLibrary {
    list?(
        actor: DeckActor,
        location: { scope: "global"; scopeId: string },
        filters: { schemaId: string; sourceRecordIds: string[] },
    ): Promise<DeckCard[]>;
    listSchemas?(): Array<{ id: string; language?: string }>;
    read(actor: DeckActor, id: string): Promise<DeckCard | null>;
    trace(actor: DeckActor, id: string): Promise<DeckDetail>;
}

export interface DeckNote {
    id: string;
    front: string;
    back: string;
    pronunciation?: string;
}

export interface DeckProgress {
    due: string;
    interval: number;
    repetitions: number;
}

export interface StudyDeck {
    id: string;
    ownerAccountId: string;
    createdAt?: string;
    provider?: boolean;
    language?: string;
    names?: Record<string, string>;
    cards: DeckDetail[];
    schemas: unknown[];
    canEdit?: boolean;
    canExport?: boolean;
    name: string;
    entryIds: string[];
    notes: DeckNote[];
    progress: Record<string, DeckProgress>;
}
