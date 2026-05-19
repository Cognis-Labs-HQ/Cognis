import test from "node:test";
import assert from "node:assert/strict";
import { ensureMariaDbAuthSchema } from "../auth-schema.js";

test("mariadb auth schema applies all statements", async () => {
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

    await ensureMariaDbAuthSchema(executor);

    assert.equal(statements.length, 3);
    assert.match(statements[2] ?? "", /password_hash/);
});
