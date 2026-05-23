import test from "node:test";
import assert from "node:assert/strict";
import { AnalyticsStore } from "../api/store.js";

function makeDb(initialRows = {}) {
    const tables = new Map(Object.entries(initialRows));
    const insertedRows = [];

    return {
        insertedRows,
        async ensureTable(def) {
            if (!tables.has(def.name)) {
                tables.set(def.name, []);
            }
        },
        async executeCommand(command) {
            if (command.option === "INSERT") {
                const tableRows = tables.get(command.table) ?? [];
                tableRows.push(command.values);
                tables.set(command.table, tableRows);
                insertedRows.push(command.values);
                return { rowCount: 1 };
            }
            if (command.option === "SELECT") {
                let rows = tables.get(command.table) ?? [];
                if (command.orderBy) {
                    const [order] = command.orderBy;
                    const direction = order?.direction === "ASC" ? 1 : -1;
                    const col = order?.column ?? "created_at";
                    rows = [...rows].sort((rowA, rowB) => {
                        const valueA = String(rowA[col] ?? "");
                        const valueB = String(rowB[col] ?? "");
                        return valueA < valueB ? -direction : direction;
                    });
                }
                if (command.limit) {
                    rows = rows.slice(0, command.limit);
                }
                return { rows };
            }
            return {};
        },
        async transaction(callback) {
            return callback(this);
        },
    };
}

function makeAnalyticsDb({ accountRows = [], eventRows = [] } = {}) {
    return makeDb({
        accounts: accountRows,
        sample_analytics_events: eventRows,
    });
}

test("AnalyticsStore.ensureSchema initializes the events table", async () => {
    const db = makeAnalyticsDb();
    const store = new AnalyticsStore({ db });
    await store.ensureSchema();
    const result = await db.executeCommand({
        option: "SELECT",
        table: "sample_analytics_events",
    });
    assert.ok(Array.isArray(result.rows));
    assert.equal(result.rows.length, 0);
});

test("AnalyticsStore.recordEvent inserts a row with the correct fields", async () => {
    const db = makeAnalyticsDb();
    const store = new AnalyticsStore({ db });
    await store.ensureSchema();
    await store.recordEvent("test-id-1", "page_view", "user-123", {
        page: "/home",
    });
    assert.equal(db.insertedRows.length, 1);
    const row = db.insertedRows[0];
    assert.equal(row.id, "test-id-1");
    assert.equal(row.event_type, "page_view");
    assert.equal(row.account_id, "user-123");
    assert.equal(row.meta, JSON.stringify({ page: "/home" }));
});

test("AnalyticsStore.recordEvent accepts null accountId and meta", async () => {
    const db = makeAnalyticsDb();
    const store = new AnalyticsStore({ db });
    await store.ensureSchema();
    await store.recordEvent("test-id-2", "system_event", null, null);
    const row = db.insertedRows[0];
    assert.equal(row.account_id, null);
    assert.equal(row.meta, null);
});

test("AnalyticsStore.getRecentEvents returns rows ordered by created_at descending", async () => {
    const db = makeAnalyticsDb({
        eventRows: [
            {
                id: "a",
                event_type: "login",
                account_id: "u1",
                created_at: "2024-01-01T10:00:00Z",
            },
            {
                id: "b",
                event_type: "page_view",
                account_id: "u2",
                created_at: "2024-01-03T10:00:00Z",
            },
            {
                id: "c",
                event_type: "logout",
                account_id: "u1",
                created_at: "2024-01-02T10:00:00Z",
            },
        ],
    });
    const store = new AnalyticsStore({ db });
    const events = await store.getRecentEvents(10);
    assert.equal(events.length, 3);
    assert.equal(events[0].id, "b");
    assert.equal(events[1].id, "c");
    assert.equal(events[2].id, "a");
});

test("AnalyticsStore.getRecentEvents respects the limit", async () => {
    const db = makeAnalyticsDb({
        eventRows: [
            { id: "a", event_type: "e1", created_at: "2024-01-03T10:00:00Z" },
            { id: "b", event_type: "e2", created_at: "2024-01-02T10:00:00Z" },
            { id: "c", event_type: "e3", created_at: "2024-01-01T10:00:00Z" },
        ],
    });
    const store = new AnalyticsStore({ db });
    const events = await store.getRecentEvents(2);
    assert.equal(events.length, 2);
});

test("AnalyticsStore.getRecentEvents returns empty array when no events exist", async () => {
    const db = makeAnalyticsDb();
    const store = new AnalyticsStore({ db });
    const events = await store.getRecentEvents(50);
    assert.deepEqual(events, []);
});
