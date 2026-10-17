import assert from "node:assert/strict";
import test from "node:test";
import { LibraryVisibilityService } from "../visibility.js";
import { stagePushRequest } from "../push-requests.js";
import { createLibraryFlow } from "./reuse/flows.js";
import type {
    LibraryEntry,
    LibraryPushRequest,
    LibraryEntryInput,
} from "../types.js";

const source = {
    id: "card",
    schemaId: "schema",
    layer: "words",
    label: "original",
    scope: "user",
    scopeId: "alice",
    createdBy: "alice",
    editable: true,
    fields: {},
    references: [],
} as LibraryEntry;
const proposal = {
    schemaId: "schema",
    layer: "words",
    label: "edited",
    fields: {},
    references: [],
};

test("admin staging preserves the live card; approval applies staged fields and adds submitter and modifying admin as owners", async () => {
    let current = structuredClone(source);
    let request: LibraryPushRequest = {
        id: "request",
        sourceEntryId: source.id,
        requestedBy: "alice",
        destination: { scope: "global", scopeId: "global" },
        status: "pending",
        sourceSnapshot: structuredClone(source),
    };
    const notifications: string[] = [];
    const owners: string[][] = [];
    const flows: string[] = [];
    const store = {
        transaction: async (operation: () => Promise<unknown>) => operation(),
        get: async () => current,
        getPush: async () => request,
        stagePush: async (
            _id: string,
            entry: LibraryEntryInput,
            accountId: string,
        ) =>
            (request = {
                ...request,
                proposedEntry: entry,
                modifiedBy: [accountId],
            }),
        reviewPush: async (
            _id: string,
            status: LibraryPushRequest["status"],
        ) => {
            request = { ...request, status };
        },
        move: async (_id: string, destination: object) =>
            (current = { ...current, ...destination }),
        addOwners: async (_id: string, accounts: string[]) => {
            owners.push(accounts);
        },
    };
    const service = new LibraryVisibilityService(
        store as never,
        async () => current,
        async (_actor, location) => location,
        async (_actor, input) => {
            if (!input.label?.trim()) throw new Error("invalid_label");
        },
        createLibraryFlow((id) => flows.push(id)),
        async (_actor, _id, input) => (current = { ...current, ...input }),
        undefined,
        undefined,
        async (changed) => {
            notifications.push(changed.status);
        },
    );
    await assert.rejects(
        service.stagePush(
            { accountId: "alice", role: "user" },
            request.id,
            proposal,
        ),
        /forbidden/,
    );
    await assert.rejects(
        service.stagePush(
            { accountId: "teacher", role: "teacher" },
            request.id,
            proposal,
        ),
        /forbidden/,
    );
    await service.stagePush(
        { accountId: "editor", role: "admin" },
        request.id,
        proposal,
    );
    assert.equal(current.label, "original");
    assert.equal(request.proposedEntry?.label, "edited");
    assert.equal(owners.length, 0);
    await service.reviewPush(
        { accountId: "approver", role: "admin" },
        request.id,
        "approved",
    );
    assert.equal(current.label, "edited");
    assert.equal(current.scope, "global");
    assert.deepEqual(owners, [["alice", "editor"]]);
    assert.deepEqual(notifications, ["approved"]);
    assert.ok(flows.includes("study:library:stageRequest"));
    await assert.rejects(
        service.stagePush(
            { accountId: "editor", role: "admin" },
            request.id,
            proposal,
        ),
        /already_reviewed/,
    );
});

test("saving an unchanged staged card does not grant ownership; changed drafts retain each modifying administrator", async () => {
    let row: Record<string, unknown> = {
        id: "request",
        source_entry_id: "card",
        destination_scope: "global",
        destination_scope_id: "global",
        requested_by: "alice",
        status: "pending",
        source_entry_json: JSON.stringify(source),
        modified_by_json: "[]",
    };
    const database = {
        executeCommand: async (command) => {
            if (command.option === "UPDATE") row = { ...row, ...command.set };
            return { rowCount: 1, rows: [row] };
        },
    };
    const unchanged = await stagePushRequest(
        database as never,
        "request",
        { ...proposal, label: "original", fields: { reference_images: [] } },
        "admin",
    );
    assert.deepEqual(unchanged.modifiedBy, []);
    await stagePushRequest(database as never, "request", proposal, "editor");
    const changed = await stagePushRequest(
        database as never,
        "request",
        { ...proposal, label: "another" },
        "second",
    );
    assert.deepEqual(changed.modifiedBy, ["editor", "second"]);
});
