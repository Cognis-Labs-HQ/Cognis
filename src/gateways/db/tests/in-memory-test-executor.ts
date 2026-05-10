/**
 * Minimal in-memory DbExecutor for unit/integration tests.
 *
 * Stores rows in a Map keyed by table name. Tracks PRIMARY KEY columns and
 * DEFAULT values from CREATE TABLE statements so that INSERT operations
 * behave correctly with conflict detection and missing-column defaults.
 */
import type { DbExecutor } from "../reuse/db-executor.js";

type Row = Record<string, unknown>;

interface TableSchema {
    pkCols: string[];
    defaults: Map<string, unknown>;
    uniqueCols: string[][];
}

export class InMemoryTestExecutor implements DbExecutor {
    private tables = new Map<string, Row[]>();
    private schemas = new Map<string, TableSchema>();

    private getTable(name: string): Row[] {
        if (!this.tables.has(name)) this.tables.set(name, []);
        return this.tables.get(name)!;
    }

    async execute(
        sql: string,
        params: unknown[] = [],
    ): Promise<{ rows?: Row[]; rowCount?: number }> {
        const trimmed = sql.trim();
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
        if (upper === "TRUE") return true;
        if (upper === "FALSE") return false;
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
            rows.push(row);
        }
        return { rowCount: 1 };
    }

    private handleSelect(
        sql: string,
        params: unknown[],
    ): { rows: Row[]; rowCount: number } {
        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        if (!fromMatch) return { rows: [], rowCount: 0 };
        const mainTable = fromMatch[1];

        const joinMatches = [
            ...sql.matchAll(
                /(?:LEFT\s+)?JOIN\s+(\w+)\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi,
            ),
        ];

        const whereMatch = sql.match(
            /WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/is,
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
            const whereClause = whereMatch[1].trim();
            const conditions = whereClause.split(/\s+AND\s+/i);
            for (const cond of conditions) {
                const eqMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*=\s*\$(\d+)/);
                if (eqMatch) {
                    const col = eqMatch[2];
                    const paramIdx = Number.parseInt(eqMatch[3], 10) - 1;
                    const val = params[paramIdx];
                    rows = rows.filter((r) => r[col] === val);
                    continue;
                }
                const neqMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*!=\s*\$(\d+)/);
                if (neqMatch) {
                    const col = neqMatch[2];
                    const paramIdx = Number.parseInt(neqMatch[3], 10) - 1;
                    const val = params[paramIdx];
                    rows = rows.filter((r) => r[col] !== val);
                }
            }
        }

        return { rows, rowCount: rows.length };
    }

    private handleUpdate(sql: string, params: unknown[]): { rowCount: number } {
        const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
        if (!tableMatch) return { rowCount: 0 };
        const table = tableMatch[1];
        const rows = this.getTable(table);

        const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
        if (!setMatch) return { rowCount: 0 };
        const rawSetClauses = setMatch[1];
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

        const whereMatch = sql.match(/WHERE\s+(.+?)$/is);
        let targets = [...rows];
        if (whereMatch) {
            const whereText = whereMatch[1].trim();
            targets = this.filterByWhere(rows, whereText, params);
        }

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

        const conditions = whereText.split(/\s+AND\s+/i);
        let result = rows;
        for (const cond of conditions) {
            const eqMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*=\s*\$(\d+)/);
            if (eqMatch) {
                const col = eqMatch[2];
                const pidx = Number(eqMatch[3]) - 1;
                const val = params[pidx];
                result = result.filter((r) => r[col] === val);
            }
        }
        return result;
    }

    private handleDelete(sql: string, params: unknown[]): { rowCount: number } {
        const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
        if (!tableMatch) return { rowCount: 0 };
        const table = tableMatch[1];
        const rows = this.getTable(table);

        const whereMatch = sql.match(/WHERE\s+(.+?)$/is);
        if (!whereMatch) {
            const count = rows.length;
            rows.length = 0;
            return { rowCount: count };
        }

        const conditions = whereMatch[1].trim().split(/\s+AND\s+/i);
        const toRemove: number[] = [];
        for (let i = 0; i < rows.length; i++) {
            let match = true;
            for (const cond of conditions) {
                const eqMatch = cond.match(/(?:(\w+)\.)?(\w+)\s*=\s*\$(\d+)/);
                if (eqMatch) {
                    const col = eqMatch[2];
                    const pidx = Number(eqMatch[3]) - 1;
                    if (rows[i][col] !== params[pidx]) match = false;
                }
            }
            if (match) toRemove.push(i);
        }
        for (let i = toRemove.length - 1; i >= 0; i--) {
            rows.splice(toRemove[i], 1);
        }
        return { rowCount: toRemove.length };
    }
}
