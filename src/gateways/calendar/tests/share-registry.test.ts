import test from "node:test";
import assert from "node:assert/strict";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import { CalendarShareRegistry } from "../bootstrap/share-registry.js";

test("calendar share registry treats legacy read_write permission as write", async () => {
    const db: DbExecutor = {
        async executeCommand(command) {
            if (
                command.option === "SELECT" &&
                command.table === "calendar_user_shares"
            ) {
                return {
                    rows: [
                        {
                            id: "share-1",
                            owner_account_id: "owner-1",
                            owner_calendar_id: "calendar-1",
                            recipient_account_id: "recipient-1",
                            recipient_calendar_id: "calendar-2",
                            recipient_handle: "recipient",
                            recipient_display_name: "Recipient",
                            recipient_avatar_key: null,
                            permission: "read_write",
                            expires_at: "",
                            created_at: "2026-01-01T00:00:00.000Z",
                            updated_at: "2026-01-01T00:00:00.000Z",
                        },
                    ],
                };
            }
            return { rows: [] };
        },
        async ensureTable() {},
        async transaction(callback) {
            return callback(this);
        },
    };
    const registry = new CalendarShareRegistry(db);
    const shares = await registry.listCalendarUserShares("owner-1", "calendar-1");
    assert.equal(shares[0]?.permission, "write");
});

test("calendar share registry retries write updates with legacy read_write permission", async () => {
    const updatePermissions: string[] = [];
    const db: DbExecutor = {
        async executeCommand(command) {
            if (
                command.option === "SELECT" &&
                command.table === "calendar_user_shares"
            ) {
                return {
                    rows: [
                        {
                            id: "share-1",
                            owner_account_id: "owner-1",
                            owner_calendar_id: "calendar-1",
                            recipient_account_id: "recipient-1",
                            recipient_calendar_id: "calendar-2",
                            recipient_handle: "recipient",
                            recipient_display_name: "Recipient",
                            recipient_avatar_key: null,
                            permission: "read",
                            expires_at: "",
                            created_at: "2026-01-01T00:00:00.000Z",
                            updated_at: "2026-01-01T00:00:00.000Z",
                        },
                    ],
                };
            }
            if (
                command.option === "UPDATE" &&
                command.table === "calendar_user_shares"
            ) {
                const permission = String(command.values?.permission ?? "");
                updatePermissions.push(permission);
                if (permission === "write") {
                    throw new Error("invalid input value for enum permission");
                }
            }
            return { rows: [] };
        },
        async ensureTable() {},
        async transaction(callback) {
            return callback(this);
        },
    };
    const registry = new CalendarShareRegistry(db);
    const updated = await registry.updateCalendarUserShare({
        ownerAccountId: "owner-1",
        ownerCalendarId: "calendar-1",
        shareId: "share-1",
        permission: "write",
    });
    assert.equal(updated?.permission, "write");
    assert.deepEqual(updatePermissions, ["write", "read_write"]);
});
