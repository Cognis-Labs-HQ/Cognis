import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";

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
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/app/data.js", import.meta.url),
            {
                "/static/gateways/study/offline-content.js": {
                    isOfflineContentMiss: () => false,
                    readStudySnapshot: (load) => load(),
                    showOfflineContentNotice: () =>
                        assert.fail("not an offline test"),
                },
                "/static/reuse/toast.js": context,
                "/static/gateways/study/library-client.js": context,
            },
            context,
        ),
    );
    for (const scope of ["global", "user", "global", "user", "global"]) {
        entries[2].scope = scope;
        const result = await context.loadLibrary("ja", { t: String });
        assert.equal(result.entries[0].isNew, true);
        assert.equal(result.entries[1].isNew, false);
        assert.equal(result.entries[2].isNew, false);
    }
});
