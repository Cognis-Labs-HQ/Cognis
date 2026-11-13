import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
    StructuredDbWhereClause,
} from "../../../db/reuse/db-command.js";
import type { DbExecutor } from "../../../db/reuse/db-executor.js";
import type { StructuredDbTableDef } from "../../../db/reuse/db-table.js";

export class MemoryExecutor implements DbExecutor {
    public readonly tableDefs: StructuredDbTableDef[] = [];
    public readonly rows = new Map<string, Record<string, unknown>>();
    public readonly auxiliaryRows = new Map<
        string,
        Map<string, Record<string, unknown>>
    >();

    constructor(private readonly primaryTable = "share_tokens") {}

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        this.tableDefs.push(def);
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const rows =
            command.table === this.primaryTable
                ? this.rows
                : (this.auxiliaryRows.get(command.table) ??
                  new Map<string, Record<string, unknown>>());
        this.auxiliaryRows.set(command.table, rows);
        if (command.option === "INSERT") {
            const key = String(
                command.values.id ??
                    command.values.resource_key ??
                    command.values.guest_id ??
                    "",
            );
            rows.set(key, { ...command.values });
            return { rowCount: 1 };
        }
        if (command.option === "SELECT") {
            const entries = Array.from(rows.values()).filter((row) =>
                this.matchesWhere(row, command.where ?? []),
            );
            return { rows: entries };
        }
        if (command.option === "UPDATE") {
            let rowCount = 0;
            for (const [key, row] of rows.entries()) {
                if (this.matchesWhere(row, command.where ?? [])) {
                    rows.set(key, { ...row, ...command.set });
                    rowCount += 1;
                }
            }
            return { rowCount };
        }
        if (command.option === "DELETE") {
            const beforeSize = rows.size;
            for (const [key, row] of rows.entries()) {
                const matches = this.matchesWhere(row, command.where ?? []);
                if (matches) {
                    rows.delete(key);
                }
            }
            return { rowCount: beforeSize - rows.size };
        }
        throw new Error("Unsupported structured command");
    }

    private matchesWhere(
        row: Record<string, unknown>,
        conditions: StructuredDbWhereClause[] = [],
    ): boolean {
        return conditions.every((condition) => {
            const rowValue = row[condition.column];
            if (condition.operator === "<") {
                return String(rowValue ?? "") < String(condition.value ?? "");
            }
            if (condition.operator === "!=") {
                return rowValue !== condition.value;
            }
            if (
                condition.operator === undefined ||
                condition.operator === "="
            ) {
                return rowValue === condition.value;
            }
            throw new Error(`Unsupported condition: ${condition.operator}`);
        });
    }

    async transaction<T>(
        callback: (executor: DbExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }
}
