import assert from "node:assert/strict";
import test from "node:test";
import { NextcloudWhiteboardStore } from "../api/store.js";

function createMemoryDb() {
    const tables = new Map();
    const primaryKeys = new Map();
    const applyWhere = (rows, where = []) =>
        rows.filter((row) =>
            where.every((clause) => row[clause.column] === clause.value),
        );
    const db = {
        async ensureTable(definition) {
            if (!tables.has(definition.name)) tables.set(definition.name, []);
            const explicitPrimaryKey = Array.isArray(definition.primaryKey)
                ? definition.primaryKey
                : [];
            const columnPrimaryKey = (definition.columns ?? [])
                .filter((column) => column.primaryKey)
                .map((column) => column.name);
            primaryKeys.set(definition.name, [
                ...explicitPrimaryKey,
                ...columnPrimaryKey,
            ]);
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
            if (command.option === "UPDATE") {
                const selected = applyWhere(rows, command.where);
                for (const row of selected) Object.assign(row, command.values);
                return { rows: [] };
            }
            if (command.option === "INSERT") {
                const values = { ...command.values };
                const conflictColumns =
                    command.conflict?.target ??
                    command.onConflict?.columns ??
                    [];
                const existing = rows.find(
                    (row) =>
                        conflictColumns.length > 0 &&
                        conflictColumns.every(
                            (column) => row[column] === values[column],
                        ),
                );
                if (existing && command.conflict?.action === "update") {
                    Object.assign(existing, command.conflict.update ?? values);
                } else if (existing && command.onConflict) {
                    for (const column of command.onConflict.merge ?? []) {
                        existing[column] = values[column];
                    }
                } else {
                    const primaryKey = primaryKeys.get(command.table) ?? [];
                    const duplicatePrimary = rows.some(
                        (row) =>
                            primaryKey.length > 0 &&
                            primaryKey.every(
                                (column) => row[column] === values[column],
                            ),
                    );
                    if (duplicatePrimary)
                        throw new Error("duplicate key value");
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
        serverUrl: "https://whiteboard.example.test:3002",
        apiKey: "secret-api-key-minimum-16-chars",
        imageUploadMaxBytes: 2097152,
    });

    assert.equal(saved.serverUrl, "https://whiteboard.example.test:3002");
    assert.equal(saved.apiKeyConfigured, true);
    assert.equal(saved.apiKey, "secret-api-key-minimum-16-chars");
    assert.equal(saved.imageUploadMaxBytes, 2097152);
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

test("nextcloud whiteboard store renames boards", async () => {
    const store = new NextcloudWhiteboardStore({ db: createMemoryDb() });
    await store.ensureSchema();
    const board = await store.createWhiteboard({
        title: "Planning",
        createdBy: "teacher",
        participants: [],
    });

    const renamed = await store.renameWhiteboard(board.id, "Updated planning");

    assert.equal(renamed.title, "Updated planning");
});
