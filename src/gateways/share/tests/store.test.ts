import test from "node:test";
import assert from "node:assert/strict";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";
import { ShareTokenStore } from "../gateway/store.js";

class MemoryExecutor {
    public readonly tableDefs: StructuredDbTableDef[] = [];
    public readonly rows = new Map<string, Record<string, unknown>>();
    public readonly auxiliaryRows = new Map<
        string,
        Map<string, Record<string, unknown>>
    >();

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        this.tableDefs.push(def);
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const rows =
            command.table === "share_tokens"
                ? this.rows
                : (this.auxiliaryRows.get(command.table) ??
                  new Map<string, Record<string, unknown>>());
        this.auxiliaryRows.set(command.table, rows);
        if (command.option === "INSERT") {
            const key = String(
                command.values.id ?? command.values.resource_key ?? "",
            );
            rows.set(key, { ...command.values });
            return { rowCount: 1 };
        }
        if (command.option === "SELECT") {
            const entries = Array.from(rows.values()).filter((row) =>
                this.matchesWhere(row, command.where ?? []),
            );
            return { rows: entries };
        }
        if (command.option === "UPDATE") {
            let rowCount = 0;
            for (const [key, row] of rows.entries()) {
                if (this.matchesWhere(row, command.where ?? [])) {
                    rows.set(key, { ...row, ...command.set });
                    rowCount += 1;
                }
            }
            return { rowCount };
        }
        if (command.option === "DELETE") {
            const beforeSize = rows.size;
            for (const [key, row] of rows.entries()) {
                const matches = this.matchesWhere(row, command.where ?? []);
                if (matches) {
                    rows.delete(key);
                }
            }
            return { rowCount: beforeSize - rows.size };
        }
        return { rowCount: 0 };
    }

    private matchesWhere(
        row: Record<string, unknown>,
        conditions: StructuredDbCommand["where"] = [],
    ): boolean {
        return conditions.every((condition) => {
            const rowValue = row[condition.column];
            if (condition.operator === "<") {
                return String(rowValue ?? "") < String(condition.value ?? "");
            }
            if (condition.operator === "!=") {
                return rowValue !== condition.value;
            }
            return rowValue === condition.value;
        });
    }

    async transaction<T>(
        callback: (executor: MemoryExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }
}

test("share token schema declares resource and token columns", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    await store.ensureSchema();
    const tableDef = executor.tableDefs.find(
        (def) => def.name === "share_tokens",
    );
    assert.ok(tableDef);
    const resourceTableDef = executor.tableDefs.find(
        (def) => def.name === "share_resources",
    );
    assert.ok(resourceTableDef);
    assert.ok(
        executor.tableDefs.some(
            (definition) => definition.name === "share_activity_events",
        ),
    );
    const columnNames = tableDef.columns.map((column) => column.name);
    assert.ok(columnNames.includes("resource_type"));
    assert.ok(columnNames.includes("resource_key"));
    assert.ok(columnNames.includes("expiration_notified_at"));
    assert.ok(columnNames.includes("last_accessed_at"));
    assert.deepEqual(
        tableDef.columns.find((column) => column.name === "resource_key")
            ?.references,
        {
            table: "share_resources",
            column: "resource_key",
            onDelete: "CASCADE",
        },
    );
    assert.ok(columnNames.includes("resource_id"));
    assert.ok(columnNames.includes("metadata"));
    assert.ok(columnNames.includes("token_value"));
    assert.ok(columnNames.includes("token_hash"));
    assert.ok(columnNames.includes("password_hash"));
    assert.ok(columnNames.includes("access_controls"));
});

test("schema upgrade backfills resource keys for existing shares", async () => {
    const executor = new MemoryExecutor();
    executor.rows.set("legacy-share", {
        id: "legacy-share",
        resource_key: "",
        resource_type: "meeting",
        resource_id: "meeting-1",
        metadata: JSON.stringify({ contentUrl: "/meetings?meeting=meeting-1" }),
        created_at: "2026-01-01T00:00:00.000Z",
    });
    const store = new ShareTokenStore(executor as never);

    await store.ensureSchema();

    const resourceKey = String(executor.rows.get("legacy-share")?.resource_key);
    assert.match(resourceKey, /^[a-f0-9]{64}$/);
    assert.ok(executor.auxiliaryRows.get("share_resources")?.has(resourceKey));
    assert.deepEqual(
        (await store.listActivity("legacy-share")).map((event) => event.type),
        ["created"],
    );
});

test("account unlock grants are scoped to a share and account", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    await store.ensureSchema();

    assert.equal(await store.hasAccountUnlock("share-1", "bob"), false);
    await store.grantAccountUnlock("share-1", "bob");
    assert.equal(await store.hasAccountUnlock("share-1", "bob"), true);
    assert.equal(await store.hasAccountUnlock("share-1", "alice"), false);
    await store.clearAccountUnlocks("share-1");
    assert.equal(await store.hasAccountUnlock("share-1", "bob"), false);
});

