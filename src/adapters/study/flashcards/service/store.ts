import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StudyDeck, DeckDetail, DeckProgress } from "./types.js";

export class DeckStore {
    constructor(private readonly db: DbExecutor) {}

    async initialize(): Promise<void> {
        await this.db.ensureTable({
            name: "study_decks",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "name", type: "text", notNull: true },
                { name: "language", type: "text" },
                { name: "created_at", type: "text" },
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
            ],
            primaryKey: ["deck_id", "account_id"],
        });
    }

    async list(accountId: string): Promise<StudyDeck[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_decks",
            columns: ["*"],
            where: [{ column: "account_id", value: accountId }],
        });
        return (result.rows ?? []).map((row) => this.decode(row));
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
            cards: JSON.parse(String(row.cards_json)),
            schemas: JSON.parse(String(row.schemas_json)),
            progress: {},
        };
    }

    async read(accountId: string, id: string): Promise<StudyDeck | undefined> {
        const deck = await this.find(id);
        return deck?.ownerAccountId === accountId ? deck : undefined;
    }

    async find(id: string): Promise<StudyDeck | undefined> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_decks",
            columns: ["*"],
            where: [{ column: "id", value: id }],
        });
        return result.rows?.[0] ? this.decode(result.rows[0]) : undefined;
    }

    async progress(
        accountId: string,
        id: string,
    ): Promise<Record<string, DeckProgress>> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_deck_progress",
            columns: ["progress_json"],
            where: [
                { column: "deck_id", value: id },
                { column: "account_id", value: accountId },
            ],
        });
        return result.rows?.[0]
            ? JSON.parse(String(result.rows[0].progress_json))
            : {};
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
        await this.db.executeCommand({
            option: "INSERT",
            table: "study_deck_progress",
            values: {
                deck_id: id,
                account_id: accountId,
                progress_json: JSON.stringify(progress),
            },
            conflict: {
                action: "update",
                target: ["deck_id", "account_id"],
                update: { progress_json: JSON.stringify(progress) },
            },
        });
    }

    async save(
        accountId: string,
        input: Pick<StudyDeck, "name" | "entryIds" | "notes"> & {
            cards?: DeckDetail[];
            schemas?: unknown[];
            language?: string;
        },
        id?: string,
    ): Promise<StudyDeck> {
        const deck: StudyDeck = {
            ...input,
            cards: input.cards ?? [],
            schemas: input.schemas ?? [],
            ownerAccountId: accountId,
            progress: {},
            id: id ?? randomUUID(),
            createdAt: id
                ? (await this.read(accountId, id))?.createdAt
                : new Date().toISOString(),
        };
        const values = {
            name: deck.name,
            language: deck.language ?? null,
            entries_json: JSON.stringify(deck.entryIds),
            notes_json: JSON.stringify(deck.notes),
            cards_json: JSON.stringify(deck.cards),
            schemas_json: JSON.stringify(deck.schemas),
        };
        await this.db.executeCommand(
            id
                ? {
                      option: "UPDATE",
                      table: "study_decks",
                      set: values,
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
                      },
                  },
        );
        return deck;
    }

    async delete(accountId: string, id: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "study_deck_reviews",
            where: [{ column: "deck_id", value: id }],
        });
        await this.db.executeCommand({
            option: "DELETE",
            table: "study_deck_progress",
            where: [{ column: "deck_id", value: id }],
        });
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
