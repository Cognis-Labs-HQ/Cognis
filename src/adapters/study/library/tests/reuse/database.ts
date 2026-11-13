import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
    StructuredDbWhereClause,
} from "../../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../../../../gateways/db/reuse/db-table.js";

type Row = Record<string, unknown>;

function matches(row: Row, clauses: StructuredDbWhereClause[] = []): boolean {
    return clauses.every(({ column, operator = "=", value }) => {
        switch (operator) {
            case "=":
                return row[column] === value;
            case "!=":
                return row[column] !== value;
            case "IN":
                return Array.isArray(value) && value.includes(row[column]);
            case "IS NULL":
                return row[column] == null;
            case "IS NOT NULL":
                return row[column] != null;
            default:
                throw new Error(`unsupported_fixture_operator:${operator}`);
        }
    });
}

export class MemoryDatabase implements DbExecutor {
    private tables = new Map<string, Row[]>();
    private schemas = new Map<string, StructuredDbTableDef>();

    async ensureTable(definition: StructuredDbTableDef): Promise<void> {
        this.schemas.set(definition.name, definition);
        if (!this.tables.has(definition.name))
            this.tables.set(definition.name, []);
    }

    async transaction<T>(
        operation: (database: DbExecutor) => Promise<T>,
    ): Promise<T> {
        const before = structuredClone(this.tables);
        try {
            return await operation(this);
        } catch (error) {
            this.tables = before;
            throw error;
        }
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const rows = this.tables.get(command.table);
        const schema = this.schemas.get(command.table);
        if (!rows || !schema)
            throw new Error(`unknown_fixture_table:${command.table}`);
        if (command.option === "INSERT") {
            const keys =
                command.conflict?.target ??
                schema.primaryKey ??
                schema.columns
                    .filter((column) => column.primaryKey)
                    .map((column) => column.name);
            const existing = keys.length
                ? rows.find((row) =>
                      keys.every((key) => row[key] === command.values[key]),
                  )
                : undefined;
            if (existing) {
                if (!command.conflict)
                    throw new Error("fixture_unique_constraint");
                if (command.conflict.action === "ignore")
                    return { rowCount: 0 };
                Object.assign(
                    existing,
                    structuredClone(command.conflict.update ?? command.values),
                );
            } else {
                const defaults = Object.fromEntries(
                    schema.columns
                        .filter((column) => column.default !== undefined)
                        .map((column) => [
                            column.name,
                            column.default === "true"
                                ? true
                                : column.default === "false"
                                  ? false
                                  : column.default === "now"
                                    ? new Date(0).toISOString()
                                    : column.default,
                        ]),
                );
                rows.push({ ...defaults, ...structuredClone(command.values) });
            }
            return { rowCount: 1 };
        }
        let selected = rows.filter((row) => matches(row, command.where));
        if (command.option === "UPDATE") {
            selected.forEach((row) =>
                Object.assign(row, structuredClone(command.set)),
            );
            return { rowCount: selected.length };
        }
        if (command.option === "DELETE") {
            this.tables.set(
                command.table,
                rows.filter((row) => !selected.includes(row)),
            );
            return { rowCount: selected.length };
        }
        if (command.alias) throw new Error("unsupported_fixture_alias");
        for (const join of command.joins ?? []) {
            const joinedRows = this.tables.get(join.table);
            if (!joinedRows)
                throw new Error(`unknown_fixture_table:${join.table}`);
            const qualify = (row: Row, name: string): Row =>
                Object.fromEntries(
                    Object.entries(row).map(([column, value]) => [
                        `${name}.${column}`,
                        value,
                    ]),
                );
            selected = selected.flatMap((row) => {
                const left = { ...row, ...qualify(row, command.table) };
                const joined = joinedRows
                    .map((right) => ({
                        ...left,
                        ...qualify(right, join.alias ?? join.table),
                    }))
                    .filter(
                        (combined) =>
                            combined[join.on.leftColumn] ===
                            combined[join.on.rightColumn],
                    );
                return joined.length
                    ? joined
                    : join.type === "LEFT"
                      ? [left]
                      : [];
            });
        }
        for (const order of [...(command.orderBy ?? [])].reverse()) {
            selected = selected.toSorted(
                (left, right) =>
                    String(left[order.column]).localeCompare(
                        String(right[order.column]),
                    ) * (order.direction === "DESC" ? -1 : 1),
            );
        }
        if (command.count) return { rows: [{ cnt: selected.length }] };
        if (command.limit !== undefined)
            selected = selected.slice(0, command.limit);
        const columns = command.columns;
        return {
            rows: structuredClone(
                selected.map((row) =>
                    !columns || columns.includes("*")
                        ? row
                        : Object.fromEntries(
                              columns.map((column) =>
                                  typeof column === "string"
                                      ? [column, row[column]]
                                      : [column.as, row[column.col]],
                              ),
                          ),
                ),
            ),
        };
    }
}
