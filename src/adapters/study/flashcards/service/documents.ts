import { createHash } from "node:crypto";
import { textChunks } from "../../../../gateways/reuse/text-chunks.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbWhereClause } from "../../../../gateways/db/reuse/db-command.js";

const TABLE = "study_deck_document_parts";

export async function ensureDeckDocuments(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: TABLE,
        columns: [
            { name: "document_key", type: "text", notNull: true },
            { name: "field", type: "text", notNull: true },
            { name: "position", type: "integer", notNull: true },
            { name: "content", type: "text", notNull: true },
            { name: "deck_id", type: "text", notNull: true },
        ],
        primaryKey: ["document_key", "field", "position"],
        indexes: [{ columns: ["deck_id"] }],
    });
}

/** Base fragments and continuation rows share the caller's scheduling or save transaction. */
export async function writeDeckDocument(
    db: DbExecutor,
    deckId: string,
    identity: string[],
    fields: Record<string, unknown>,
    persist: (values: Record<string, string>) => Promise<unknown>,
): Promise<void> {
    const key = createHash("sha256")
        .update(JSON.stringify(identity))
        .digest("hex");
    const documents = Object.entries(fields).map(([field, value]) => ({
        field,
        parts: textChunks(JSON.stringify(value), 60_000),
    }));
    await persist({
        document_key: key,
        ...Object.fromEntries(
            documents.map(({ field, parts }) => [field, parts.next().value!]),
        ),
    });
    await db.executeCommand({
        option: "DELETE",
        table: TABLE,
        where: [{ column: "document_key", value: key }],
    });
    for (const { field, parts } of documents) {
        let position = 1;
        for (const content of parts) {
            await db.executeCommand({
                option: "INSERT",
                table: TABLE,
                values: {
                    document_key: key,
                    field,
                    position,
                    content,
                    deck_id: deckId,
                },
            });
            position++;
        }
    }
}

/** One joined read keeps every document on the same committed revision. */
export async function readDeckDocuments(
    db: DbExecutor,
    table: string,
    columns: string[],
    identity: string[],
    where: StructuredDbWhereClause[],
): Promise<Record<string, unknown>[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table,
        columns: [
            ...columns.map((column) => ({
                col: `${table}.${column}`,
                as: column,
            })),
            { col: `${TABLE}.field`, as: "part_field" },
            { col: `${TABLE}.content`, as: "part_content" },
        ],
        joins: [
            {
                type: "LEFT",
                table: TABLE,
                on: {
                    leftColumn: `${table}.document_key`,
                    rightColumn: `${TABLE}.document_key`,
                },
            },
        ],
        where: where.map((condition) => ({
            ...condition,
            column: `${table}.${condition.column}`,
        })),
        orderBy: [{ column: `${TABLE}.position`, direction: "ASC" }],
    });
    const documents = new Map<string, Record<string, unknown>>();
    for (const row of result.rows ?? []) {
        const key = JSON.stringify(identity.map((column) => row[column]));
        let document = documents.get(key);
        if (!document) {
            document = Object.fromEntries(
                columns.map((column) => [column, row[column]]),
            );
            documents.set(key, document);
        }
        if (
            typeof row.part_field === "string" &&
            typeof row.part_content === "string"
        )
            document[row.part_field] =
                String(document[row.part_field]) + row.part_content;
    }
    return [...documents.values()];
}

export async function deleteDeckDocuments(
    db: DbExecutor,
    deckId: string,
): Promise<void> {
    await db.executeCommand({
        option: "DELETE",
        table: TABLE,
        where: [{ column: "deck_id", value: deckId }],
    });
}
