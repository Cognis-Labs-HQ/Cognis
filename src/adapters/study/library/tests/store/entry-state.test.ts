import assert from "node:assert/strict";
import test from "node:test";
import { LibraryStore } from "../../store.js";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";

test("scope changes keep entry identity and persist relocation history through hydration", async () => {
    let row: Record<string, unknown> = {
        id: "entry",
        scope: "user",
        scope_id: "alice",
        schema_id: "schema",
        schema_version: 1,
        layer: "words",
        language: "ja",
        label: "年",
        created_by: "alice",
        created_at: "2026-10-11T00:00:00Z",
        updated_at: "2026-10-11T00:00:00Z",
    };
    const database: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (operation) => operation(database),
        executeCommand: async (command) => {
            if (command.table !== "study_library_entries") return { rows: [] };
            if (command.option === "UPDATE") row = { ...row, ...command.set };
            return { rowCount: 1, rows: [row] };
        },
    };
    const store = new LibraryStore(database);
    for (const destination of [
        { scope: "global" as const },
        { scope: "user" as const, scopeId: "alice" },
        { scope: "global" as const },
    ]) {
        const moved = await store.move("entry", destination);
        assert.equal(moved.id, "entry");
        assert.ok(moved.relocatedAt);
        assert.equal(moved.createdAt, "2026-10-11T00:00:00Z");
    }
});
