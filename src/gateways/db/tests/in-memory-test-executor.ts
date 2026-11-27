/**
 * Minimal in-memory DbExecutor for unit/integration tests.
 *
 * Stores rows in a Map keyed by table name. Tracks PRIMARY KEY columns and
 * DEFAULT values from CREATE TABLE statements and ensureTable() calls so that
 * INSERT operations behave correctly with conflict detection and
 * missing-column defaults.
 */
import type { DbExecutor } from "../reuse/db-executor.js";
import type { StructuredDbTableDef } from "../reuse/db-table.js";
import {
    buildStructuredDbCommandStatement as buildStructuredDatabaseCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
    type StructuredDbDialect,
} from "../reuse/db-command.js";

type Row = Record<string, unknown>;

interface TableSchema {
    pkCols: string[];
    defaults: Map<string, unknown>;
    uniqueCols: string[][];
}

export class InMemoryTestExecutor implements DbExecutor {
    private tables = new Map<string, Row[]>();
    private schemas = new Map<string, TableSchema>();

    private readonly structuredDatabaseDialect: StructuredDbDialect = {
        createPlaceholder(parameterIndex) {
            return `$${parameterIndex}`;
        },
        buildInsertPrefix() {
            return "INSERT INTO";
        },
        buildInsertConflictClause({
            conflict,
            conflictTarget,
            updateEntries,
            addParameter,
            hasExplicitUpdate,
        }) {
            if (conflict.action === "ignore") {
                const target =
                    conflictTarget.length > 0
                        ? ` (${conflictTarget.join(", ")})`
                        : "";
                return ` ON CONFLICT${target} DO NOTHING`;
            }
            const assignments = updateEntries.map(([column, value]) =>
                hasExplicitUpdate
                    ? `${column} = ${addParameter(value)}`
                    : `${column} = EXCLUDED.${column}`,
            );
            return ` ON CONFLICT (${conflictTarget.join(", ")}) DO UPDATE SET ${assignments.join(", ")}`;
        },
    };

    private getTable(name: string): Row[] {
        if (!this.tables.has(name)) this.tables.set(name, []);
        return this.tables.get(name)!;
    }

    async execute(
        sql: string,
        parameters: unknown[] = [],
    ): Promise<{ rows?: Row[]; rowCount?: number }> {
        let parameterIndex = 1;
        const normalizedSql = sql.replace(/\?/g, () => `$${parameterIndex++}`);
        const trimmed = normalizedSql.trim();
        const upper = trimmed.toUpperCase();

        if (upper.startsWith("CREATE ")) {
            this.parseCreateTable(trimmed);
            return { rowCount: 0 };
        }
        if (
            upper.startsWith("ALTER ") ||
            upper === "BEGIN" ||
            upper === "COMMIT" ||
            upper === "ROLLBACK"
        ) {
            return { rowCount: 0 };
        }
        if (upper.startsWith("INSERT"))
            return this.handleInsert(trimmed, parameters);
        if (upper.startsWith("SELECT"))
            return this.handleSelect(trimmed, parameters);
        if (upper.startsWith("UPDATE"))
            return this.handleUpdate(trimmed, parameters);
        if (upper.startsWith("DELETE"))
            return this.handleDelete(trimmed, parameters);
        return { rowCount: 0 };
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDatabaseCommandStatement(
            command,
            this.structuredDatabaseDialect,
        );
        return this.execute(statement.sql, statement.params);
    }

