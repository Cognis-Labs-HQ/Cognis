import { createHash } from "node:crypto";
/** The persistence capability required by tutorial completion; no driver implementation is imported. */
export interface TutorialDatabase {
    ensureTable(definition: {
        name: string;
        columns: Array<{
            name: string;
            type: "text" | "timestamp";
            primaryKey?: boolean;
            notNull?: boolean;
        }>;
        indexes?: Array<{ columns: string[] }>;
    }): Promise<void>;
    executeCommand(
        command:
            | {
                  option: "SELECT";
                  table: string;
                  columns: string[];
                  where: Array<{ column: string; value: string }>;
              }
            | {
                  option: "INSERT";
                  table: string;
                  values: Record<string, unknown>;
                  conflict: { action: "ignore"; target: string[] };
              },
    ): Promise<{ rows?: Array<Record<string, unknown>> }>;
    transaction<T>(
        execute: (executor: TutorialDatabase) => Promise<T>,
    ): Promise<T>;
}

const table = "tutorial_completions";

export function createTutorialCompletionStore(database: TutorialDatabase) {
    let schema: Promise<void> | undefined;
    async function ready() {
        if (!schema) {
            schema = database.ensureTable({
                name: table,
                columns: [
                    {
                        name: "completion_key",
                        type: "text",
                        primaryKey: true,
                        notNull: true,
                    },
                    { name: "account_id", type: "text", notNull: true },
                    { name: "tutorial_id", type: "text", notNull: true },
                    { name: "completed_at", type: "timestamp", notNull: true },
                ],
                indexes: [{ columns: ["account_id"] }],
            });
            schema.catch(() => {
                schema = undefined;
            });
        }
        await schema;
    }
    return {
        async list(accountId: string): Promise<string[]> {
            await ready();
            const result = await database.executeCommand({
                option: "SELECT",
                table,
                columns: ["tutorial_id"],
                where: [{ column: "account_id", value: accountId }],
            });
            return (result.rows ?? []).map((row) => String(row.tutorial_id));
        },
        async complete(accountId: string, ids: string[]) {
            await ready();
            await database.transaction(async (transaction) => {
                for (const id of new Set(ids)) {
                    await transaction.executeCommand({
                        option: "INSERT",
                        table,
                        values: {
                            completion_key: createHash("sha256")
                                .update(JSON.stringify([accountId, id]))
                                .digest("hex"),
                            account_id: accountId,
                            tutorial_id: id,
                            completed_at: new Date().toISOString(),
                        },
                        conflict: {
                            action: "ignore",
                            target: ["completion_key"],
                        },
                    });
                }
            });
        },
    };
}
