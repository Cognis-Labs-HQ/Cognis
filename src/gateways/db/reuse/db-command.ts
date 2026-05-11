export type StructuredDbDialect = "postgresql" | "mariadb" | "sqlite";

export type StructuredDbOption = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

export type StructuredDbOperator =
    | "="
    | "!="
    | "<"
    | ">"
    | "<="
    | ">="
    | "LIKE"
    | "IN"
    | "IS NULL"
    | "IS NOT NULL";

export interface StructuredDbWhereClause {
    column: string;
    operator?: StructuredDbOperator;
    value?: unknown;
}

export interface StructuredDbJoinClause {
    type?: "INNER" | "LEFT";
    table: string;
    alias?: string;
    on: {
        leftColumn: string;
        rightColumn: string;
    };
}

export interface StructuredDbOrderByClause {
    column: string;
    direction?: "ASC" | "DESC";
}

export interface StructuredDbConflictClause {
    action: "ignore" | "update";
    target?: string[];
    update?: Record<string, unknown>;
}

export interface StructuredDbSelectCommand {
    option: "SELECT";
    table: string;
    alias?: string;
    columns?: string[];
    joins?: StructuredDbJoinClause[];
    where?: StructuredDbWhereClause[];
    orderBy?: StructuredDbOrderByClause[];
    limit?: number;
}

export interface StructuredDbInsertCommand {
    option: "INSERT";
    table: string;
    values: Record<string, unknown>;
    conflict?: StructuredDbConflictClause;
}

export interface StructuredDbUpdateCommand {
    option: "UPDATE";
    table: string;
    set: Record<string, unknown>;
    where?: StructuredDbWhereClause[];
}

export interface StructuredDbDeleteCommand {
    option: "DELETE";
    table: string;
    where?: StructuredDbWhereClause[];
}

export type StructuredDbCommand =
    | StructuredDbSelectCommand
    | StructuredDbInsertCommand
    | StructuredDbUpdateCommand
    | StructuredDbDeleteCommand;

export interface StructuredDbCommandStatement {
    sql: string;
    params: unknown[];
    returnsRows: boolean;
}

export interface StructuredDbCommandResult<Row = Record<string, unknown>> {
    rows?: Row[];
    rowCount?: number;
}

function assertIdentifier(identifier: string, label: string): string {
    const segments = identifier.split(".");
    if (
        segments.length === 0 ||
        segments.some((segment) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment))
    ) {
        throw new Error(`Invalid ${label}: ${identifier}`);
    }
    return identifier;
}

function assertColumnList(columns: string[], label: string): string[] {
    return columns.map((column) => assertIdentifier(column, label));
}

function createPlaceholderFactory(
    dialect: StructuredDbDialect,
): (params: unknown[], value: unknown) => string {
    let index = 1;
    return (params: unknown[], value: unknown): string => {
        params.push(value);
        if (dialect === "postgresql") {
            return `$${index++}`;
        }
        return "?";
    };
}

function buildWhereClause(
    clauses: StructuredDbWhereClause[] | undefined,
    params: unknown[],
    placeholder: (params: unknown[], value: unknown) => string,
): string {
    if (!clauses || clauses.length === 0) {
        return "";
    }

    const sqlClauses = clauses.map((clause) => {
        const column = assertIdentifier(clause.column, "where column");
        const operator = clause.operator ?? "=";

        if (operator === "IS NULL" || operator === "IS NOT NULL") {
            return `${column} ${operator}`;
        }

        if (operator === "IN") {
            if (!Array.isArray(clause.value) || clause.value.length === 0) {
                throw new Error("Structured DB IN clauses require a non-empty array.");
            }
            const placeholders = clause.value.map((value) =>
                placeholder(params, value),
            );
            return `${column} IN (${placeholders.join(", ")})`;
        }

        return `${column} ${operator} ${placeholder(params, clause.value)}`;
    });

    return ` WHERE ${sqlClauses.join(" AND ")}`;
}

function buildSelectStatement(
    command: StructuredDbSelectCommand,
    params: unknown[],
    placeholder: (params: unknown[], value: unknown) => string,
): StructuredDbCommandStatement {
    const columns =
        command.columns && command.columns.length > 0
            ? command.columns.map((column) =>
                  column === "*"
                      ? "*"
                      : assertIdentifier(column, "select column"),
              )
            : ["*"];
    const table = assertIdentifier(command.table, "table");
    const alias = command.alias
        ? ` ${assertIdentifier(command.alias, "table alias")}`
        : "";

    const joins = (command.joins ?? [])
        .map((join) => {
            const joinType = join.type ?? "INNER";
            const joinTable = assertIdentifier(join.table, "join table");
            const joinAlias = join.alias
                ? ` ${assertIdentifier(join.alias, "join alias")}`
                : "";
            const leftColumn = assertIdentifier(
                join.on.leftColumn,
                "join column",
            );
            const rightColumn = assertIdentifier(
                join.on.rightColumn,
                "join column",
            );
            return ` ${joinType} JOIN ${joinTable}${joinAlias} ON ${leftColumn} = ${rightColumn}`;
        })
        .join("");

    const whereClause = buildWhereClause(command.where, params, placeholder);
    const orderByClause =
        command.orderBy && command.orderBy.length > 0
            ? ` ORDER BY ${command.orderBy
                  .map((entry) => {
                      const column = assertIdentifier(
                          entry.column,
                          "order by column",
                      );
                      const direction = entry.direction ?? "ASC";
                      return `${column} ${direction}`;
                  })
                  .join(", ")}`
            : "";

    let limitClause = "";
    if (command.limit !== undefined) {
        if (!Number.isInteger(command.limit) || command.limit < 0) {
            throw new Error("Structured DB SELECT limit must be a non-negative integer.");
        }
        limitClause = ` LIMIT ${command.limit}`;
    }

    return {
        sql:
            `SELECT ${columns.join(", ")} FROM ${table}${alias}` +
            joins +
            whereClause +
            orderByClause +
            limitClause,
        params,
        returnsRows: true,
    };
}

