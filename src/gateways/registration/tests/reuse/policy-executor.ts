import type { DbExecutor } from "../../../db/reuse/db-executor.js";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../../db/reuse/db-command.js";

export class PolicyExecutor implements DbExecutor {
    private readonly tables = new Map<string, Record<string, unknown>[]>();

    async ensureTable(definition: { name: string }): Promise<void> {
        if (!this.tables.has(definition.name))
            this.tables.set(definition.name, []);
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const rows = this.tables.get(command.table);
        if (!rows) throw new Error(`Unexpected table: ${command.table}`);
        if (command.option === "SELECT") {
            const matches = rows.filter((row) =>
                (command.where ?? []).every((clause) => {
                    if (clause.operator && clause.operator !== "=")
                        throw new Error("Unexpected policy filter");
                    return row[clause.column] === clause.value;
                }),
            );
            return {
                rows: matches.map((row) => ({ ...row })),
                rowCount: matches.length,
            };
        }
        if (command.option === "INSERT") {
            const targets = command.conflict?.target ?? [];
            const existing = targets.length
                ? rows.find((row) =>
                      targets.every((key) => row[key] === command.values[key]),
                  )
                : undefined;
            if (existing && command.conflict?.action === "update")
                Object.assign(existing, command.conflict.update);
            else if (!existing) rows.push({ ...command.values });
            return { rows: [], rowCount: 1 };
        }
        throw new Error(`Unexpected policy operation: ${command.option}`);
    }

    async transaction<T>(
        callback: (executor: DbExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }
}
