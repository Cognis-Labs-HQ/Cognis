import assert from "node:assert/strict";
import test from "node:test";
import { NextcloudWhiteboardStore } from "../api/store.js";

function createMemoryDb() {
    const tables = new Map();
    const applyWhere = (rows, where = []) =>
        rows.filter((row) =>
            where.every((clause) => row[clause.column] === clause.value),
        );
    const db = {
        async ensureTable(definition) {
            if (!tables.has(definition.name)) tables.set(definition.name, []);
        },
        async executeCommand(command) {
            const rows = tables.get(command.table) ?? [];
            if (command.option === "SELECT") {
                const selected = applyWhere(rows, command.where).slice(
                    0,
                    command.limit ?? rows.length,
                );
                return { rows: selected.map((row) => ({ ...row })) };
            }
            if (command.option === "INSERT") {
                const values = { ...command.values };
                const conflictColumns = command.onConflict?.columns ?? [];
                const existing = rows.find((row) =>
                    conflictColumns.every(
                        (column) => row[column] === values[column],
                    ),
                );
                if (existing) {
                    for (const column of command.onConflict.merge ?? []) {
                        existing[column] = values[column];
                    }
                } else {
                    rows.push(values);
                }
                tables.set(command.table, rows);
                return { rows: [] };
            }
            return { rows: [] };
        },
        async transaction(callback) {
            await callback(db);
        },
    };
    return db;
}

test("nextcloud whiteboard store persists normalized configuration", async () => {
    const store = new NextcloudWhiteboardStore({ db: createMemoryDb() });
    await store.ensureSchema();
    const saved = await store.saveConfig({
        instanceUrl: "https://nextcloud.example.test",
        apiKey: "secret-api-key",
    });

    assert.equal(saved.instanceUrl, "https://nextcloud.example.test");
    assert.equal(saved.apiKeyConfigured, true);
    assert.equal(saved.apiKey, "secret-api-key");
});

test("nextcloud whiteboard store enforces allow-list access", async () => {
    const store = new NextcloudWhiteboardStore({ db: createMemoryDb() });
    await store.ensureSchema();
    const board = await store.createWhiteboard({
        title: "Planning",
        createdBy: "teacher",
        participants: ["student"],
    });

    assert.equal(await store.canAccessWhiteboard(board.id, "teacher"), true);
    assert.equal(await store.canAccessWhiteboard(board.id, "student"), true);
    assert.equal(await store.canAccessWhiteboard(board.id, "outsider"), false);
});
