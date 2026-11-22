import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
    StructuredDbWhereClause,
} from "../../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../../../../gateways/db/reuse/db-table.js";

type Row = Record<string, unknown>;

function matches(row: Row, clause: StructuredDbWhereClause): boolean {
    const actual = row[clause.column];
    switch (clause.operator ?? "=") {
        case "=":
            return actual === clause.value;
        case "!=":
            return actual !== clause.value;
        case "IS NULL":
            return actual == null;
        case "IS NOT NULL":
            return actual != null;
        case "IN":
            return Array.isArray(clause.value) && clause.value.includes(actual);
        case "LIKE": {
            const pattern = String(clause.value);
            let expression = "";
            for (let i = 0; i < pattern.length; i++) {
                const character = pattern[i];
                if (character === clause.escapeChar && i + 1 < pattern.length) {
                    expression += pattern[++i].replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&",
                    );
                } else if (character === "%") {
                    expression += ".*";
                } else if (character === "_") {
                    expression += ".";
                } else {
                    expression += character.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&",
                    );
                }
            }
            return new RegExp(`^${expression}$`, "i").test(
                String(actual ?? ""),
            );
        }
        default:
            throw new Error(
                `Unsupported profile fixture operator: ${clause.operator}`,
            );
    }
}

function qualified(row: Row, table: string): Row {
    return {
        ...row,
        ...Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
                `${table}.${key}`,
                value,
            ]),
        ),
    };
}

export class ProfileTestExecutor implements DbExecutor {
    private tables = new Map<string, Row[]>();
    private schemas = new Map<string, StructuredDbTableDef>();

    async ensureTable(definition: StructuredDbTableDef): Promise<void> {
        if (!this.tables.has(definition.name))
            this.tables.set(definition.name, []);
        this.schemas.set(definition.name, definition);
    }

    async transaction<Result>(
        callback: (executor: DbExecutor) => Promise<Result>,
    ): Promise<Result> {
        const snapshot = structuredClone(this.tables);
        try {
            return await callback(this);
        } catch (error) {
            this.tables = snapshot;
            throw error;
        }
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const rows = this.tables.get(command.table);
        const schema = this.schemas.get(command.table);
        if (!rows || !schema)
            throw new Error(`Missing profile fixture table: ${command.table}`);
        if (command.option === "INSERT") {
            const keys = [
                ...(schema.primaryKey ? [schema.primaryKey] : []),
                ...(schema.uniqueKeys ?? []),
                ...schema.columns
                    .filter((column) => column.primaryKey || column.unique)
                    .map((column) => [column.name]),
            ];
            const existing = rows.find((row) =>
                keys.some((key) =>
                    key.every(
                        (column) => row[column] === command.values[column],
                    ),
                ),
            );
            if (existing) {
                if (!command.conflict)
                    throw new Error("Duplicate profile fixture row");
                if (command.conflict.action === "update")
                    Object.assign(
                        existing,
                        command.conflict.update ?? command.values,
                    );
                return {
                    rowCount: command.conflict.action === "ignore" ? 0 : 1,
                };
            }
            const defaults = Object.fromEntries(
                schema.columns.map((column) => [
                    column.name,
                    column.default === "now"
                        ? new Date().toISOString()
                        : (column.default ?? null),
                ]),
            );
            rows.push({ ...defaults, ...command.values });
            return { rowCount: 1 };
        }
        if (command.option === "SELECT") {
            let result = rows.map((row) =>
                qualified(row, command.alias ?? command.table),
            );
            for (const join of command.joins ?? []) {
                const joined = this.tables.get(join.table);
                if (!joined)
                    throw new Error(
                        `Missing profile fixture join: ${join.table}`,
                    );
                result = result.flatMap((row) => {
                    const candidates = joined.map((candidate) => ({
                        ...row,
                        ...qualified(candidate, join.alias ?? join.table),
                    }));
                    const matching = candidates.filter(
                        (candidate) =>
                            candidate[join.on.leftColumn] ===
                            candidate[join.on.rightColumn],
                    );
                    return matching.length || join.type !== "LEFT"
                        ? matching
                        : [row];
                });
            }
            result = result.filter((row) =>
                (command.where ?? []).every((clause) => matches(row, clause)),
            );
            if (command.count) return { rows: [{ cnt: result.length }] };
            for (const order of [...(command.orderBy ?? [])].reverse()) {
                result.sort(
                    (first, second) =>
                        String(first[order.column]).localeCompare(
                            String(second[order.column]),
                        ) * (order.direction === "DESC" ? -1 : 1),
                );
            }
            if (command.limit !== undefined)
                result = result.slice(0, command.limit);
            return {
                rows: result.map((row) =>
                    command.columns?.length
                        ? Object.fromEntries(
                              command.columns.map((column) =>
                                  typeof column === "string"
                                      ? [column, row[column]]
                                      : [column.as, row[column.col]],
                              ),
                          )
                        : Object.fromEntries(
                              Object.entries(row).filter(
                                  ([key]) => !key.includes("."),
                              ),
                          ),
                ),
            };
        }
        const matching = rows.filter((row) =>
            (command.where ?? []).every((clause) => matches(row, clause)),
        );
        if (command.option === "UPDATE") {
            for (const row of matching) Object.assign(row, command.set);
        } else {
            this.tables.set(
                command.table,
                rows.filter((row) => !matching.includes(row)),
            );
        }
        return { rowCount: matching.length };
    }
}
