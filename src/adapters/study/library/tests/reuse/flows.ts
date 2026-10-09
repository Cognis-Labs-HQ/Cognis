import { createCtx, type FlowApi } from "@cognis/core";

/** Real ctx execution for service tests, including per-run owner implementations. */
export function createLibraryFlow(onRun?: (id: string) => void): FlowApi {
    const ctx = createCtx();
    for (const [name, stages] of Object.entries({
        create: ["normalize", "resolve", "validate", "persist"],
        update: ["authorize", "validate", "persist", "audit"],
        resolve: ["normalize", "propose", "rank"],
        lookup: ["discover", "lookup", "rank"],
        search: ["authorize", "validate", "search", "audit"],
        ingest: ["inspect", "validate", "stage", "persist", "audit"],
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
