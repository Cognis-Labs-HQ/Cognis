import { executeReferences } from "./reference-storage.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

/** Keep omitted provider dependencies reachable from authored or modified cards. */
export async function retainedPackEntries(
    db: DbExecutor,
    previous: ReadonlySet<string>,
    imported: ReadonlySet<string>,
    modified: ReadonlySet<string>,
): Promise<Set<string>> {
    const omitted = [...previous].filter(
        (id) => !imported.has(id) && !modified.has(id),
    );
    const retained = new Set(modified);
    if (!omitted.length) return retained;
    const dependencies = new Map<string, string[]>();
    const roots = new Set(modified);
    for (let offset = 0; offset < omitted.length; offset += 500) {
        const result = await executeReferences(db, {
            option: "SELECT",
            columns: ["source_entry_id", "target_entry_id"],
            where: [
                {
                    column: "target_entry_id",
                    operator: "IN",
                    value: omitted.slice(offset, offset + 500),
                },
            ],
        });
        for (const row of result.rows ?? []) {
            const source = String(row.source_entry_id);
            const target = String(row.target_entry_id);
            const targets = dependencies.get(source) ?? [];
            targets.push(target);
            dependencies.set(source, targets);
            if (!previous.has(source)) roots.add(source);
        }
    }
    const queue = [...roots];
    while (queue.length) {
        for (const target of dependencies.get(queue.pop()!) ?? []) {
            if (retained.has(target)) continue;
            retained.add(target);
            queue.push(target);
        }
    }
    return retained;
}
