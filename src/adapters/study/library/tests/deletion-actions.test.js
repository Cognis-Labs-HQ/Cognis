import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(
    new URL("../ui/app/deletion-actions.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");
test("one confirmation and one API call cover repeated batch-delete clicks", async () => {
    let confirm;
    let confirmations = 0;
    let deletions = 0;
    let updated;
    const button = { disabled: false, isConnected: true };
    const context = {
        confirmEntryDeletion: () => {
            confirmations += 1;
            return new Promise((resolve) => {
                confirm = resolve;
            });
        },
        deleteLibraryEntries: async (ids) => {
            deletions += 1;
            assert.deepEqual(ids, ["a", "b"]);
            return { entryIds: ids };
        },
        setSelectionMode() {},
        showToast() {},
        deletionErrorKey: () => "error",
    };
    vm.runInNewContext(source, context);
    const input = {
        root: { querySelector: () => button },
        entries: [{ id: "a" }, { id: "b" }],
        schemas: [],
        i18n: { t: (key) => key },
        onDeleted: (entries) => {
            updated = entries;
        },
    };
    const first = context.deleteLibrarySelection(input);
    await context.deleteLibrarySelection(input);
    assert.equal(confirmations, 1);
    assert.equal(button.disabled, true);
    confirm({ entryIds: ["a", "b"], blacklistContentHashes: false });
    await first;
    assert.equal(deletions, 1);
    assert.equal(updated.length, 0);
    assert.equal(button.disabled, false);
});
