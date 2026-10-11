import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(
    new URL("../ui/app/data.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");
test("relocated cards stay ordinary across private/shared oscillation while genuinely new cards are marked", async () => {
    const entries = [
        { id: "fresh" },
        { id: "viewed" },
        { id: "moved", relocatedAt: "2026-10-11T00:00:00Z" },
    ];
    const context = {
        fetchLibrarySchemas: async () => [{ id: "schema" }],
        fetchLibraryLocations: async () => ({
            readable: [{ scope: "global" }],
        }),
        fetchLibraryEntries: async () => entries,
        fetchViewedLibraryEntryIds: async () => ["viewed"],
        showToast: () => {
            throw new Error("unexpected failure");
        },
    };
    vm.runInNewContext(source, context);
    for (const scope of ["global", "user", "global", "user", "global"]) {
        entries[2].scope = scope;
        const result = await context.loadLibrary("ja", { t: String });
        assert.equal(result.entries[0].isNew, true);
        assert.equal(result.entries[1].isNew, false);
        assert.equal(result.entries[2].isNew, false);
    }
});
