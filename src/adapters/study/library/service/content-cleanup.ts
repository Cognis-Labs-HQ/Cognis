import { inspectContentPack } from "../content-pack.js";
import type { LibraryStore } from "../store.js";
import type { FlowApi } from "@cognis/core";
import { runOperation } from "../reuse/operation.js";

/** Provider teardown uses the same transactional deletion flow as Library actions. */
export async function deleteProviderContent(
    root: string,
    store: LibraryStore,
    flow?: FlowApi,
) {
    const { manifest } = await inspectContentPack(root);
    return store.transaction(async () => {
        const entries = await store.contentPackEntries(
            manifest.publisher,
            manifest.id,
        );
        const ids = await store.resolveDeletionCascade(
            entries.map(({ id }) => id),
            undefined,
            true,
        );
        const deleted = await Promise.all(ids.map((id) => store.get(id)));
        await runOperation(
            flow,
            "study:library:delete",
            {
                actor: {
                    accountId: `content-pack:${manifest.publisher}:${manifest.id}`,
                    role: "admin",
                },
                entries: deleted,
                blacklistContentHashes: false,
                providerCleanup: true,
            },
            {
                delete: async () => {
                    if (ids.length)
                        await store.deleteEntries(
                            ids,
                            `content-pack:${manifest.publisher}:${manifest.id}`,
                            false,
                        );
                    await store.forgetContentPack(
                        manifest.publisher,
                        manifest.id,
                    );
                },
            },
        );
        return deleted.filter((entry) => entry !== null);
    });
}
