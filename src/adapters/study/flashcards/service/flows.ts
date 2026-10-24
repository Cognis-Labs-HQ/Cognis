import type { Ctx } from "@cognis/core";

/** Register the adapter-owned action stages through the application ctx. */
export function registerDeckFlows(
    ctx: Pick<Ctx, "hasFlow" | "registerFlow">,
): void {
    for (const [id, stages] of Object.entries({
        list: ["authorize", "read", "audit"],
        details: ["authorize", "read", "audit"],
        save: ["authorize", "validate", "persist", "audit"],
        review: ["authorize", "validate", "persist", "audit"],
        recordResult: ["deliver"],
        delete: ["authorize", "persist", "audit"],
    }))
        if (!ctx.hasFlow(`study:decks:${id}`))
            ctx.registerFlow({ id: `study:decks:${id}`, stages });
}