test("issue, list, resolve, and delete share tokens", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    const issued = await store.issue({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
        metadata: {
            meetingInstanceId: "instance-1",
        },
        label: "Class meeting",
        grantedCapabilities: ["meeting:join"],
        accessControls: {
            permissions: ["read"],
            recipients: [
                {
                    type: "user",
                    id: "bob",
                    label: "Bob",
                    permissions: ["read"],
                },
            ],
        },
        password: "secret",
        expiresAt: "",
    });

    assert.match(issued.tokenValue, /^shr_/);
    const listed = await store.listByOwner({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].label, "Class meeting");

    assert.equal(await store.resolve(issued.tokenValue), null);
    const inspected = await store.inspect(issued.tokenValue);
    assert.equal(inspected?.id, issued.id);
    assert.equal(Boolean(inspected?.passwordHash), true);
    const resolved = await store.resolve(issued.tokenValue, "secret");
    assert.ok(resolved);
    assert.match(resolved?.lastAccessedAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(resolved?.resourceId, "meeting-1");
    assert.deepEqual(resolved?.metadata, {
        meetingInstanceId: "instance-1",
    });
    assert.deepEqual(resolved?.grantedCapabilities, ["meeting:join"]);
    assert.deepEqual(resolved?.accessControls.permissions, ["read"]);
    assert.equal(resolved?.accessControls.watermarkReadonly, true);
    assert.equal(resolved?.accessControls.recipients[0]?.id, "bob");
    assert.deepEqual(
        (await store.listActivity(issued.id)).map((event) => event.type),
        ["created", "accessed"],
    );
    const received = await store.listByRecipient("bob");
    assert.equal(received.length, 1);
    assert.equal(received[0]?.id, issued.id);

    const deleted = await store.deleteById({
        shareId: issued.id,
        ownerAccountId: "alice",
    });
    assert.equal(deleted, true);
    assert.equal(await store.resolve(issued.tokenValue, "secret"), null);
});

test("share resolution survives access timestamp persistence failure", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    const issued = await store.issue({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
    });
    const executeCommand = executor.executeCommand.bind(executor);
    executor.executeCommand = async (command) => {
        if (command.option === "UPDATE" && "last_accessed_at" in command.set) {
            throw new Error("missing audit column");
        }
        return executeCommand(command);
    };

    const resolved = await store.resolve(issued.tokenValue);
    assert.equal(resolved?.id, issued.id);
    assert.equal(resolved?.lastAccessedAt, "");
});

test("updateById edits expiry, permissions, and password controls", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    const issued = await store.issue({
        ownerAccountId: "alice",
        resourceType: "whiteboard",
        resourceId: "board-1",
        accessControls: { permissions: ["read"] },
        expiresAt: "",
    });

    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const updated = await store.updateById({
        shareId: issued.id,
        ownerAccountId: "alice",
        accessControls: { permissions: ["write"] },
        password: "new-secret",
        expiresAt,
    });

    assert.ok(updated);
    assert.equal(updated?.expiresAt, expiresAt);
    assert.deepEqual(updated?.accessControls.permissions, ["read", "write"]);
    assert.equal(updated?.accessControls.watermarkReadonly, false);
    assert.deepEqual(
        (await store.listActivity(issued.id)).map((event) => event.type),
        ["created", "updated"],
    );
    assert.equal(await store.resolve(issued.tokenValue), null);
    assert.equal(
        (await store.resolve(issued.tokenValue, "new-secret"))?.id,
        issued.id,
    );
});

test("listByResource returns matching share tokens including recently expired ones", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    await store.issue({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await store.issue({
        ownerAccountId: "bob",
        resourceType: "meeting",
        resourceId: "meeting-1",
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    await store.issue({
        ownerAccountId: "carol",
        resourceType: "meeting",
        resourceId: "meeting-2",
        expiresAt: "",
    });

    const listed = await store.listByResource({
        resourceType: "meeting",
        resourceId: "meeting-1",
    });

    // A recently-expired token is retained (within the retention window) so
    // its owner can still see it listed with an "Expired" status.
    assert.equal(listed.length, 2);
    assert.equal(
        listed.every((record) => record.resourceId === "meeting-1"),
        true,
    );
    assert.equal(
        Array.from(executor.rows.values()).filter(
            (row) => row.resource_id === "meeting-1",
        ).length,
        2,
    );
});

test("purgeExpired removes only tokens past the retention window", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    await store.issue({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    await store.issue({
        ownerAccountId: "bob",
        resourceType: "meeting",
        resourceId: "meeting-1",
        expiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await store.purgeExpired();

    assert.equal(executor.rows.size, 1);
    assert.equal(
        Array.from(executor.rows.values())[0].owner_account_id,
        "alice",
    );
});

test("expired share notifications remain claimable until delivery succeeds", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    await store.ensureSchema();
    const share = await store.issue({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-expired",
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    assert.deepEqual(
        (await store.claimExpiredNotifications()).map((record) => record.id),
        [share.id],
    );
    assert.deepEqual(
        (await store.claimExpiredNotifications()).map((record) => record.id),
        [share.id],
    );
    await store.markExpirationNotificationSent(share.id);
    assert.deepEqual(await store.claimExpiredNotifications(), []);
});
