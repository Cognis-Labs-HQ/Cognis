import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../../service/index.js";
import {
    mockCharacter,
    mockLanguageSchema,
} from "../fixtures/mock-language.js";

test("class browsing shares write checks within a response and rechecks on later requests", async () => {
    let writes = 0;
    let writable = true;
    const entries = ["first", "second"].map((id) => ({
        ...mockCharacter(id, id),
        layer: "words",
        protected: false,
        scope: "class" as const,
        scopeId: "class",
    }));
    const library = new LibraryService(
        {
            async saveSchema() {},
            async list() {
                return entries;
            },
        } as never,
        {
            async canRead() {
                return true;
            },
            async canWrite() {
                writes++;
                return writable;
            },
        },
    );
    await library.registerSchema(mockLanguageSchema);
    const actor = { accountId: "teacher", role: "teacher" as const };
    const location = { scope: "class" as const, scopeId: "class" };
    const first = await library.list(actor, location);
    assert.equal(writes, 1);
    assert.ok(first.every((entry) => entry.canEdit && entry.canDelete));
    writable = false;
    const second = await library.list(actor, location);
    assert.equal(writes, 2);
    assert.ok(second.every((entry) => !entry.canEdit && !entry.canDelete));
});

test("reverse traces use current availability and return permission-enriched cards", async () => {
    let enabled = true;
    const active = { ...mockCharacter("active", "a"), layer: "words" };
    const disabled = { ...active, id: "disabled", schemaId: "disabled-schema" };
    const privateCard = {
        ...active,
        id: "private",
        scope: "user" as const,
        scopeId: "other",
    };
    const visible = { ...active, id: "visible" };
    const entries = [active, disabled, privateCard, visible];
    const library = new LibraryService(
        {
            async saveSchema() {},
            async get(id: string) {
                return entries.find((entry) => entry.id === id) ?? null;
            },
            async referencesFor() {
                return [disabled, privateCard, visible];
            },
        } as never,
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
        (schema) => schema.id !== "disabled-schema" || enabled,
    );
    await library.registerSchema(mockLanguageSchema);
    await library.registerSchema({
        ...mockLanguageSchema,
        id: "disabled-schema",
        namespace: "disabled",
    });
    const actor = { accountId: "admin", role: "admin" as const };
    enabled = false;
    const trace = await library.trace(actor, active.id);
    assert.deepEqual(
        trace.usedBy.map((entry) => entry.id),
        [visible.id],
    );
    assert.equal(trace.usedBy[0].canEdit, true);
    enabled = true;
    assert.deepEqual(
        (await library.trace(actor, active.id)).usedBy.map((entry) => entry.id),
        [disabled.id, visible.id],
    );
});
