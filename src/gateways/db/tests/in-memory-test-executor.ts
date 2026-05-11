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
    buildStructuredDbCommandStatement,
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

    private readonly structuredDbDialect: StructuredDbDialect = {
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
        params: unknown[] = [],
    ): Promise<{ rows?: Row[]; rowCount?: number }> {
        let paramIndex = 1;
        const normalizedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
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
            return this.handleInsert(trimmed, params);
        if (upper.startsWith("SELECT"))
            return this.handleSelect(trimmed, params);
        if (upper.startsWith("UPDATE"))
            return this.handleUpdate(trimmed, params);
        if (upper.startsWith("DELETE"))
            return this.handleDelete(trimmed, params);
        return { rowCount: 0 };
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDbCommandStatement(
            command,
            this.structuredDbDialect,
        );
        return this.execute(statement.sql, statement.params);
    }

    async transaction<T>(
        callback: (executor: DbExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        if (this.schemas.has(def.name)) return;
        const pkCols: string[] = def.primaryKey ?? [];
        const defaults = new Map<string, unknown>();
        const uniqueCols: string[][] = [...(def.uniqueKeys ?? [])];

        for (const col of def.columns) {
            if (pkCols.length === 0 && col.primaryKey) pkCols.push(col.name);
            if (col.unique) uniqueCols.push([col.name]);
            if (col.default !== undefined) {
                defaults.set(col.name, this.parseTableDefault(col.default));
            }
        }

        this.schemas.set(def.name, { pkCols, defaults, uniqueCols });
        if (!this.tables.has(def.name)) this.tables.set(def.name, []);
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
        const m = sql.match(
            /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)/i,
        );
        if (!m) return;
        const table = m[1];
        const body = m[2];

        const pkCols: string[] = [];
        const defaults = new Map<string, unknown>();
        const uniqueCols: string[][] = [];

        const lines = body.split(",").map((l) => l.trim());
        const reassembled: string[] = [];
        let buf = "";
        let depth = 0;
        for (const line of lines) {
            buf += (buf ? ", " : "") + line;
            depth +=
                (line.match(/\(/g) || []).length -
                (line.match(/\)/g) || []).length;
            if (depth <= 0) {
                reassembled.push(buf);
                buf = "";
                depth = 0;
            }
        }
        if (buf) reassembled.push(buf);

        for (const line of reassembled) {
            const trimLine = line.trim();
            const pkConstraint = trimLine.match(
                /^PRIMARY\s+KEY\s*\(([^)]+)\)/i,
            );
            if (pkConstraint) {
                pkCols.push(...pkConstraint[1].split(",").map((c) => c.trim()));
                continue;
            }
            const uniqueConstraint = trimLine.match(/^UNIQUE\s*\(([^)]+)\)/i);
            if (uniqueConstraint) {
                uniqueCols.push(
                    uniqueConstraint[1].split(",").map((c) => c.trim()),
                );
                continue;
            }
            if (/^(?:FOREIGN\s+KEY|CHECK|CONSTRAINT)/i.test(trimLine)) continue;

            const colMatch = trimLine.match(/^(\w+)\s+/);
            if (!colMatch) continue;
            const col = colMatch[1];

            if (/\bPRIMARY\s+KEY\b/i.test(trimLine)) {
                pkCols.push(col);
            }
            if (/\bUNIQUE\b/i.test(trimLine)) {
                uniqueCols.push([col]);
            }

            const defMatch = trimLine.match(/DEFAULT\s+(.+?)(?:\s*,|\s*$)/i);
            if (defMatch) {
                const raw = defMatch[1].replace(/[,)]*$/, "").trim();
                defaults.set(col, this.parseDefault(raw));
            }
        }

        this.schemas.set(table, { pkCols, defaults, uniqueCols });
    }

    private parseDefault(raw: string): unknown {
        const upper = raw.toUpperCase();
        if (upper === "TRUE" || upper === "1") return true;
        if (upper === "FALSE" || upper === "0") return false;
        if (upper === "NULL") return null;
        if (upper === "NOW()" || upper === "CURRENT_TIMESTAMP")
            return "__NOW__";
        if (/^\d+$/.test(raw)) return Number(raw);
        const strMatch = raw.match(/^'(.*)'$/);
        if (strMatch) return strMatch[1];
        return raw;
    }

    private applyDefaults(table: string, row: Row): void {
        const schema = this.schemas.get(table);
        if (!schema) return;
        for (const [col, def] of schema.defaults) {
            if (!(col in row) || row[col] === undefined) {
                row[col] = def === "__NOW__" ? new Date().toISOString() : def;
            }
        }
    }

    private getPkCols(table: string, insertedCols: string[]): string[] {
        const schema = this.schemas.get(table);
        if (schema && schema.pkCols.length > 0) return schema.pkCols;
        return [insertedCols[0]];
    }

    private findExisting(rows: Row[], row: Row, pkCols: string[]): number {
        return rows.findIndex((r) =>
            pkCols.every((col) => r[col] === row[col]),
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
            for (const uk of schema.uniqueCols) {
                if (
                    uk.every(
                        (col) =>
                            rows[i][col] !== undefined &&
                            rows[i][col] === row[col],
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
        params: unknown[],
    ): { rows?: Row[]; rowCount: number } {
        const tableMatch = sql.match(
            /INSERT\s+(?:OR\s+IGNORE\s+)?(?:IGNORE\s+)?INTO\s+(\w+)/i,
        );
        if (!tableMatch) return { rowCount: 0 };
        const table = tableMatch[1];

        const colsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
        if (!colsMatch) return { rowCount: 0 };
        const cols = colsMatch[1].split(",").map((c) => c.trim());

        const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
        const valuePlaceholders = valuesMatch
            ? valuesMatch[1].split(",").map((v) => v.trim())
            : [];

        const row: Row = {};
        let paramIdx = 0;
        for (let i = 0; i < cols.length; i++) {
            const ph = valuePlaceholders[i] ?? "";
            const phMatch = ph.match(/^\$(\d+)$/);
            if (phMatch) {
                row[cols[i]] = params[Number(phMatch[1]) - 1];
            } else if (/^(NOW\(\)|CURRENT_TIMESTAMP)$/i.test(ph)) {
                row[cols[i]] = new Date().toISOString();
            } else if (/^TRUE$/i.test(ph)) {
                row[cols[i]] = true;
            } else if (/^FALSE$/i.test(ph)) {
                row[cols[i]] = false;
            } else if (/^\?$/.test(ph)) {
                row[cols[i]] = params[paramIdx++];
            } else if (/^\d+$/.test(ph)) {
                row[cols[i]] = Number(ph);
            } else {
                row[cols[i]] = params[i] ?? null;
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
        const pkCols = this.getPkCols(table, cols);
        const existingIdx = this.findExisting(rows, row, pkCols);

        if (existingIdx >= 0) {
            if (onConflictUpdate) {
                const existing = rows[existingIdx];
                const updateMatch = sql.match(
                    /(?:DO\s+UPDATE\s+SET|DUPLICATE\s+KEY\s+UPDATE)\s+(.+)$/i,
                );
                if (updateMatch) {
                    const updates = updateMatch[1]
                        .split(",")
                        .map((s) => s.trim());
                    for (const upd of updates) {
                        const exclMatch = upd.match(
                            /(\w+)\s*=\s*(?:EXCLUDED|excluded|VALUES\((\w+)\))\.?(\w*)/,
                        );
                        if (exclMatch) {
                            const targetCol = exclMatch[1];
                            const sourceCol =
                                exclMatch[3] || exclMatch[2] || targetCol;
                            existing[targetCol] =
                                row[sourceCol] ?? row[targetCol];
                        }
                        const valParamMatch = upd.match(/(\w+)\s*=\s*\$(\d+)/);
                        if (valParamMatch) {
                            const col = valParamMatch[1];
                            const pIdx = Number(valParamMatch[2]) - 1;
                            existing[col] = params[pIdx];
                        }
                    }
                } else {
                    for (const col of cols.slice(pkCols.length)) {
                        existing[col] = row[col];
                    }
                }
                return { rowCount: 1 };
            }
            if (isIgnore) return { rowCount: 0 };
        }

        if (existingIdx < 0) {
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
        params: unknown[],
    ): { rows: Row[]; rowCount: number } {
        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        if (!fromMatch) return { rows: [], rowCount: 0 };
        const mainTable = fromMatch[1];

        const isCount = /SELECT\s+COUNT\s*\(\s*\*\s*\)\s+AS\s+cnt/i.test(sql);

        const joinMatches = [
            ...sql.matchAll(
                /(?:LEFT\s+)?(?:INNER\s+)?JOIN\s+(\w+)\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi,
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

        for (const jm of joinMatches) {
            const joinTable = jm[1];
            const joinAlias = jm[2];
            aliasMap.set(joinAlias, joinTable);

            const leftAlias = jm[3];
            const leftCol = jm[4];
            const rightAlias = jm[5];
            const rightCol = jm[6];

            const joinRows = this.getTable(joinTable);
            const isLeft = /LEFT\s+JOIN/i.test(jm[0]);

            const leftIsMain =
                leftAlias === mainAlias ||
                leftAlias === mainTable ||
                !aliasMap.has(leftAlias) ||
                aliasMap.get(leftAlias) !== joinTable;
            const joinIsRight = rightAlias === joinAlias;

            let mainCol: string;
            let jCol: string;

            if (joinIsRight) {
                mainCol = leftCol;
                jCol = rightCol;
            } else if (leftIsMain) {
                mainCol = leftCol;
                jCol = rightCol;
            } else {
                mainCol = rightCol;
                jCol = leftCol;
            }

            rows = rows.flatMap((mainRow) => {
                const mainVal =
                    mainRow[mainCol] ?? mainRow[`${leftAlias}.${leftCol}`];
                const matches = joinRows.filter((jr) => {
                    const jVal = jr[jCol];
                    return jVal === mainVal;
                });
                if (matches.length === 0 && isLeft) {
                    return [mainRow];
                }
                if (matches.length === 0) return [];
                return matches.map((jr) => {
                    const merged: Row = { ...mainRow };
                    for (const [k, v] of Object.entries(jr)) {
                        if (!(k in merged)) merged[k] = v;
                    }
                    return merged;
                });
            });
        }

        if (whereMatch) {
            rows = this.applyWhere(rows, whereMatch[1].trim(), params);
        }

        const limitMatch = sql.match(/LIMIT\s+\$(\d+)/i);
        const literalLimitMatch = sql.match(/LIMIT\s+(\d+)(?!\s*\$)/i);
        if (limitMatch) {
            const limitVal = Number(params[Number(limitMatch[1]) - 1]);
            rows = rows.slice(0, limitVal);
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
        params: unknown[],
    ): Row[] {
        const conditions = whereText.split(/\s+AND\s+/i);
        let result = rows;
        for (const cond of conditions) {
            const eqMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*=\s*\$(\d+)/);
            if (eqMatch) {
                const col = eqMatch[2];
                const pidx = Number(eqMatch[3]) - 1;
                const val = params[pidx];
                result = result.filter((r) => r[col] === val);
                continue;
            }
            const neqMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*!=\s*\$(\d+)/);
            if (neqMatch) {
                const col = neqMatch[2];
                const pidx = Number(neqMatch[3]) - 1;
                const val = params[pidx];
                result = result.filter((r) => r[col] !== val);
                continue;
            }
            const gtMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*>\s*\$(\d+)/);
            if (gtMatch) {
                const col = gtMatch[2];
                const pidx = Number(gtMatch[3]) - 1;
                const val = params[pidx];
                result = result.filter(
                    (r) => String(r[col] ?? "") > String(val ?? ""),
                );
                continue;
            }
            const ltMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*<\s*\$(\d+)/);
            if (ltMatch) {
                const col = ltMatch[2];
                const pidx = Number(ltMatch[3]) - 1;
                const val = params[pidx];
                result = result.filter(
                    (r) => String(r[col] ?? "") < String(val ?? ""),
                );
                continue;
            }
            const likeMatch = cond.match(/(?:(\w+)\.)?(\w+)\s+LIKE\s+\$(\d+)/i);
            if (likeMatch) {
                const col = likeMatch[2];
                const pidx = Number(likeMatch[3]) - 1;
                const pattern = String(params[pidx] ?? "");
                const regexPattern = pattern
                    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                    .replace(/%/g, ".*")
                    .replace(/_/g, ".");
                const re = new RegExp(`^${regexPattern}$`, "i");
                result = result.filter((r) => re.test(String(r[col] ?? "")));
                continue;
            }
            const isNullMatch = cond.match(/(?:(\w+)\.)?(\w+)\s+IS\s+NULL/i);
            if (isNullMatch) {
                const col = isNullMatch[2];
                result = result.filter((r) => r[col] == null);
                continue;
            }
            const isNotNullMatch = cond.match(
                /(?:(\w+)\.)?(\w+)\s+IS\s+NOT\s+NULL/i,
            );
            if (isNotNullMatch) {
                const col = isNotNullMatch[2];
                result = result.filter((r) => r[col] != null);
                continue;
            }
        }
        return result;
    }

    private handleUpdate(sql: string, params: unknown[]): { rowCount: number } {
        const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
        if (!tableMatch) return { rowCount: 0 };
        const table = tableMatch[1];
        const rows = this.getTable(table);

        const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/is);
        const rawSetClauses = setMatch ? setMatch[1] : null;
        let targets = [...rows];

        const whereMatch = sql.match(/WHERE\s+([\s\S]+?)$/is);
        if (whereMatch) {
            targets = this.applyWhere(rows, whereMatch[1].trim(), params);
        }

        if (!rawSetClauses) return { rowCount: 0 };

        const setClauses: string[] = [];
        let buf = "";
        let depth = 0;
        for (const ch of rawSetClauses) {
            if (ch === "(") depth++;
            if (ch === ")") depth--;
            if (ch === "," && depth === 0) {
                setClauses.push(buf.trim());
                buf = "";
            } else {
                buf += ch;
            }
        }
        if (buf.trim()) setClauses.push(buf.trim());

        const targetSet = new Set(targets);
        let count = 0;
        for (const row of rows) {
            if (!targetSet.has(row)) continue;
            for (const clause of setClauses) {
                const paramMatch = clause.match(/(\w+)\s*=\s*\$(\d+)/);
                if (paramMatch) {
                    row[paramMatch[1]] = params[Number(paramMatch[2]) - 1];
                    continue;
                }
                const exprMatch = clause.match(
                    /(\w+)\s*=\s*(NOW\(\)|CURRENT_TIMESTAMP|TRUE|FALSE)/i,
                );
                if (exprMatch) {
                    const expr = exprMatch[2].toUpperCase();
                    if (expr === "NOW()" || expr === "CURRENT_TIMESTAMP")
                        row[exprMatch[1]] = new Date().toISOString();
                    else if (expr === "TRUE") row[exprMatch[1]] = true;
                    else if (expr === "FALSE") row[exprMatch[1]] = false;
                }
            }
            count++;
        }
        return { rowCount: count };
    }

    private filterByWhere(
        rows: Row[],
        whereText: string,
        params: unknown[],
    ): Row[] {
        const subqueryMatch = whereText.match(
            /(\w+)\s*=\s*\(\s*SELECT\s+(\w+)\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\$(\d+)\s*\)/i,
        );
        if (subqueryMatch) {
            const outerCol = subqueryMatch[1];
            const selectCol = subqueryMatch[2];
            const subTable = subqueryMatch[3];
            const subWhereCol = subqueryMatch[4];
            const subParamIdx = Number(subqueryMatch[5]) - 1;
            const subVal = params[subParamIdx];

            const subRows = this.getTable(subTable);
            const subMatch = subRows.find((r) => r[subWhereCol] === subVal);
            if (!subMatch) return [];
            const resolvedVal = subMatch[selectCol];
            return rows.filter((r) => r[outerCol] === resolvedVal);
        }

        return this.applyWhere(rows, whereText, params);
    }

    private handleDelete(sql: string, params: unknown[]): { rowCount: number } {
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

        const matching = this.applyWhere(rows, whereMatch[1].trim(), params);
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
