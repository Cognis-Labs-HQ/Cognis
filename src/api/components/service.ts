import { orderComponents, requiredConsumer } from "./ordering.js";
import type { Ctx, BootstrapLog } from "@cognis/core";
import type { IncomingMessage } from "node:http";
import type { ComponentTransport, ComponentResponse } from "./transport.js";
import {
    componentKey,
    componentPath,
    validateTarget,
    type ComponentTarget,
    type ComponentInfo,
} from "./types.js";
import type { createComponentState } from "./state.js";

export function checked(response: ComponentResponse): unknown {
    if (response.status >= 400)
        throw Object.assign(
            new Error(response.error?.code ?? "component_operation_failed"),
            {
                code: response.error?.code ?? "component_operation_failed",
                status: response.status,
            },
        );
    return response.data;
}
export type ComponentProgress = (event: Record<string, unknown>) => void;
export type ComponentOperation = (
    request: IncomingMessage,
    input?: Record<string, unknown>,
    options?: { onProgress?: ComponentProgress },
) => Promise<unknown>;
export interface ComponentService {
    list: ComponentOperation;
    info: ComponentOperation;
    releaseChannels: ComponentOperation;
    releaseChannel: ComponentOperation;
    apply: ComponentOperation;
    dispose(): void;
}
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
        "critical",
        "locked",
        "class",
        "controls",
        "hasAdapters",
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
        Object.entries(entry).filter(([key]) => allowed.has(key)),
    );
}

