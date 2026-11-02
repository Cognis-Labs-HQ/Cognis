import {
    createCtx,
    runBootstrapScope,
    type CapabilityStore,
    type Ctx,
} from "@cognis/core";
import { bootstrap } from "../bootstrap.js";

export function createCalendarHostFlow(capabilities: CapabilityStore) {
    const root = capabilities.get<Ctx>("system:ctx") ?? createCtx();
    capabilities.contribute("system:ctx", root);
    return root.flow;
}

export async function bootstrapTestCalendar(
    input: Parameters<typeof bootstrap>[0],
) {
    const root = input.capabilities.require<Ctx>("system:ctx");
    return runBootstrapScope(root, "gateway:calendar", () => bootstrap(input));
}