    async transaction<T>(
        callback: (executor: DbExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }

    async ensureTable(definition: StructuredDbTableDef): Promise<void> {
        if (this.schemas.has(definition.name)) return;
        const primaryKeyColumns: string[] = definition.primaryKey ?? [];
        const defaults = new Map<string, unknown>();
        const uniqueColumns: string[][] = [...(definition.uniqueKeys ?? [])];

        for (const column of definition.columns) {
            if (primaryKeyColumns.length === 0 && column.primaryKey)
                primaryKeyColumns.push(column.name);
            if (column.unique) uniqueColumns.push([column.name]);
            if (column.default !== undefined) {
                defaults.set(
                    column.name,
                    this.parseTableDefault(column.default),
                );
            }
        }

        this.schemas.set(definition.name, {
            pkCols: primaryKeyColumns,
            defaults,
            uniqueCols: uniqueColumns,
        });
        if (!this.tables.has(definition.name))
            this.tables.set(definition.name, []);
    }

    private parseTableDefault(
        value: StructuredDbTableDef["columns"][number]["default"],
    ): unknown {
        if (value === "now") return "__NOW__";
        if (value === "true") return true;
        if (value === "false") return false;
        if (value === null) return null;
        return value;
    }

    private parseCreateTable(sql: string): void {
        const match = sql.match(
            /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)/i,
        );
        if (!match) return;
        const table = match[1];
        const body = match[2];

        const primaryKeyColumns: string[] = [];
        const defaults = new Map<string, unknown>();
        const uniqueColumns: string[][] = [];

        const lines = body.split(",").map((line) => line.trim());
        const reassembled: string[] = [];
        let buffer = "";
        let depth = 0;
        for (const line of lines) {
            buffer += (buffer ? ", " : "") + line;
            depth +=
                (line.match(/\(/g) || []).length -
                (line.match(/\)/g) || []).length;
            if (depth <= 0) {
                reassembled.push(buffer);
                buffer = "";
                depth = 0;
            }
        }
        if (buffer) reassembled.push(buffer);

        for (const line of reassembled) {
            const trimLine = line.trim();
            const primaryKeyConstraint = trimLine.match(
                /^PRIMARY\s+KEY\s*\(([^)]+)\)/i,
            );
            if (primaryKeyConstraint) {
                primaryKeyColumns.push(
                    ...primaryKeyConstraint[1]
                        .split(",")
                        .map((column) => column.trim()),
                );
                continue;
            }
            const uniqueConstraint = trimLine.match(/^UNIQUE\s*\(([^)]+)\)/i);
            if (uniqueConstraint) {
                uniqueColumns.push(
                    uniqueConstraint[1]
                        .split(",")
                        .map((column) => column.trim()),
                );
                continue;
            }
            if (/^(?:FOREIGN\s+KEY|CHECK|CONSTRAINT)/i.test(trimLine)) continue;

            const columnMatch = trimLine.match(/^(\w+)\s+/);
            if (!columnMatch) continue;
            const column = columnMatch[1];

            if (/\bPRIMARY\s+KEY\b/i.test(trimLine)) {
                primaryKeyColumns.push(column);
            }
            if (/\bUNIQUE\b/i.test(trimLine)) {
                uniqueColumns.push([column]);
            }

