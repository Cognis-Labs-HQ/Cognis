import test from "node:test";
import assert from "node:assert/strict";
import { ensureSqliteAuthSchema } from "../auth-schema.js";

test("sqlite auth schema applies all statements", async () => {
    const statements: string[] = [];
    const executor = {
        query: async () => ({ rows: [], rowCount: 0 }),
        execute: async (statement: string) => {
            statements.push(statement);
            return { affectedRows: 0 };
        },
        transaction: async <T>(
            callback: (trx: typeof executor) => Promise<T>,
        ) => callback(executor),
    };

    await ensureSqliteAuthSchema(executor);

    assert.equal(statements.length, 3);
    assert.match(statements[0] ?? "", /CREATE TABLE IF NOT EXISTS accounts/);
    assert.match(statements[2] ?? "", /local_auth_credentials/);
});
