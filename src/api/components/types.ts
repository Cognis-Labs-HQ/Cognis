import type { IncomingMessage } from "node:http";
export type ComponentType = "module" | "gateway" | "adapter";
export interface ComponentTarget {
    type: ComponentType;
    id: string;
    gatewayId?: string;
}
export interface ComponentInfo extends ComponentTarget {
    uuid?: string;
    version?: string;
    name?: string;
    status?: string;
    enabled?: boolean;
    required?: boolean;
    critical?: boolean;
    locked?: boolean;
    class?: string;
    controls?: Record<string, string>;
    managedBy: "host" | "marketplace";
    [key: string]: unknown;
}
export interface ComponentOwner extends ComponentTarget {
    required: boolean;
    critical: boolean;
    version?: string;
}
export interface ProviderDescriptor {
    scriptUrl: string;
    ownerId?: string;
    offlineAccessGuard?: string;
    component?: ComponentOwner;
}
export type ComponentRequest = IncomingMessage;
export function componentKey(target: ComponentTarget): string {
    return JSON.stringify([target.type, target.gatewayId ?? "", target.id]);
}
export function componentPath(target: ComponentTarget): string {
    const id = encodeURIComponent(target.id);
    return target.type === "module"
        ? `/api/v1/modules/${id}`
        : target.type === "gateway"
          ? `/api/v1/gateways/${id}`
          : `/api/v1/gateways/${encodeURIComponent(target.gatewayId!)}/adapters/${id}`;
}
export function validateTarget(input: unknown): ComponentTarget {
    const target = input as ComponentTarget;
    if (
        !target ||
        !["module", "gateway", "adapter"].includes(target.type) ||
        typeof target.id !== "string" ||
        !/^[a-z][a-z0-9-]{0,100}$/.test(target.id) ||
        (target.type === "adapter" &&
            !/^[a-z][a-z0-9-]{0,100}$/.test(target.gatewayId ?? ""))
    )
        throw Object.assign(new Error("invalid_component_target"), {
            status: 400,
        });
    return {
        type: target.type,
        id: target.id,
        ...(target.type === "adapter" ? { gatewayId: target.gatewayId } : {}),
    };
}
