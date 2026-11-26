import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { createDbExecutor } from "../index.js";
import type { StructuredDbTableDef } from "../../../../gateways/db/reuse/db-table.js";

const databaseUrl = process.env.COGNIS_TEST_POSTGRES_URL;

test(
    "PostgreSQL reconciles unique keys without losing resource identities",
    {
        skip:
            !databaseUrl &&
            "Set COGNIS_TEST_POSTGRES_URL to a disposable PostgreSQL database",
    },
    async (context) => {
        const schema = `schema_test_${randomUUID().replaceAll("-", "")}`;
        const admin = new Pool({ connectionString: databaseUrl });
        await admin.query(`CREATE SCHEMA ${schema}`);
        const pool = new Pool({
            connectionString: databaseUrl,
            options: `-c search_path=${schema}`,
        });
        const executor = await createDbExecutor({
            databaseUrl: databaseUrl!,
            pool,
        });
        const definition: StructuredDbTableDef = {
            name: "resources",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "reference_key", type: "text", unique: true },
                { name: "payload", type: "text" },
            ],
        };
        const insert = (id: string, reference: string | null) =>
            executor.executeCommand({
                option: "INSERT",
                table: "resources",
                values: { id, reference_key: reference, payload: id },
                conflict: { target: ["reference_key"], action: "ignore" },
            });
        const countIndexes = async () =>
            (
                await pool.query(
                    "SELECT count(*)::integer AS count FROM pg_index WHERE indrelid = 'resources'::regclass",
                )
            ).rows[0].count;
        try {
            await context.test(
                "missing column becomes unique and existing values survive",
                async () => {
                    await pool.query(
                        "CREATE TABLE resources (id TEXT PRIMARY KEY, payload TEXT)",
                    );
                    await pool.query(
                        "INSERT INTO resources VALUES ('original', 'drawing')",
                    );
                    await Promise.all(
                        Array.from({ length: 4 }, () =>
                            executor.ensureTable(definition),
                        ),
                    );
                    await insert("null-one", null);
                    await insert("null-two", null);
                    assert.deepEqual(
                        (
                            await pool.query(
                                "SELECT * FROM resources WHERE id = 'original'",
                            )
                        ).rows,
                        [
                            {
                                id: "original",
                                payload: "drawing",
                                reference_key: null,
                            },
                        ],
                    );
                    assert.equal(await countIndexes(), 2);
                },
            );
            await context.test(
                "existing unconstrained column reproduces 42P10 then supports concurrent creation",
                async () => {
                    await pool.query("DROP TABLE resources");
                    await pool.query(
                        "CREATE TABLE resources (id TEXT PRIMARY KEY, reference_key TEXT, payload TEXT)",
                    );
                    await assert.rejects(insert("failure", "meeting"), {
                        code: "42P10",
                    });
                    await Promise.all(
                        Array.from({ length: 4 }, () =>
                            executor.ensureTable(definition),
                        ),
                    );
                    await Promise.all(
                        Array.from({ length: 8 }, (_, index) =>
                            insert(`board-${index}`, "meeting"),
                        ),
                    );
                    const before = (await pool.query("SELECT * FROM resources"))
                        .rows;
                    assert.equal(before.length, 1);
                    await executor.ensureTable(definition);
                    await insert("repeat", "meeting");
                    assert.deepEqual(
                        (await pool.query("SELECT * FROM resources")).rows,
                        before,
                    );
                    assert.equal(await countIndexes(), 2);
                },
            );
            await context.test(
                "fresh setup and initialization inside a transaction are idempotent",
                async () => {
                    await pool.query("DROP TABLE resources");
                    await Promise.all(
                        Array.from({ length: 4 }, () =>
                            executor.ensureTable(definition),
                        ),
                    );
                    await executor
                        .transaction(async (transaction) => {
                            await transaction.ensureTable(definition);
                            await transaction.executeCommand({
                                option: "INSERT",
                                table: "resources",
                                values: { id: "rolled-back" },
                            });
                            throw new Error("rollback outer transaction");
                        })
                        .then(
                            () => assert.fail("expected rollback"),
                            (error) =>
                                assert.match(error.message, /rollback outer/),
                        );
                    assert.equal(
                        (await pool.query("SELECT * FROM resources")).rowCount,
                        0,
                    );
                    assert.equal(await countIndexes(), 2);
                },
            );
            await context.test(
                "duplicate values fail without deleting or rewriting data",
                async () => {
                    await pool.query("DROP TABLE resources");
                    await pool.query(
                        "CREATE TABLE resources (id TEXT PRIMARY KEY, reference_key TEXT, payload TEXT)",
                    );
                    await pool.query(
                        "INSERT INTO resources VALUES ('one', 'same', 'first'), ('two', 'same', 'second')",
                    );
                    const before = (
                        await pool.query("SELECT * FROM resources ORDER BY id")
                    ).rows;
                    await assert.rejects(executor.ensureTable(definition), {
                        code: "23505",
                    });
                    assert.deepEqual(
                        (
                            await pool.query(
                                "SELECT * FROM resources ORDER BY id",
                            )
                        ).rows,
                        before,
                    );
                },
            );
            await context.test(
                "partial and expression indexes do not satisfy the conflict target",
                async () => {
                    await pool.query("DROP TABLE resources");
                    await pool.query(
                        "CREATE TABLE resources (id TEXT PRIMARY KEY, reference_key TEXT, payload TEXT)",
                    );
                    await pool.query(
                        "CREATE UNIQUE INDEX partial_reference ON resources(reference_key) WHERE payload = 'active'",
                    );
                    await pool.query(
                        "CREATE UNIQUE INDEX expression_reference ON resources(lower(reference_key))",
                    );
                    await executor.ensureTable(definition);
                    await insert("one", "ref");
                    await insert("two", "ref");
                    assert.equal(
                        (await pool.query("SELECT * FROM resources")).rowCount,
                        1,
                    );
                },
            );
            await context.test(
                "composite unique declarations are healed and existing reversed key order is reused",
                async () => {
                    const composite: StructuredDbTableDef = {
                        name: "memberships",
                        columns: [
                            { name: "resource_id", type: "text" },
                            { name: "account_id", type: "text" },
                        ],
                        uniqueKeys: [["resource_id", "account_id"]],
                    };
                    await pool.query(
                        "CREATE TABLE memberships (resource_id TEXT, account_id TEXT)",
                    );
                    await executor.ensureTable(composite);
                    await executor.ensureTable({
                        ...composite,
                        uniqueKeys: [["account_id", "resource_id"]],
                    });
                    const command = {
                        option: "INSERT" as const,
                        table: "memberships",
                        values: {
                            resource_id: "resource",
                            account_id: "owner",
                        },
                        conflict: {
                            action: "ignore" as const,
                            target: ["resource_id", "account_id"],
                        },
                    };
                    await executor.executeCommand(command);
                    await executor.executeCommand(command);
                    assert.equal(
                        (await pool.query("SELECT * FROM memberships"))
                            .rowCount,
                        1,
                    );
                    assert.equal(
                        (
                            await pool.query(
                                "SELECT count(*)::integer AS count FROM pg_index WHERE indrelid = 'memberships'::regclass",
                            )
                        ).rows[0].count,
                        1,
                    );
                },
            );
        } finally {
            await pool.end();
            await admin.query(`DROP SCHEMA ${schema} CASCADE`);
            await admin.end();
        }
    },
);
