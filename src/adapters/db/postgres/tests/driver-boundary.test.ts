import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";
import { Pool } from "pg";
import type { PostgresPool } from "../index.js";

test("installed pg pool satisfies the adapter lifecycle and rejects disconnected queries", async () => {
    const server = createServer((socket) => socket.destroy());
    await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const pool = new Pool({
        connectionString: `postgresql://boundary:boundary@127.0.0.1:${address.port}/boundary`,
        max: 1,
        idleTimeoutMillis: 100,
        connectionTimeoutMillis: 1000,
        statement_timeout: 1000,
        options: "-c application_name=cognis-boundary",
    });
    const adapterPool: PostgresPool = pool;
    const errors: Error[] = [];
    assert.equal(
        pool.on("error", (error) => errors.push(error)),
        pool,
    );
    try {
        await assert.rejects(adapterPool.query("SELECT $1", [7]), Error);
        await assert.rejects(adapterPool.connect(), Error);
        assert.deepEqual(errors, []);
    } finally {
        await adapterPool.end();
        await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
        );
    }
});