            const definitionMatch = trimLine.match(
                /DEFAULT\s+(.+?)(?:\s*,|\s*$)/i,
            );
            if (definitionMatch) {
                const raw = definitionMatch[1].replace(/[,)]*$/, "").trim();
                defaults.set(column, this.parseDefault(raw));
            }
        }

        this.schemas.set(table, {
            pkCols: primaryKeyColumns,
            defaults,
            uniqueCols: uniqueColumns,
        });
    }

    private parseDefault(raw: string): unknown {
        const upper = raw.toUpperCase();
        if (upper === "TRUE" || upper === "1") return true;
        if (upper === "FALSE" || upper === "0") return false;
        if (upper === "NULL") return null;
        if (upper === "NOW()" || upper === "CURRENT_TIMESTAMP")
            return "__NOW__";
        if (/^\d+$/.test(raw)) return Number(raw);
        const stringMatch = raw.match(/^'(.*)'$/);
        if (stringMatch) return stringMatch[1];
        return raw;
    }

    private applyDefaults(table: string, row: Row): void {
        const schema = this.schemas.get(table);
        if (!schema) return;
        for (const [column, definition] of schema.defaults) {
            if (!(column in row) || row[column] === undefined) {
                row[column] =
                    definition === "__NOW__"
                        ? new Date().toISOString()
                        : definition;
            }
        }
    }

    private getPrimaryKeyColumns(
        table: string,
        insertedColumns: string[],
    ): string[] {
        const schema = this.schemas.get(table);
        if (schema && schema.pkCols.length > 0) return schema.pkCols;
        return [insertedColumns[0]];
    }

    private findExisting(
        rows: Row[],
        row: Row,
        primaryKeyColumns: string[],
    ): number {
        return rows.findIndex((existingRow) =>
            primaryKeyColumns.every(
                (column) => existingRow[column] === row[column],
            ),
        );
    }

    private checkUniqueViolation(
        rows: Row[],
        row: Row,
        table: string,
        excludeIndex: number,
    ): boolean {
        const schema = this.schemas.get(table);
        if (!schema || schema.uniqueCols.length === 0) return false;
        for (let i = 0; i < rows.length; i++) {
            if (i === excludeIndex) continue;
            for (const uniqueKey of schema.uniqueCols) {
                if (
                    uniqueKey.every(
                        (column) =>
                            rows[i][column] !== undefined &&
                            rows[i][column] === row[column],
                    )
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    private handleInsert(
        sql: string,
        parameters: unknown[],
    ): { rows?: Row[]; rowCount: number } {
        const tableMatch = sql.match(
            /INSERT\s+(?:OR\s+IGNORE\s+)?(?:IGNORE\s+)?INTO\s+(\w+)/i,
        );
        if (!tableMatch) return { rowCount: 0 };
        const table = tableMatch[1];

        const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
        if (!columnsMatch) return { rowCount: 0 };
        const columns = columnsMatch[1]
            .split(",")
            .map((column) => column.trim());

        const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
        const valuePlaceholders = valuesMatch
            ? valuesMatch[1].split(",").map((value) => value.trim())
            : [];

        const row: Row = {};
        let parameterIndex = 0;
        for (let i = 0; i < columns.length; i++) {
            const valuePlaceholder = valuePlaceholders[i] ?? "";
            const phMatch = valuePlaceholder.match(/^\$(\d+)$/);
            if (phMatch) {
                row[columns[i]] = parameters[Number(phMatch[1]) - 1];
            } else if (
                /^(NOW\(\)|CURRENT_TIMESTAMP)$/i.test(valuePlaceholder)
            ) {
                row[columns[i]] = new Date().toISOString();
            } else if (/^TRUE$/i.test(valuePlaceholder)) {
                row[columns[i]] = true;
            } else if (/^FALSE$/i.test(valuePlaceholder)) {
                row[columns[i]] = false;
            } else if (/^\?$/.test(valuePlaceholder)) {
                row[columns[i]] = parameters[parameterIndex++];
            } else if (/^\d+$/.test(valuePlaceholder)) {
                row[columns[i]] = Number(valuePlaceholder);
            } else {
                row[columns[i]] = parameters[i] ?? null;
            }
        }

        this.applyDefaults(table, row);

        const isIgnore =
            /INSERT\s+OR\s+IGNORE/i.test(sql) ||
            /INSERT\s+IGNORE/i.test(sql) ||
            /ON\s+CONFLICT.*DO\s+NOTHING/i.test(sql);
        const onConflictUpdate =
            /ON\s+CONFLICT.*DO\s+UPDATE/i.test(sql) ||
            /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(sql);

        const rows = this.getTable(table);
        const primaryKeyColumns = this.getPrimaryKeyColumns(table, columns);
        const existingIndex = this.findExisting(rows, row, primaryKeyColumns);

        if (existingIndex >= 0) {
            if (onConflictUpdate) {
                const existing = rows[existingIndex];
                const updateMatch = sql.match(
                    /(?:DO\s+UPDATE\s+SET|DUPLICATE\s+KEY\s+UPDATE)\s+(.+)$/i,
                );
                if (updateMatch) {
                    const updates = updateMatch[1]
                        .split(",")
                        .map((statement) => statement.trim());
                    for (const update of updates) {
                        const exclMatch = update.match(
                            /(\w+)\s*=\s*(?:EXCLUDED|excluded|VALUES\((\w+)\))\.?(\w*)/,
                        );
                        if (exclMatch) {
                            const targetColumn = exclMatch[1];
                            const sourceColumn =
                                exclMatch[3] || exclMatch[2] || targetColumn;
                            existing[targetColumn] =
                                row[sourceColumn] ?? row[targetColumn];
                        }
                        const valueParameterMatch =
                            update.match(/(\w+)\s*=\s*\$(\d+)/);
                        if (valueParameterMatch) {
                            const column = valueParameterMatch[1];
                            const currentParameterIndex =
                                Number(valueParameterMatch[2]) - 1;
                            existing[column] =
                                parameters[currentParameterIndex];
                        }
                    }
                } else {
                    for (const column of columns.slice(
                        primaryKeyColumns.length,
                    )) {
                        existing[column] = row[column];
                    }
                }
                return { rowCount: 1 };
            }
            if (isIgnore) return { rowCount: 0 };
        }

        if (existingIndex < 0) {
            if (!isIgnore && this.checkUniqueViolation(rows, row, table, -1)) {
                throw new Error(`UNIQUE constraint failed on table ${table}`);
            }
            rows.push(row);
        }
        return { rowCount: 1 };
    }

    private parseSelectColumns(
        sql: string,
    ): Array<{ key: string; alias: string | null }> {
        const selectMatch = sql.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+/i);
        if (!selectMatch) return [];
        const rawColumns = selectMatch[1].trim();
        if (rawColumns === "*") return [];

        return rawColumns.split(",").map((part) => {
            const trimmed = part.trim();
            const asMatch = trimmed.match(/^(?:\w+\.)?(\w+)\s+AS\s+(\w+)$/i);
            if (asMatch) {
                return { key: asMatch[1], alias: asMatch[2] };
            }
            const dotMatch = trimmed.match(/^(?:\w+\.)?(\w+)$/);
            if (dotMatch) {
                return { key: dotMatch[1], alias: null };
            }
            return { key: trimmed, alias: null };
        });
    }

    private handleSelect(
        sql: string,
        parameters: unknown[],
    ): { rows: Row[]; rowCount: number } {
        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        if (!fromMatch) return { rows: [], rowCount: 0 };
        const mainTable = fromMatch[1];

        const isCount = /SELECT\s+COUNT\s*\(\s*\*\s*\)\s+AS\s+cnt/i.test(sql);

        const joinMatches = [
            ...sql.matchAll(
                /(?:LEFT\s+)?(?:INNER\s+)?JOIN\s+(\w+)(?:\s+(?!ON\b)(\w+))?\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi,
            ),
        ];

        const whereMatch = sql.match(
            /WHERE\s+([\s\S]+?)(?:\s+ORDER|\s+LIMIT|\s*$)/i,
        );
        let rows = [...this.getTable(mainTable)];

        const aliasMatch = sql.match(
            new RegExp(`FROM\\s+${mainTable}\\s+(\\w+)(?:\\s|$)`, "i"),
        );
        const mainAlias = aliasMatch?.[1] ?? mainTable;
        const aliasMap = new Map<string, string>();
        aliasMap.set(mainAlias, mainTable);
        aliasMap.set(mainTable, mainTable);

        for (const joinMatch of joinMatches) {
            const joinTable = joinMatch[1];
            const joinAlias = joinMatch[2] ?? joinTable;
            aliasMap.set(joinAlias, joinTable);

            const leftAlias = joinMatch[3];
            const leftColumn = joinMatch[4];
            const rightAlias = joinMatch[5];
            const rightColumn = joinMatch[6];

            const joinRows = this.getTable(joinTable);
            const isLeft = /LEFT\s+JOIN/i.test(joinMatch[0]);

            const leftIsMain =
                leftAlias === mainAlias ||
                leftAlias === mainTable ||
                !aliasMap.has(leftAlias) ||
                aliasMap.get(leftAlias) !== joinTable;
            const joinIsRight = rightAlias === joinAlias;

            let mainColumn: string;
            let joinedColumn: string;

            if (joinIsRight) {
                mainColumn = leftColumn;
                joinedColumn = rightColumn;
            } else if (leftIsMain) {
                mainColumn = leftColumn;
                joinedColumn = rightColumn;
            } else {
                mainColumn = rightColumn;
                joinedColumn = leftColumn;
            }

            rows = rows.flatMap((mainRow) => {
                const mainValue =
                    mainRow[mainColumn] ??
                    mainRow[`${leftAlias}.${leftColumn}`];
                const matches = joinRows.filter((joinedRow) => {
                    const joinedValue = joinedRow[joinedColumn];
                    return joinedValue === mainValue;
                });
                if (matches.length === 0 && isLeft) {
                    return [mainRow];
                }
                if (matches.length === 0) return [];
                return matches.map((joinedRow) => {
                    const merged: Row = { ...mainRow };
                    for (const [key, value] of Object.entries(joinedRow)) {
                        if (!(key in merged)) merged[key] = value;
                    }
                    return merged;
                });
            });
        }

        if (whereMatch) {
            rows = this.applyWhere(rows, whereMatch[1].trim(), parameters);
        }

        const limitMatch = sql.match(/LIMIT\s+\$(\d+)/i);
        const literalLimitMatch = sql.match(/LIMIT\s+(\d+)(?!\s*\$)/i);
        if (limitMatch) {
            const limitValue = Number(parameters[Number(limitMatch[1]) - 1]);
            rows = rows.slice(0, limitValue);
        } else if (literalLimitMatch) {
            rows = rows.slice(0, Number(literalLimitMatch[1]));
        }

        if (isCount) {
            return { rows: [{ cnt: rows.length }], rowCount: 1 };
        }

        const columnProjection = this.parseSelectColumns(sql);
        if (columnProjection.length > 0) {
            rows = rows.map((row) => {
                const projected: Row = {};
                for (const { key, alias } of columnProjection) {
                    const outputKey = alias ?? key;
                    projected[outputKey] = row[key] ?? null;
                }
                return projected;
            });
        }

        return { rows, rowCount: rows.length };
    }

    private applyWhere(
        rows: Row[],
        whereText: string,
        parameters: unknown[],
    ): Row[] {
        const conditions = whereText.split(/\s+AND\s+/i);
        let result = rows;
        for (const condition of conditions) {
            const equalMatch = condition.match(
                /(?:(\w+)\.)?(\w+)\s*=\s*\$(\d+)/,
            );
            if (equalMatch) {
                const column = equalMatch[2];
                const parameterIndex = Number(equalMatch[3]) - 1;
                const value = parameters[parameterIndex];
                result = result.filter((row) => row[column] === value);
                continue;
            }
            const neqMatch = condition.match(
                /(?:(\w+)\.)?(\w+)\s*!=\s*\$(\d+)/,
            );
            if (neqMatch) {
                const column = neqMatch[2];
                const parameterIndex = Number(neqMatch[3]) - 1;
                const value = parameters[parameterIndex];
                result = result.filter((row) => row[column] !== value);
                continue;
            }
            const greaterThanMatch = condition.match(
                /(?:(\w+)\.)?(\w+)\s*>\s*\$(\d+)/,
            );
            if (greaterThanMatch) {
                const column = greaterThanMatch[2];
                const parameterIndex = Number(greaterThanMatch[3]) - 1;
                const value = parameters[parameterIndex];
                result = result.filter(
                    (row) => String(row[column] ?? "") > String(value ?? ""),
                );
                continue;
            }
            const lessThanMatch = condition.match(
                /(?:(\w+)\.)?(\w+)\s*<\s*\$(\d+)/,
            );
            if (lessThanMatch) {
                const column = lessThanMatch[2];
                const parameterIndex = Number(lessThanMatch[3]) - 1;
                const value = parameters[parameterIndex];
                result = result.filter(
                    (row) => String(row[column] ?? "") < String(value ?? ""),
                );
                continue;
            }
            const likeMatch = condition.match(
                /(?:(\w+)\.)?(\w+)\s+LIKE\s+\$(\d+)/i,
            );
            if (likeMatch) {
                const column = likeMatch[2];
                const parameterIndex = Number(likeMatch[3]) - 1;
                const pattern = String(parameters[parameterIndex] ?? "");
                const regularExpressionPattern = pattern
                    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                    .replace(/%/g, ".*")
                    .replace(/_/g, ".");
                const matchingExpression = new RegExp(
                    `^${regularExpressionPattern}$`,
                    "i",
                );
                result = result.filter((row) =>
                    matchingExpression.test(String(row[column] ?? "")),
                );
                continue;
            }
            const isNullMatch = condition.match(
                /(?:(\w+)\.)?(\w+)\s+IS\s+NULL/i,
            );
            if (isNullMatch) {
                const column = isNullMatch[2];
                result = result.filter((row) => row[column] == null);
                continue;
            }
            const isNotNullMatch = condition.match(
                /(?:(\w+)\.)?(\w+)\s+IS\s+NOT\s+NULL/i,
            );
            if (isNotNullMatch) {
                const column = isNotNullMatch[2];
                result = result.filter((row) => row[column] != null);
                continue;
            }
        }
        return result;
    }

    private handleUpdate(
        sql: string,
        parameters: unknown[],
    ): { rowCount: number } {
        const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
        if (!tableMatch) return { rowCount: 0 };
        const table = tableMatch[1];
        const rows = this.getTable(table);

        const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/is);
        const rawSetClauses = setMatch ? setMatch[1] : null;
        let targets = [...rows];

        const whereMatch = sql.match(/WHERE\s+([\s\S]+?)$/is);
        if (whereMatch) {
            targets = this.applyWhere(rows, whereMatch[1].trim(), parameters);
        }

        if (!rawSetClauses) return { rowCount: 0 };

        const setClauses: string[] = [];
        let buffer = "";
        let depth = 0;
        for (const setClause of rawSetClauses) {
            if (setClause === "(") depth++;
            if (setClause === ")") depth--;
            if (setClause === "," && depth === 0) {
                setClauses.push(buffer.trim());
                buffer = "";
            } else {
                buffer += setClause;
            }
        }
        if (buffer.trim()) setClauses.push(buffer.trim());

        const targetSet = new Set(targets);
        let count = 0;
        for (const row of rows) {
            if (!targetSet.has(row)) continue;
            for (const clause of setClauses) {
                const parameterMatch = clause.match(/(\w+)\s*=\s*\$(\d+)/);
                if (parameterMatch) {
                    row[parameterMatch[1]] =
                        parameters[Number(parameterMatch[2]) - 1];
                    continue;
                }
                const expressionMatch = clause.match(
                    /(\w+)\s*=\s*(NOW\(\)|CURRENT_TIMESTAMP|TRUE|FALSE)/i,
                );
                if (expressionMatch) {
                    const expression = expressionMatch[2].toUpperCase();
                    if (
                        expression === "NOW()" ||
                        expression === "CURRENT_TIMESTAMP"
                    )
                        row[expressionMatch[1]] = new Date().toISOString();
                    else if (expression === "TRUE")
                        row[expressionMatch[1]] = true;
                    else if (expression === "FALSE")
                        row[expressionMatch[1]] = false;
                }
            }
            count++;
        }
        return { rowCount: count };
    }

    private filterByWhere(
        rows: Row[],
        whereText: string,
        parameters: unknown[],
    ): Row[] {
        const subqueryMatch = whereText.match(
            /(\w+)\s*=\s*\(\s*SELECT\s+(\w+)\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\$(\d+)\s*\)/i,
        );
        if (subqueryMatch) {
            const outerColumn = subqueryMatch[1];
            const selectColumn = subqueryMatch[2];
            const subqueryTable = subqueryMatch[3];
            const subqueryWhereColumn = subqueryMatch[4];
            const subqueryParameterIndex = Number(subqueryMatch[5]) - 1;
            const subqueryValue = parameters[subqueryParameterIndex];

            const subqueryRows = this.getTable(subqueryTable);
            const currentSubqueryMatch = subqueryRows.find(
                (row) => row[subqueryWhereColumn] === subqueryValue,
            );
            if (!currentSubqueryMatch) return [];
            const resolvedValue = currentSubqueryMatch[selectColumn];
            return rows.filter((row) => row[outerColumn] === resolvedValue);
        }

        return this.applyWhere(rows, whereText, parameters);
    }

    private handleDelete(
        sql: string,
        parameters: unknown[],
    ): { rowCount: number } {
        const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
        if (!tableMatch) return { rowCount: 0 };
        const table = tableMatch[1];
        const rows = this.getTable(table);

        const whereMatch = sql.match(/WHERE\s+([\s\S]+?)$/is);
        if (!whereMatch) {
            const count = rows.length;
            rows.length = 0;
            return { rowCount: count };
        }

        const matching = this.applyWhere(
            rows,
            whereMatch[1].trim(),
            parameters,
        );
        const toRemoveSet = new Set(matching);
        let removedCount = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
            if (toRemoveSet.has(rows[i])) {
                rows.splice(i, 1);
                removedCount++;
            }
        }
        return { rowCount: removedCount };
    }
}
