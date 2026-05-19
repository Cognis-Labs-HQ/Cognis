import test from "node:test";
import assert from "node:assert/strict";
import { ensurePostgresAuthSchema } from "../auth-schema.js";

test("postgres auth schema applies all statements", async () => {
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

    await ensurePostgresAuthSchema(executor);

    assert.equal(statements.length, 3);
    assert.match(statements[1] ?? "", /auth_identities/);
});
