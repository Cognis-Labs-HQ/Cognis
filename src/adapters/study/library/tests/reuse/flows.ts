import { createCtx, type FlowApi } from "@cognis/core";

/** Real ctx execution for service tests, including per-run owner implementations. */
export function createLibraryFlow(onRun?: (id: string) => void): FlowApi {
    const ctx = createCtx();
    for (const [name, stages] of Object.entries({
        notifyRequest: ["deliver"],
        notifyContent: ["deliver"],
        uploadImage: ["authorize", "validate", "persist"],
        discardImage: ["authorize", "discard"],
        readImage: ["authorize"],
        stageRequest: ["authorize", "persist"],
        audio: ["authorize", "validate", "resolve"],
        uploadAudio: ["authorize", "validate", "persist"],
        regenerateAudio: ["authorize", "validate", "resolve", "persist"],
        import: ["authorize", "validate", "persist"],
        create: ["normalize", "resolve", "validate", "persist"],
        update: ["authorize", "validate", "persist", "audit"],
        resolve: ["normalize", "propose", "rank"],
        lookup: ["discover", "lookup", "rank"],
        search: ["authorize", "validate", "search", "audit"],
        ingest: ["inspect", "validate", "stage", "persist", "audit"],
        merge: ["authorize", "validate", "merge", "audit"],
        move: ["authorize", "validate", "move", "audit"],
        delete: ["authorize", "validate", "delete", "audit"],
    }))
        ctx.registerFlow({ id: `study:library:${name}`, stages });
    return {
        ...ctx.flow,
        run: (id, input, options) => {
            onRun?.(id);
            return ctx.flow.run(id, input, options);
        },
    };
}
