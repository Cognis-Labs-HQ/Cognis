import { bindOfflineSnapshotRefresh } from "/static/reuse/offline-snapshot.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { fetchStudyPreferences } from "../navigation-client.js";

/** Prepare enrolled lightweight collections through the owning scoped read flows. @returns {void} */
export function registerEnrolledLibrarySnapshots(ctx, actions) {
    const read = (name, ...args) => actions[name]({ args, signal: ctx.signal });
    bindOfflineSnapshotRefresh(ctx, {
        id: "study:prepareEnrolledLibrary",
        events: ["cognis:study-enrollment-changed"],
        refresh: async () => {
            const assertAccount = captureAccountGuard();
            const prefs = await fetchStudyPreferences({ signal: ctx.signal });
            const codes = [
                ...new Set([
                    ...(prefs.learningLanguages ?? []),
                    ...(prefs.teachingLanguages ?? []),
                ]),
            ];
            if (!codes.length) return;
            const access = await read("fetchLibraryLocations");
            await Promise.all([
                read("fetchLibraryForms"),
                read("fetchViewedLibraryEntryIds"),
            ]);
            let next = 0;
            await Promise.all(
                Array.from({ length: Math.min(2, codes.length) }, async () => {
                    while (next < codes.length && !isOffline()) {
                        ctx.signal.throwIfAborted();
                        assertAccount();
                        const code = codes[next++];
                        const schemas = await read("fetchLibrarySchemas", code);
                        for (const schema of schemas) {
                            if (
                                schema.metadata?.offline?.cache !==
                                "lightweight"
                            )
                                continue;
                            for (const location of access.readable) {
                                ctx.signal.throwIfAborted();
                                assertAccount();
                                if (isOffline()) return;
                                await read("fetchLibraryEntries", {
                                    ...location,
                                    schemaId: schema.id,
                                });
                            }
                        }
                    }
                }),
            );
        },
    });
}
