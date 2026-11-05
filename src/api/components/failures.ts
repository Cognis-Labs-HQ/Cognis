import type { BootstrapLog, Ctx } from "@cognis/core";
import type { IncomingMessage } from "node:http";
import {
    componentKey,
    type ProviderDescriptor,
    type ComponentTarget,
} from "./types.js";
import type { ComponentService } from "./service.js";

const WINDOW_MS = 5 * 60_000;
const THRESHOLD = 3;
const MAX_COMPONENTS = 2048;
interface FailureRecord {
    started: number;
    occurrences: Set<string>;
    disabling?: Promise<unknown>;
    disabled?: boolean;
}

export type ComponentFailureReporter = (
    request: IncomingMessage,
    input: Record<string, unknown>,
    canDisable: boolean,
    trustedOwner?: NonNullable<ProviderDescriptor["component"]>,
) => Promise<unknown>;

export function createComponentFailures(
    ctx: Ctx,
    service: ComponentService,
    providers: () => ProviderDescriptor[] | Promise<ProviderDescriptor[]>,
    log: BootstrapLog,
    now = Date.now,
): ComponentFailureReporter {
    const records = new Map<string, FailureRecord>();
    if (!ctx.hasFlow("component:reportFailure"))
        ctx.registerFlow({
            id: "component:reportFailure",
            stages: ["validate", "record", "recover", "after"],
        });
    return async (
        request: IncomingMessage,
        input: Record<string, unknown>,
        canDisable: boolean,
        trustedOwner?: NonNullable<ProviderDescriptor["component"]>,
    ) => {
        const result = await ctx.runFlow("component:reportFailure", input, {
            handlers: {
                validate: async (stage) => {
                    if (trustedOwner) {
                        stage.data.owner = trustedOwner;
                        return;
                    }
                    if (
                        typeof input.scriptUrl !== "string" ||
                        !input.scriptUrl.startsWith("/") ||
                        input.scriptUrl.length > 2048 ||
                        typeof input.occurrenceId !== "string" ||
                        !/^[a-f0-9-]{36}$/.test(input.occurrenceId) ||
                        !["import", "mount", "runtime"].includes(
                            String(input.phase),
                        )
                    )
                        throw Object.assign(
                            new Error("invalid_component_failure"),
                            { status: 400 },
                        );
                    const path = input.scriptUrl.split(/[?#]/)[0];
                    const provider = (await providers()).find(
                        (entry) => entry.scriptUrl.split(/[?#]/)[0] === path,
                    );
                    if (!provider?.component)
                        throw Object.assign(
                            new Error("component_provider_not_found"),
                            { status: 404 },
                        );
                    stage.data.owner = provider.component;
                },
                record: (stage) => {
                    const owner = stage.data.owner as NonNullable<
                        ProviderDescriptor["component"]
                    >;
                    const key =
                        componentKey(owner) + ":" + (owner.version ?? "");
                    for (const [id, record] of records)
                        if (now() - record.started > WINDOW_MS)
                            records.delete(id);
                    let record = records.get(key);
                    if (!record) {
                        if (records.size >= MAX_COMPONENTS)
                            records.delete(records.keys().next().value!);
                        record = { started: now(), occurrences: new Set() };
                        records.set(key, record);
                    }
                    if (canDisable && record.occurrences.size < THRESHOLD)
                        record.occurrences.add(input.occurrenceId as string);
                    stage.data.record = record;
                    log("error", "Component provider failed.", {
                        component: "api",
                        operation: "component:reportFailure",
                        componentType: owner.type,
                        componentId: owner.id,
                        gatewayId: owner.gatewayId,
                        phase: input.phase,
                        failures: record.occurrences.size,
                        required: owner.required,
                    });
                },
                recover: async (stage) => {
                    const owner = stage.data.owner as NonNullable<
                        ProviderDescriptor["component"]
                    >;
                    const record = stage.data.record as FailureRecord;
                    if (
                        canDisable &&
                        !owner.required &&
                        record.occurrences.size >= THRESHOLD &&
                        !record.disabled
                    ) {
                        record.disabling ??= service
                            .apply(request, {
                                action: "disable",
                                target: owner,
                            })
                            .finally(() => {
                                record.disabling = undefined;
                            });
                        const response = (await record.disabling) as {
                            results: Array<{ status: string }>;
                        };
                        record.disabled =
                            response.results[0]?.status === "succeeded";
                    }
                    stage.data.result = {
                        target: owner as ComponentTarget,
                        failures: record.occurrences.size,
                        threshold: THRESHOLD,
                        disabled: record.disabled === true,
                        protected: owner.required,
                    };
                },
            },
        });
        return result.data.result;
    };
}
