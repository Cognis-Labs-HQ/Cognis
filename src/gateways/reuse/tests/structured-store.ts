import type { DbExecutor } from "../../db/reuse/db-executor.js";
import type {
    StructuredDbCommand,
    StructuredDbWhereClause,
} from "../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";

/** Public structured-command fake: existing keys remain fixed and TEXT rows are byte-bounded. */
export function structuredStore() {
    let tables = new Map<string, Record<string, unknown>[]>();
    const schemas = new Map<string, StructuredDbTableDef>();
    let fail = (_command: StructuredDbCommand) => false;
    let transactionQueue = Promise.resolve();
    const matches = (
        row: Record<string, unknown>,
        clauses: StructuredDbWhereClause[] = [],
    ) =>
        clauses.every(({ column, operator = "=", value }) => {
            if (operator === "LIKE")
                return String(row[column]).startsWith(
                    String(value).replace(/%$/, ""),
                );
            if (operator === ">=") return Number(row[column]) >= Number(value);
            if (operator === "IN")
                return (value as unknown[]).includes(row[column]);
            return row[column] === value;
        });
    const db: DbExecutor = {
        ensureTable: async (schema) => {
            if (!schemas.has(schema.name))
                schemas.set(schema.name, structuredClone(schema));
            if (!tables.has(schema.name)) tables.set(schema.name, []);
        },
        transaction: (run) => {
            const operation = transactionQueue.then(async () => {
                const previous = structuredClone(tables);
                try {
                    return await run(db);
                } catch (error) {
                    tables = previous;
                    throw error;
                }
            });
            transactionQueue = operation.then(
                () => {},
                () => {},
            );
            return operation;
        },
        executeCommand: async (command) => {
            if (fail(command)) throw new Error("storage_failed");
            const rows = tables.get(command.table) ?? [];
            if (command.option === "SELECT") {
                const qualify = (row: Record<string, unknown>, alias: string) =>
                    Object.fromEntries(
                        Object.entries(row).map(([key, value]) => [
                            `${alias}.${key}`,
                            value,
                        ]),
                    );
                let selected = command.alias
                    ? rows.map((row) => qualify(row, command.alias!))
                    : command.joins?.length
                      ? rows.map((row) => ({
                            ...row,
                            ...qualify(row, command.table),
                        }))
                      : rows;
                for (const join of command.joins ?? []) {
                    selected = selected.flatMap((row) => {
                        const related = (tables.get(join.table) ?? [])
                            .map((part) =>
                                qualify(part, join.alias ?? join.table),
                            )
                            .filter(
                                (part) =>
                                    row[join.on.leftColumn] ===
                                    part[join.on.rightColumn],
                            );
                        return related.length
                            ? related.map((part) => ({ ...row, ...part }))
                            : join.type === "LEFT"
                              ? [row]
                              : [];
                    });
                }
                const result = structuredClone(
                    selected.filter((row) => matches(row, command.where)),
                );
                for (const order of [...(command.orderBy ?? [])].reverse()) {
                    const column = "column" in order ? order.column : "";
                    result.sort((left, right) =>
                        String(left[column]).localeCompare(
                            String(right[column]),
                            "en",
                            { numeric: true },
                        ),
                    );
                }
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
                            : row,
                    ),
                };
            }
            if (command.option === "DELETE") {
                tables.set(
                    command.table,
                    rows.filter((row) => !matches(row, command.where)),
                );
                return {
                    rowCount: rows.length - tables.get(command.table)!.length,
                };
            }
            if (command.option === "UPDATE") {
                const selected = rows.filter((row) =>
                    matches(row, command.where),
                );
                for (const value of Object.values(command.set))
                    if (
                        typeof value === "string" &&
                        Buffer.byteLength(value, "utf8") > 65_535
                    )
                        throw new Error("text_too_large");
                for (const row of selected)
                    Object.assign(row, structuredClone(command.set));
                return { rowCount: selected.length };
            }
            if (command.option !== "INSERT")
                throw new Error("unsupported_fixture_command");
            for (const value of Object.values(command.values))
                if (
                    typeof value === "string" &&
                    Buffer.byteLength(value, "utf8") > 65_535
                )
                    throw new Error("text_too_large");
            const schema = schemas.get(command.table);
            const keys =
                schema?.primaryKey ??
                schema?.columns
                    .filter((column) => column.primaryKey)
                    .map((column) => column.name) ??
                [];
            const existing = keys.length
                ? rows.find((row) =>
                      keys.every((key) => row[key] === command.values[key]),
                  )
                : undefined;
            if (existing) {
                if (command.conflict?.action === "ignore")
                    return { rowCount: 0 };
                if (command.conflict?.action === "update")
                    Object.assign(existing, command.conflict.update);
                else throw new Error("duplicate_key");
            } else rows.push(structuredClone(command.values));
            tables.set(command.table, rows);
            return { rowCount: 1 };
        },
    };
    return {
        db,
        rows: (name: string) => structuredClone(tables.get(name) ?? []),
        fail: (predicate: typeof fail) => {
            fail = predicate;
        },
    };
}
