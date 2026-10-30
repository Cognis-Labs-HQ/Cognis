import type { BootstrapLog } from "@cognis/core";

export async function disposeModuleResources(
    disposers: Array<(() => void | Promise<void>) | undefined>,
    moduleId: string,
    log?: BootstrapLog,
): Promise<void> {
    for (const dispose of disposers.toReversed()) {
        try {
            await dispose?.();
        } catch (error) {
            log?.("error", "Module resource cleanup failed.", {
                component: "module-extension-routes",
                operation: "dispose_module_resources",
                moduleId,
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
        }
    }
}

export function removeModuleRoutes<T extends { moduleId: string }>(
    handlers: T[],
    moduleId: string,
): void {
    for (let index = handlers.length - 1; index >= 0; index -= 1) {
        if (handlers[index].moduleId === moduleId) handlers.splice(index, 1);
    }
}
