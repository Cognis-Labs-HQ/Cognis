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
    language?: string;
}
export interface DeckDetail {
    entry: DeckCard;
    references: DeckCard[];
    usedBy?: DeckCard[];
}
export interface DeckLibrary {
    listSchemas?(): Array<{ id: string }>;
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
    cards: DeckDetail[];
    schemas: unknown[];
    canEdit?: boolean;
    name: string;
    entryIds: string[];
    notes: DeckNote[];
    progress: Record<string, DeckProgress>;
}
