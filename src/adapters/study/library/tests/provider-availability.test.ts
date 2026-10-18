import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../service/index.js";
import { mockLanguageSchema, mockCharacter } from "./fixtures/mock-language.js";
import { ContentAvailability } from "../service/availability.js";

// The live predicate models a scoped language capability disappearing on disable.
test("disabled language content is hidden and direct card/schema access resumes on re-enable", async () => {
    let enabled = true;
    const entry = mockCharacter("entry", "a");
    const store = {
        async saveSchema() {},
        async get() {
            return entry;
        },
        async list() {
            return [entry];
        },
    };
    const library = new LibraryService(
        store as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        () => enabled,
    );
    await library.registerSchema(mockLanguageSchema);
    const actor = { accountId: "admin", role: "admin" as const };
    assert.equal(library.listSchemas().length, 1);
    assert.ok(await library.read(actor, entry.id));
    enabled = false;
    assert.deepEqual(library.listSchemas(), []);
    assert.equal(library.getSchema(mockLanguageSchema.id), null);
    assert.equal(await library.read(actor, entry.id), null);
    assert.deepEqual(await library.list(actor, { scope: "global" }), []);
    await assert.rejects(
        library.list(
            actor,
            { scope: "global" },
            { schemaId: mockLanguageSchema.id },
        ),
        /schema_not_found/,
    );
    await assert.rejects(
        library.readAudio(actor, entry.id, "audio"),
        /not_found/,
    );
    enabled = true;
    assert.equal(library.listSchemas().length, 1);
    assert.ok(await library.read(actor, entry.id));
});

test("retained packaged assets are gated by the same live schema availability", () => {
    let enabled = true;
    const availability = new ContentAvailability(() => enabled);
    const receipt = {
        publisher: "publisher",
        packId: "pack",
        schemaId: mockLanguageSchema.id,
    };
    availability.rememberPack(receipt as never);
    const schema = () => mockLanguageSchema;
    assert.equal(availability.allowsPack("publisher", "pack", schema), true);
    enabled = false;
    assert.equal(availability.allowsPack("publisher", "pack", schema), false);
    enabled = true;
    assert.equal(availability.allowsPack("publisher", "pack", schema), true);
    assert.equal(availability.allowsPack("publisher", "other", schema), false);
});

test("disabled schemas hide staged review content and reject direct review actions", async () => {
    let enabled = true;
    const entry = mockCharacter("entry", "a");
    const request = {
        id: "request",
        sourceEntryId: entry.id,
        destination: { scope: "global" },
        requestedBy: "admin",
        status: "pending",
    };
    const store = {
        async get() {
            return entry;
        },
        async getPush() {
            return request;
        },
        async listPushRequests() {
            return [request];
        },
        async transaction(operation: () => Promise<unknown>) {
            return operation();
        },
        async reviewPush() {
            assert.fail("Disabled review must not mutate storage");
        },
    };
    const { LibraryVisibilityService } = await import("../visibility.js");
    const visibility = new LibraryVisibilityService(
        store as never,
        async () => entry,
        async (_actor, location) => location,
        async () => {},
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        () => enabled,
    );
    const actor = { accountId: "admin", role: "admin" as const };
    assert.equal((await visibility.listPushRequests(actor)).length, 1);
    enabled = false;
    assert.deepEqual(await visibility.listPushRequests(actor), []);
    assert.equal(await visibility.readRequestEntry(actor, "request"), null);
    await assert.rejects(
        visibility.reviewPush(actor, "request", "approved"),
        /not_found/,
    );
    enabled = true;
    assert.equal((await visibility.listPushRequests(actor)).length, 1);
});