export function createComponentService(
    ctx: Ctx,
    transport: ComponentTransport,
    state: ReturnType<typeof createComponentState>,
    log: BootstrapLog,
    hostModules?: () => Promise<ComponentInfo[]>,
): ComponentService {
    const locks = new Map<string, Promise<unknown>>();
    const flows = new Set<string>();
    function action(
        name: string,
        execute: (
            request: IncomingMessage,
            input: Record<string, unknown>,
            progress?: ComponentProgress,
        ) => Promise<unknown>,
    ) {
        const id = `component:${name}`;
        if (!ctx.hasFlow(id)) {
            ctx.registerFlow({ id, stages: ["validate", "execute", "after"] });
            flows.add(id);
        }
        return async (
            request: IncomingMessage,
            input: Record<string, unknown> = {},
            options?: { onProgress?: ComponentProgress },
        ): Promise<unknown> => {
            const result = await ctx.runFlow(id, input, {
                handlers: {
                    execute: async (stage) => {
                        stage.data.result = await execute(
                            request,
                            input,
                            options?.onProgress,
                        );
                    },
                    after: () =>
                        log("info", "Component operation completed.", {
                            component: "api",
                            operation: id,
                        }),
                },
            });
            return result.data.result;
        };
    }
    const list = action("list", async (request) => {
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
                        type: "adapter",
                        gatewayId: gateway.id,
                        managedBy: "host",
                    }),
                );
            }),
        );
        return [
            ...moduleRows.map((entry) => ({
                ...publicMetadata(entry),
                type: "module",
                managedBy: entry.class === "core" ? "host" : "marketplace",
                required: entry.required === true || entry.class === "core",
            })),
            ...gatewayRows.map((entry) => ({
                ...publicMetadata(entry),
                type: "gateway",
                managedBy: "host",
            })),
            ...adapters.flat(),
        ];
    });
    async function resolve(
        request: IncomingMessage,
        input: unknown,
    ): Promise<ComponentInfo> {
        const target = validateTarget(input);
        const item = ((await list(request)) as ComponentInfo[]).find(
            (entry) => componentKey(entry) === componentKey(target),
        );
        if (!item)
            throw Object.assign(new Error("component_not_found"), {
                status: 404,
            });
        return item;
    }
    async function catalog(request: IncomingMessage, item: ComponentInfo) {
        if (item.managedBy !== "marketplace")
            throw Object.assign(new Error("component_managed_by_host"), {
                status: 409,
            });
        const entries = checked(
            await transport(request, "/api/v1/modules/catalog"),
        ) as ComponentInfo[];
        const entry = entries.find((candidate) => candidate.uuid === item.uuid);
        if (!entry)
            throw Object.assign(new Error("component_source_unavailable"), {
                status: 409,
            });
        return entry;
    }
    async function channels(
        request: IncomingMessage,
        item: ComponentInfo,
    ): Promise<string[]> {
        const entry = await catalog(request, item);
        return [
            ...new Set(
                [
                    ...((entry.branches as Array<{ name: string }>) ?? []),
                    ...((entry.releases as Array<{ name: string }>) ?? []),
                ].map((choice) => choice.name),
            ),
        ];
    }
    const info = action("info", async (request, input) => {
        const item = await resolve(request, input.target);
        return {
            ...item,
            releaseChannel:
                (await state.get(componentKey(item))) ??
                item.installedBranch ??
                null,
            independentlyUpgradeable: item.managedBy === "marketplace",
        };
    });
    const releaseChannels = action(
        "releaseChannels",
        async (request, input) => ({
            data:
                (await resolve(request, input.target)).managedBy === "host"
                    ? []
                    : await channels(
                          request,
                          await resolve(request, input.target),
                      ),
        }),
    );
    const releaseChannel = action("releaseChannel", async (request, input) => {
        const item = await resolve(request, input.target);
        if (item.managedBy === "host") {
            if (input.channel !== undefined)
                throw Object.assign(new Error("component_managed_by_host"), {
                    status: 409,
                });
            return { channel: null, managedBy: "host" };
        }
        const choices = await channels(request, item);
        if (input.channel !== undefined) {
            if (
                typeof input.channel !== "string" ||
                !choices.includes(input.channel)
            )
                throw Object.assign(new Error("invalid_component_channel"), {
                    status: 400,
                });
            await state.set(componentKey(item), input.channel);
        }
        return {
            channel:
                (await state.get(componentKey(item))) ??
                item.installedBranch ??
                (await catalog(request, item)).defaultBranch ??
                null,
        };
    });
    async function mutate(
        request: IncomingMessage,
        item: ComponentInfo,
        operation: string,
        acknowledge: boolean,
        progress?: ComponentProgress,
    ) {
        if (
            operation === "disable" &&
            (item.required ||
                item.critical ||
                item.class === "core" ||
                item.locked)
        )
            throw Object.assign(new Error("component_protected"), {
                status: 409,
            });
        if (operation === "enable" && item.locked)
            throw Object.assign(new Error("component_protected"), {
                status: 409,
            });
        if (
            operation === "enable" &&
            (item.status === "enabled" ||
                item.status === "active" ||
                item.enabled === true)
        )
            return { unchanged: true };
        if (operation !== "upgrade") {
            const endpoint =
                item.type === "adapter"
                    ? item.controls?.[operation]
                    : `${componentPath(item)}/${operation}`;
            if (
                !endpoint ||
                !endpoint.startsWith(componentPath(item) + "/") ||
                new URL(endpoint, "http://component.internal").pathname !==
                    endpoint ||
                /[?#]/.test(endpoint)
            )
                throw Object.assign(
                    new Error("component_operation_unavailable"),
                    { status: 409 },
                );
            const response = await transport(
                request,
                endpoint,
                "POST",
                undefined,
                acknowledge
                    ? { "x-cognis-external-module-disclaimer": "accepted" }
                    : {},
            );
            const data = checked(response) as Record<string, unknown>;
            if (
                item.type === "module" &&
                data?.enabled !== (operation === "enable")
            )
                throw Object.assign(
                    new Error("component_acknowledgement_failed"),
                    { status: 409 },
                );
            return data;
        }
        if (item.required || item.critical || item.class === "core")
            throw Object.assign(new Error("component_protected"), {
                status: 409,
            });
        const entry = await catalog(request, item);
        const choice =
            (await state.get(componentKey(item))) ??
            item.installedBranch ??
            entry.defaultBranch;
        if (
            typeof choice !== "string" ||
            !(await channels(request, item)).includes(choice)
        )
            throw Object.assign(new Error("invalid_component_channel"), {
                status: 409,
            });
        const wasEnabled = item.status === "enabled" || item.enabled === true;
        if (wasEnabled) {
            progress?.({ phase: "disabling" });
            checked(
                await transport(
                    request,
                    `${componentPath(item)}/disable`,
                    "POST",
                    undefined,
                    { "x-cognis-module-lifecycle": "temporary-update" },
                ),
            );
        }
        let installationStarted = false;
        try {
            progress?.({ phase: "installing", channel: choice });
            const started = checked(
                await transport(request, "/api/v1/modules/install", "POST", {
                    module: entry,
                    branch: choice,
                    wasEnabled,
                }),
            ) as { jobId: string };
            installationStarted = true;
            const began = Date.now();
            const deadline = began + 300_000;
            let lastProgress = 0;
            while (Date.now() < deadline) {
                const result = await transport(
                    request,
                    `/api/v1/modules/install/${encodeURIComponent(started.jobId)}`,
                );
                const payload = checked(result) as Record<string, unknown>;
                if (payload.status === "succeeded")
                    return {
                        ...(payload.data as Record<string, unknown>),
                        wasEnabled,
                        restartRequired:
                            wasEnabled ||
                            (payload.data as Record<string, unknown>)
                                ?.restartRequired === true,
                    };
                if (Date.now() - lastProgress >= 5_000) {
                    progress?.({
                        phase: "waiting",
                        elapsedSeconds: Math.floor((Date.now() - began) / 1000),
                    });
                    lastProgress = Date.now();
                }
                await new Promise((accept) => setTimeout(accept, 250));
            }
            throw Object.assign(new Error("component_upgrade_timeout"), {
                status: 504,
            });
        } catch (error) {
            if (
                wasEnabled &&
                (!installationStarted ||
                    (error as { status?: number }).status === 422)
            ) {
                try {
                    progress?.({ phase: "restoring" });
                    checked(
                        await transport(
                            request,
                            `${componentPath(item)}/enable`,
                            "POST",
                        ),
                    );
                } catch (restoreError) {
                    log(
                        "error",
                        "Component upgrade recovery left the component disabled.",
                        {
                            component: "api",
                            operation: "restoreComponent",
                            componentId: item.id,
                            errorName:
                                restoreError instanceof Error
                                    ? restoreError.name
                                    : "UnknownError",
                        },
                    );
                }
            }
            throw error;
        }
    }
    const apply = action("apply", async (request, input, progress) => {
        progress?.({ phase: "preparing" });
        if (
            (input.all !== undefined && typeof input.all !== "boolean") ||
            (input.all && input.target) ||
            (input.type &&
                !["module", "gateway", "adapter"].includes(
                    String(input.type),
                )) ||
            (input.gatewayId &&
                !/^[a-z][a-z0-9-]{0,100}$/.test(String(input.gatewayId)))
        )
            throw Object.assign(new Error("invalid_component_selection"), {
                status: 400,
            });
        if (!["enable", "disable", "upgrade"].includes(String(input.action)))
            throw Object.assign(new Error("invalid_component_action"), {
                status: 400,
            });
        const entries = (await list(request)) as ComponentInfo[];
        const targets =
            input.all === true
                ? entries.filter(
                      (item) =>
                          (!input.type || item.type === input.type) &&
                          (!input.gatewayId ||
                              item.gatewayId === input.gatewayId),
                  )
                : [await resolve(request, input.target)];
        const results = [];
        for (const item of orderComponents(
            targets,
            input.action === "disable",
        )) {
            const key = componentKey(item);
            const target = {
                type: item.type,
                id: item.id,
                gatewayId: item.gatewayId,
            };
            const emit: ComponentProgress = (event) =>
                progress?.({ ...event, target, action: input.action });
            emit({ phase: locks.has(key) ? "queued" : "starting" });
            const prior = locks.get(key) ?? Promise.resolve();
            const next = prior
                .catch((error) => {
                    log("error", "Earlier component operation failed.", {
                        component: "api",
                        operation: "serializeComponent",
                        errorName:
                            error instanceof Error
                                ? error.name
                                : "UnknownError",
                    });
                })
                .then(() =>
                    (input.action === "disable" ||
                        input.action === "upgrade") &&
                    requiredConsumer(item, entries)
                        ? Promise.reject(
                              Object.assign(
                                  new Error("component_required_dependency"),
                                  { status: 409 },
                              ),
                          )
                        : mutate(
                              request,
                              item,
                              String(input.action),
                              input.acknowledge === true,
                              emit,
                          ),
                );
            locks.set(key, next);
            try {
                results.push({
                    target: {
                        type: item.type,
                        id: item.id,
                        gatewayId: item.gatewayId,
                    },
                    status: "succeeded",
                    data: await next,
                });
            } catch (error) {
                const code =
                    error instanceof Error &&
                    /^[a-z][a-z0-9_]{0,100}$/.test(error.message)
                        ? error.message
                        : "component_operation_failed";
                log("error", "Component operation failed.", {
                    component: "api",
                    operation: String(input.action),
                    componentId: item.id,
                    componentType: item.type,
                    code,
                });
                results.push({
                    target: {
                        type: item.type,
                        id: item.id,
                        gatewayId: item.gatewayId,
                    },
                    status:
                        input.all === true &&
                        [
                            "component_protected",
                            "component_managed_by_host",
                            "component_required_dependency",
                        ].includes(code)
                            ? "skipped"
                            : "failed",
                    code,
                });
            } finally {
                const result = results.at(-1)!;
                emit({
                    phase: result.status,
                    code: "code" in result ? result.code : undefined,
                });
                if (locks.get(key) === next) locks.delete(key);
            }
        }
        return { results };
    });
    return {
        list,
        info,
        releaseChannels,
        releaseChannel,
        apply,
        dispose: () => {
            for (const id of flows) ctx.unregisterFlow(id);
            flows.clear();
        },
    };
}
