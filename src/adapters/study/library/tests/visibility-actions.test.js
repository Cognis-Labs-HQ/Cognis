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

const selectionPolicy = {};
vm.runInNewContext(
    readFileSync(new URL("../ui/app/selection.js", import.meta.url), "utf8")
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, ""),
    selectionPolicy,
);

test("private relocation confirms once and queues requests without changing shared cards", async () => {
    const entries = [
        { id: "shared", label: "Shared", scope: "global", canDelete: true },
    ];
    const requests = [];
    let confirmations = 0;
    let toasts = 0;
    const context = {
        relocationState: selectionPolicy.relocationState,
        updateSelectionActions() {},
        selectedEntryIds: () => ["shared"],
        moveLibraryEntryToPersonal: async () => ({
            id: "request",
            sourceEntryId: "shared",
            status: "pending",
        }),
        openPopup: async () => {
            confirmations += 1;
            return "request";
        },
        escapeHtml: (value) => value,
        setSelectionMode() {},
        showToast: () => {
            toasts += 1;
        },
    };
    vm.runInNewContext(source, context);
    const actions = context.createLibraryVisibilityActions({
        root: { querySelectorAll: () => [] },
        getEntries: () => entries,
        setEntries: () =>
            assert.fail("Pending requests must retain the shared card"),
        requests,
        getLocations: () => ({}),
        i18n: { t: (key) => key },
        render: () => assert.fail("Pending relocation must not change cards"),
    });
    await actions.moveToUser();
    assert.equal(confirmations, 1);
    assert.equal(toasts, 1);
    assert.equal(requests[0].status, "pending");
    assert.equal(entries[0].scope, "global");
});
