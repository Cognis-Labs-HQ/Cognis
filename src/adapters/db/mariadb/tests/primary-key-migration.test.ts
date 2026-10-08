import assert from "node:assert/strict";
import test from "node:test";
import { createDbExecutor } from "../index.js";

const columns = [
    "source_entry_id",
    "target_entry_id",
    "relation",
    "group_index",
    "position",
];

test("existing reference keys widen without discarding repeated readings or positions", async () => {
    let primary = columns.slice(0, 3);
    let migrations = 0;
    const rows: Record<string, unknown>[] = [];
    const query = async (sql: string, params: unknown[] = []) => {
        let result: Record<string, unknown>[] = [];
        if (sql.includes("information_schema.columns"))
            result = columns.map((column_name) => ({
                column_name,
                data_type:
                    column_name === "position" || column_name === "group_index"
                        ? "integer"
                        : "varchar",
            }));
        else if (sql.includes("information_schema.key_column_usage"))
            result = primary.map((column_name) => ({ column_name }));
        else if (sql.includes("DROP ") && sql.includes("ADD PRIMARY KEY")) {
            migrations += 1;
            primary = [...columns];
        } else if (sql.startsWith("INSERT INTO")) {
            const names = sql
                .match(/\(([^)]+)\)/)![1]
                .split(",")
                .map((name) => name.trim().replace(/[`"]/g, ""));
            const row = Object.fromEntries(
                names.map((name, index) => [name, params[index]]),
            );
            if (
                rows.some((existing) =>
                    primary.every((column) => existing[column] === row[column]),
                )
            )
                throw new Error("23505 duplicate primary key");
            rows.push(row);
        }
        return [result, {}] as [unknown, unknown];
    };
    const executor = await createDbExecutor({
        databaseUrl: "mysql://unused",
        pool: {
            query,
            getConnection: async () => {
                throw new Error("unexpected connection");
            },
            end: async () => {},
        },
    });
    const insert = (group_index: number, position: number) =>
        executor.executeCommand({
            option: "INSERT",
            table: "study_library_references",
            values: {
                source_entry_id: "card",
                target_entry_id: "kana-o",
                relation: "single-readings",
                group_index,
                position,
            },
        });
    await insert(0, 0);
    await assert.rejects(insert(1, 0), /23505/);
    const definition = {
        name: "study_library_references",
        columns: columns.map((name) => ({
            name,
            type:
                name === "position" || name === "group_index"
                    ? ("integer" as const)
                    : ("text" as const),
            notNull: true,
            default: name === "group_index" ? -1 : undefined,
        })),
        primaryKey: columns,
    };
    await executor.ensureTable(definition);
    await executor.ensureTable(definition);
    await insert(1, 0);
    await insert(0, 1);
    await assert.rejects(insert(0, 0), /23505/);
    assert.equal(rows.length, 3);
    assert.equal(migrations, 1);
});

test("current and unrelated primary keys are not replaced", async () => {
    for (const primary of [columns, ["other_id"]]) {
        const statements: string[] = [];
        const query = async (sql: string) => {
            statements.push(sql);
            return sql.includes("information_schema.key_column_usage")
                ? ([primary.map((column_name) => ({ column_name })), {}] as [
                      unknown,
                      unknown,
                  ])
                : ([[], {}] as [unknown, unknown]);
        };
        const executor = await createDbExecutor({
            databaseUrl: "mysql://unused",
            pool: {
                query,
                getConnection: async () => {
                    throw new Error("unused");
                },
                end: async () => {},
            },
        });
        await executor.ensureTable({
            name: "records",
            columns: columns.map((name) => ({ name, type: "text" as const })),
            primaryKey: columns,
        });
        assert.equal(
            statements.some((sql) => sql.includes("DROP ")),
            false,
        );
    }
});
