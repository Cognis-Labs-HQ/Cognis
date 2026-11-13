import type { IncomingMessage } from "node:http";
import type { BootstrapLog } from "@cognis/core";
import { checked, type ComponentTransport } from "./transport.js";
import type { ComponentInfo } from "./types.js";

function publicMetadata(
    entry: Record<string, unknown>,
): Record<string, unknown> {
    const allowed = new Set([
        "id",
        "uuid",
        "name",
        "version",
        "status",
        "enabled",
        "active",
        "required",
        "locked",
        "class",
        "controls",
        "hasAdapters",
        "adapterCatalogError",
        "requires",
        "hardDependencies",
        "capabilities",
        "installedBranch",
        "installedCommit",
        "restartRequired",
        "description",
        "publisher",
    ]);
    return Object.fromEntries(
        Object.entries(entry).filter(
            ([key, value]) => allowed.has(key) && value !== undefined,
        ),
    );
}

/** Adapter discovery failures remain visible on their gateway without blocking unrelated management. */
export async function loadComponentInventory(
    transport: ComponentTransport,
    request: IncomingMessage,
    log: BootstrapLog,
    hostModules?: () => Promise<ComponentInfo[]>,
): Promise<ComponentInfo[]> {
    const [modules, gateways] = await Promise.all([
        transport(request, "/api/v1/modules"),
        transport(request, "/api/v1/gateways"),
    ]);
    const moduleRows = [
        ...(checked(modules) as ComponentInfo[]),
        ...((await hostModules?.()) ?? []),
    ];
    const gatewayRows = checked(gateways) as ComponentInfo[];
    const adapters = await Promise.all(
        gatewayRows.map(async (gateway) => {
            if (!gateway.hasAdapters) return [];
            try {
                const response = await transport(
                    request,
                    `/api/v1/gateways/${encodeURIComponent(gateway.id)}/adapters`,
                );
                return (checked(response) as ComponentInfo[]).map(
                    (adapter) => ({
                        ...publicMetadata(adapter),
                        id: String(
                            adapter.adapterId ?? adapter.senderId ?? adapter.id,
                        ),
                        status:
                            typeof adapter.enabled === "boolean"
                                ? adapter.enabled
                                    ? "enabled"
                                    : "disabled"
                                : typeof adapter.status === "string"
                                  ? adapter.status
                                  : typeof adapter.active === "boolean"
                                    ? adapter.active
                                        ? "enabled"
                                        : "inactive"
                                    : undefined,
                        type: "adapter" as const,
                        gatewayId: gateway.id,
                        managedBy: "host" as const,
                    }),
                );
            } catch (error) {
                const status = Number((error as { status?: number })?.status);
                if (status === 401 || status === 403) throw error;
                gateway.adapterCatalogError =
                    "component_adapter_catalog_failed";
                log("error", "Adapter catalog unavailable.", {
                    component: "api",
                    operation: "component:list",
                    gatewayId: gateway.id,
                    status: status || 500,
                });
                return [];
            }
        }),
    );
    return [
        ...moduleRows.map((entry) => ({
            ...publicMetadata({ ...entry, locked: undefined }),
            type: "module" as const,
            managedBy:
                entry.class === "core"
                    ? ("host" as const)
                    : ("marketplace" as const),
            required: entry.class === "core",
        })),
        ...gatewayRows.map((entry) => ({
            ...publicMetadata(entry),
            type: "gateway" as const,
            managedBy: "host" as const,
        })),
        ...adapters.flat(),
    ];
}