function buildInsertStatement(
    command: StructuredDbInsertCommand,
    dialect: StructuredDbDialect,
    params: unknown[],
    placeholder: (params: unknown[], value: unknown) => string,
): StructuredDbCommandStatement {
    const table = assertIdentifier(command.table, "table");
    const entries = Object.entries(command.values);
    if (entries.length === 0) {
        throw new Error("Structured DB INSERT requires at least one value.");
    }

    const columns = entries.map(([column]) =>
        assertIdentifier(column, "insert column"),
    );
    const values = entries.map(([, value]) => value);
    const insertPlaceholders = values.map((value) => placeholder(params, value));

    let prefix = "INSERT INTO";
    if (command.conflict?.action === "ignore") {
        if (dialect === "mariadb") {
            prefix = "INSERT IGNORE INTO";
        } else if (dialect === "sqlite") {
            prefix = "INSERT OR IGNORE INTO";
        }
    }

    let sql = `${prefix} ${table} (${columns.join(", ")}) VALUES (${insertPlaceholders.join(", ")})`;
    const conflict = command.conflict;

    if (!conflict) {
        return { sql, params, returnsRows: false };
    }

    if (conflict.action === "ignore") {
        if (dialect === "postgresql") {
            const target =
                conflict.target && conflict.target.length > 0
                    ? ` (${assertColumnList(conflict.target, "conflict column").join(", ")})`
                    : "";
            sql += ` ON CONFLICT${target} DO NOTHING`;
        } else if (dialect === "sqlite") {
            const target =
                conflict.target && conflict.target.length > 0
                    ? ` ON CONFLICT (${assertColumnList(conflict.target, "conflict column").join(", ")}) DO NOTHING`
                    : "";
            sql += target;
        }
        return { sql, params, returnsRows: false };
    }

    if (!conflict.target || conflict.target.length === 0) {
        throw new Error(
            "Structured DB upserts require conflict target columns.",
        );
    }

    const conflictTarget = assertColumnList(
        conflict.target,
        "conflict column",
    );
    const updateEntries = Object.entries(
        conflict.update ??
            Object.fromEntries(
                entries.filter(([column]) => !conflictTarget.includes(column)),
            ),
    );

    if (updateEntries.length === 0) {
        throw new Error(
            "Structured DB upserts require at least one update column.",
        );
    }

    if (dialect === "mariadb") {
        const assignments = updateEntries.map(([column, value]) => {
            const validatedColumn = assertIdentifier(
                column,
                "upsert update column",
            );
            if (conflict.update) {
                return `${validatedColumn} = ${placeholder(params, value)}`;
            }
            return `${validatedColumn} = VALUES(${validatedColumn})`;
        });
        sql += ` ON DUPLICATE KEY UPDATE ${assignments.join(", ")}`;
        return { sql, params, returnsRows: false };
    }

    const assignments = updateEntries.map(([column, value]) => {
        const validatedColumn = assertIdentifier(column, "upsert update column");
        if (conflict.update) {
            return `${validatedColumn} = ${placeholder(params, value)}`;
        }
        return `${validatedColumn} = EXCLUDED.${validatedColumn}`;
    });
    sql += ` ON CONFLICT (${conflictTarget.join(", ")}) DO UPDATE SET ${assignments.join(", ")}`;

    return { sql, params, returnsRows: false };
}

function buildUpdateStatement(
    command: StructuredDbUpdateCommand,
    params: unknown[],
    placeholder: (params: unknown[], value: unknown) => string,
): StructuredDbCommandStatement {
    const table = assertIdentifier(command.table, "table");
    const entries = Object.entries(command.set);
    if (entries.length === 0) {
        throw new Error("Structured DB UPDATE requires at least one value.");
    }

    const setClause = entries
        .map(([column, value]) => {
            const validatedColumn = assertIdentifier(column, "update column");
            return `${validatedColumn} = ${placeholder(params, value)}`;
        })
        .join(", ");

    const whereClause = buildWhereClause(command.where, params, placeholder);

    return {
        sql: `UPDATE ${table} SET ${setClause}${whereClause}`,
        params,
        returnsRows: false,
    };
}

function buildDeleteStatement(
    command: StructuredDbDeleteCommand,
    params: unknown[],
    placeholder: (params: unknown[], value: unknown) => string,
): StructuredDbCommandStatement {
    const table = assertIdentifier(command.table, "table");
    const whereClause = buildWhereClause(command.where, params, placeholder);

    return {
        sql: `DELETE FROM ${table}${whereClause}`,
        params,
        returnsRows: false,
    };
}

export function buildStructuredDbCommandStatement(
    command: StructuredDbCommand,
    dialect: StructuredDbDialect,
): StructuredDbCommandStatement {
    const params: unknown[] = [];
    const placeholder = createPlaceholderFactory(dialect);

    if (command.option === "SELECT") {
        return buildSelectStatement(command, params, placeholder);
    }
    if (command.option === "INSERT") {
        return buildInsertStatement(command, dialect, params, placeholder);
    }
    if (command.option === "UPDATE") {
        return buildUpdateStatement(command, params, placeholder);
    }
    return buildDeleteStatement(command, params, placeholder);
}
