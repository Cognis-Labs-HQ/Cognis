import test from "node:test";
import assert from "node:assert/strict";
import { MemoryDatabaseGateway } from "../../adapters/db/memory/index.js";

test("database gateway contract supports transaction operations", async () => {
    const gateway = new MemoryDatabaseGateway();
    const value = await gateway.transaction(async () => "ok");
    assert.equal(value, "ok");
});
