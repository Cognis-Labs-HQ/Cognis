import type { FlowApi } from "@cognis/core";
import type { BootstrapLog } from "../../../../gateways/shared.js";
import type { LibraryStore } from "../store.js";
import type { LibraryAudioCache } from "../audio-cache.js";
import type { LibraryContentNotifier } from "../contracts.js";
import type { LibrarySchema, LibraryContentPackReceipt } from "../types.js";
import { inspectContentPack } from "../content-pack.js";
import { storeContentPackAudio } from "./content-audio.js";
import { runOperation } from "../reuse/operation.js";

interface ContentPackOperations {
    store: LibraryStore;
    flow?: FlowApi;
    log?: BootstrapLog;
    audioCache?: LibraryAudioCache;
    notifyNewContent?: LibraryContentNotifier;
    getSchema(id: string, version: number): LibrarySchema | null;
    assertSchemaVersionAvailable(schema: LibrarySchema): void;
    rememberSchema(schema: LibrarySchema): void;
}

/** Ingest provider data through Library's staged, transactional content lifecycle. */
export async function ingestProviderContent(
    root: string,
    options: ContentPackOperations,
): Promise<LibraryContentPackReceipt> {
    try {
        const plan = await inspectContentPack(root);
        const registered = options.getSchema(
            plan.schema.id,
            plan.schema.version,
        );
        if (!registered) {
            options.assertSchemaVersionAvailable(plan.schema);
        }

        let receipt!: LibraryContentPackReceipt;
        await runOperation(
            options.flow,
            "study:library:ingest",
            { plan },
            {
                stage: async () => {
                    await storeContentPackAudio(plan, options.audioCache);
                },
                persist: async () => {
                    receipt = await options.store.ingestContentPack(plan);
                },
            },
        );
        if (receipt.newRecordCount > 0)
            await options.notifyNewContent?.({
                entryCount: receipt.newRecordCount,
                language: plan.schema.language,
            });
        options.rememberSchema(plan.schema);
        await options.log?.("info", "Ingested Study Library content pack.", {
            component: "study-library",
            operation: "ingest-content-pack",
            packId: receipt.packId,
            publisher: receipt.publisher,
            version: receipt.version,
            recordCount: receipt.recordCount,
            unchanged: receipt.unchanged,
        });
        return receipt;
    } catch (error) {
        await options.log?.("error", "Study Library content pack failed.", {
            component: "study-library",
            operation: "ingest-content-pack",
            errorName: error instanceof Error ? error.name : "Error",
        });
        throw error;
    }
}
