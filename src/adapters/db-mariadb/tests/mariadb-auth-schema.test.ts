import test from "node:test";
import assert from "node:assert/strict";
import { ensureMariaDbAuthSchema } from "../auth-schema.js";

test("mariadb auth schema applies all statements", async () => {
    const statements: string[] = [];
    const db = {
        query: async () => ({ rows: [], rowCount: 0 }),
        execute: async (statement: string) => {
            statements.push(statement);
            return { affectedRows: 0 };
        },
        transaction: async <T>(callback: (trx: typeof db) => Promise<T>) =>
            callback(db),
    };

    await ensureMariaDbAuthSchema(db);

    assert.equal(statements.length, 3);
    assert.match(statements[2] ?? "", /password_hash/);
});
