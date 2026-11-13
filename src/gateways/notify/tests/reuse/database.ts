import type { DbExecutor } from "../../../db/reuse/db-executor.js";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../../db/reuse/db-table.js";

type Row = Record<string, unknown>;

export class NotificationTestDatabase implements DbExecutor {
    private readonly tables = new Map<string, Row[]>();
    private readonly schemas = new Map<string, StructuredDbTableDef>();

    async ensureTable(schema: StructuredDbTableDef): Promise<void> {
        this.schemas.set(schema.name, schema);
        if (!this.tables.has(schema.name)) this.tables.set(schema.name, []);
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const rows = this.tables.get(command.table);
        if (!rows) throw new Error(`Unknown test table: ${command.table}`);
        if (command.option === "INSERT") {
            const schema = this.schemas.get(command.table)!;
            const keys = command.conflict?.target ?? schema.primaryKey ?? [];
            const existing = keys.length
                ? rows.find((row) =>
                      keys.every((key) => row[key] === command.values[key]),
                  )
                : undefined;
            if (existing) {
                if (!command.conflict) throw new Error("duplicate_test_key");
                if (command.conflict.action === "update")
                    Object.assign(
                        existing,
                        command.conflict.update ?? command.values,
                    );
            } else {
                rows.push({ ...command.values });
            }
            return { rowCount: 1 };
        }
        const matches = (row: Row) =>
            (command.where ?? []).every((clause) => {
                if (!clause.operator || clause.operator === "=")
                    return row[clause.column] === clause.value;
                if (clause.operator === "!=")
                    return row[clause.column] !== clause.value;
                throw new Error(
                    `Unsupported test operator: ${clause.operator}`,
                );
            });
        const selected = rows.filter(matches);
        if (command.option === "DELETE") {
            this.tables.set(
                command.table,
                rows.filter((row) => !matches(row)),
            );
        } else if (command.option === "UPDATE") {
            for (const row of selected) Object.assign(row, command.set);
        } else {
            if (command.joins?.length || command.count)
                throw new Error("Unsupported test select");
            for (const order of [...(command.orderBy ?? [])].reverse()) {
                selected.sort(
                    (left, right) =>
                        String(left[order.column]).localeCompare(
                            String(right[order.column]),
                        ) * (order.direction === "DESC" ? -1 : 1),
                );
            }
            const limited =
                command.limit === undefined
                    ? selected
                    : selected.slice(0, command.limit);
            return {
                rows: limited.map((row) =>
                    Object.fromEntries(
                        (command.columns ?? Object.keys(row)).map((column) =>
                            typeof column === "string"
                                ? [column, row[column]]
                                : [column.as, row[column.col]],
                        ),
                    ),
                ),
                rowCount: limited.length,
            };
        }
        return { rowCount: selected.length };
    }

    async transaction<T>(
        callback: (executor: DbExecutor) => Promise<T>,
    ): Promise<T> {
        const snapshot = structuredClone(this.tables);
        try {
            return await callback(this);
        } catch (error) {
            this.tables.clear();
            for (const [name, rows] of snapshot) this.tables.set(name, rows);
            throw error;
        }
    }
}
