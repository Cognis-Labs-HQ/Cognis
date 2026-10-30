import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import {
    ensureDeckDocuments,
    readDeckDocuments,
    writeDeckDocument,
    deleteDeckDocuments,
} from "./documents.js";
import type { StudyDeck, DeckProgress } from "./types.js";

const DECK_COLUMNS = [
    "id",
    "account_id",
    "name",
    "language",
    "created_at",
    "entries_json",
    "notes_json",
];

export class DeckStore {
    constructor(private readonly db: DbExecutor) {}

    async initialize(): Promise<void> {
        await ensureDeckDocuments(this.db);
        await this.db.ensureTable({
            name: "study_decks",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "name", type: "text", notNull: true },
                { name: "language", type: "text" },
                { name: "created_at", type: "text" },
                { name: "document_key", type: "text" },
                { name: "entries_json", type: "text", notNull: true },
                { name: "notes_json", type: "text", notNull: true },
                { name: "cards_json", type: "text", notNull: true },
                { name: "schemas_json", type: "text", notNull: true },
            ],
            indexes: [{ columns: ["account_id"] }],
        });
        await this.db.ensureTable({
            name: "study_deck_reviews",
            columns: [
                { name: "deck_id", type: "text", notNull: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "review_id", type: "text", notNull: true },
                { name: "card_id", type: "text", notNull: true },
                { name: "grade", type: "text", notNull: true },
            ],
            primaryKey: ["deck_id", "account_id", "review_id"],
        });
        await this.db.ensureTable({
            name: "study_deck_progress",
            columns: [
                { name: "deck_id", type: "text", notNull: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "progress_json", type: "text", notNull: true },
                { name: "document_key", type: "text" },
            ],
            primaryKey: ["deck_id", "account_id"],
        });
    }

    async list(accountId: string): Promise<StudyDeck[]> {
        const rows = await readDeckDocuments(
            this.db,
            "study_decks",
            DECK_COLUMNS,
            ["id"],
            [{ column: "account_id", value: accountId }],
        );
        return rows.map((row) => this.decode(row));
    }

    private decode(row: Record<string, unknown>): StudyDeck {
        return {
            id: String(row.id),
            name: String(row.name),
            language: row.language ? String(row.language) : undefined,
            createdAt: row.created_at ? String(row.created_at) : undefined,
            entryIds: JSON.parse(String(row.entries_json)),
            notes: JSON.parse(String(row.notes_json)),
            ownerAccountId: String(row.account_id),
            cards: [],
            schemas: [],
            progress: {},
        };
    }

    async read(accountId: string, id: string): Promise<StudyDeck | undefined> {
        const deck = await this.find(id);
        return deck?.ownerAccountId === accountId ? deck : undefined;
    }

    async find(id: string): Promise<StudyDeck | undefined> {
        const rows = await readDeckDocuments(
            this.db,
            "study_decks",
            DECK_COLUMNS,
            ["id"],
            [{ column: "id", value: id }],
        );
        return rows[0] ? this.decode(rows[0]) : undefined;
    }

    async progress(
        accountId: string,
        id: string,
    ): Promise<Record<string, DeckProgress>> {
        const rows = await readDeckDocuments(
            this.db,
            "study_deck_progress",
            ["deck_id", "account_id", "progress_json"],
            ["deck_id", "account_id"],
            [
                { column: "deck_id", value: id },
                { column: "account_id", value: accountId },
            ],
        );
        return rows[0] ? JSON.parse(String(rows[0].progress_json)) : {};
    }

    /** Lock before any snapshot reads so concurrent schedules serialize under repeatable read too. */
    async lockProgress(accountId: string, id: string): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "study_deck_progress",
            values: { deck_id: id, account_id: accountId, progress_json: "{}" },
            conflict: {
                action: "update",
                target: ["deck_id", "account_id"],
                update: { account_id: accountId },
            },
        });
    }

    async reserveReview(
        accountId: string,
        deckId: string,
        reviewId: string,
        cardId: string,
        grade: string,
    ): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "INSERT",
            table: "study_deck_reviews",
            values: {
                deck_id: deckId,
                account_id: accountId,
                review_id: reviewId,
                card_id: cardId,
                grade,
            },
            conflict: {
                action: "ignore",
                target: ["deck_id", "account_id", "review_id"],
            },
        });
        if (result.rowCount === 1) return true;
        const existing = await this.db.executeCommand({
            option: "SELECT",
            table: "study_deck_reviews",
            where: [
                { column: "deck_id", value: deckId },
                { column: "account_id", value: accountId },
                { column: "review_id", value: reviewId },
            ],
        });
        if (
            existing.rows?.[0]?.card_id !== cardId ||
            existing.rows[0].grade !== grade
        )
            throw new Error("review_attempt_conflict");
        return false;
    }

    async saveProgress(
        accountId: string,
        id: string,
        progress: Record<string, DeckProgress>,
    ): Promise<void> {
        await writeDeckDocument(
            this.db,
            id,
            ["progress", id, accountId],
            { progress_json: progress },
            async (values) =>
                this.db.executeCommand({
                    option: "INSERT",
                    table: "study_deck_progress",
                    values: { deck_id: id, account_id: accountId, ...values },
                    conflict: {
                        action: "update",
                        target: ["deck_id", "account_id"],
                        update: values,
                    },
                }),
        );
    }

    async save(
        accountId: string,
        input: Pick<StudyDeck, "name" | "entryIds" | "notes"> & {
            language?: string;
        },
        id?: string,
    ): Promise<StudyDeck> {
        const previous = id ? await this.read(accountId, id) : undefined;
        if (id && !previous) throw new Error("deck_not_found");
        const deck: StudyDeck = {
            ...input,
            cards: [],
            schemas: [],
            ownerAccountId: accountId,
            progress: {},
            id: id ?? randomUUID(),
            createdAt: previous ? previous.createdAt : new Date().toISOString(),
        };
        const values = {
            name: deck.name,
            language: deck.language ?? null,
            cards_json: "[]",
            schemas_json: "[]",
        };
        await writeDeckDocument(
            this.db,
            deck.id,
            ["deck", deck.id],
            { entries_json: deck.entryIds, notes_json: deck.notes },
            async (parts) =>
                this.db.executeCommand(
                    id
                        ? {
                              option: "UPDATE",
                              table: "study_decks",
                              set: { ...values, ...parts },
                              where: [
                                  { column: "id", value: id },
                                  { column: "account_id", value: accountId },
                              ],
                          }
                        : {
                              option: "INSERT",
                              table: "study_decks",
                              values: {
                                  id: deck.id,
                                  account_id: accountId,
                                  created_at: deck.createdAt,
                                  ...values,
                                  ...parts,
                              },
                          },
                ),
        );
        return deck;
    }

    async delete(accountId: string, id: string): Promise<void> {
        if (!(await this.read(accountId, id)))
            throw new Error("deck_not_found");
        await this.db.executeCommand({
            option: "DELETE",
            table: "study_deck_progress",
            where: [{ column: "deck_id", value: id }],
        });
        await this.db.executeCommand({
            option: "DELETE",
            table: "study_deck_reviews",
            where: [{ column: "deck_id", value: id }],
        });
        await deleteDeckDocuments(this.db, id);
        await this.db.executeCommand({
            option: "DELETE",
            table: "study_decks",
            where: [
                { column: "id", value: id },
                { column: "account_id", value: accountId },
            ],
        });
    }

    async transact<T>(operation: (store: DeckStore) => Promise<T>): Promise<T> {
        return this.db.transaction((db) => operation(new DeckStore(db)));
    }
}
