import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
    new URL("../ui/app/visibility-actions.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");

test("moving an owned shared card retains the returned user card and updated permissions", async () => {
    for (const owned of [true, false]) {
        const entry = { id: "shared", scope: "global", createdBy: "author" };
        const moved = {
            ...entry,
            scope: "user",
            scopeId: "author",
            canEdit: owned,
            canDelete: owned,
        };
        let entries = [entry];
        let rendered;
        const context = {
            selectedEntryIds: () => [entry.id],
            moveLibraryEntryToPersonal: async (id) => {
                assert.equal(id, entry.id);
                return moved;
            },
            setSelectionMode() {},
            showToast() {
                assert.fail("Move should succeed");
            },
        };
        vm.runInNewContext(source, context);
        const actions = context.createLibraryVisibilityActions({
            root: {},
            getEntries: () => entries,
            setEntries: (value) => {
                entries = value;
            },
            requests: [],
            getLocations: () => ({}),
            i18n: {},
            render: (value) => {
                rendered = value;
            },
        });
        await actions.moveToUser();
        assert.equal(entries.length, owned ? 1 : 0);
        assert.equal(rendered, entries);
        if (owned) assert.equal(entries[0], moved);
    }
});
