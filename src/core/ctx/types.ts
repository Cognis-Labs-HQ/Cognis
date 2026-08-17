export interface FlowRegistration {
    id: string;
    description?: string;
    stages: readonly string[];
}

export interface FlowHookRegistration {
    id: string;
    order?: number;
}

export interface FlowStageContext {
    readonly ctx: Ctx;
    readonly flowId: string;
    readonly stageId: string;
    readonly input: unknown;
    readonly meta: Readonly<Record<string, unknown>>;
    readonly data: Record<string, unknown>;
    readonly stageResults: Record<string, unknown[]>;
}

export type FlowStageHook = (
    context: FlowStageContext,
) => unknown | Promise<unknown>;

export interface FlowRunOptions {
    meta?: Record<string, unknown>;
    data?: Record<string, unknown>;
}

export interface FlowRunResult {
    flowId: string;
    data: Record<string, unknown>;
    stageResults: Record<string, unknown[]>;
}

/**
 * Simplified flow API for consuming components. Exposes the three operations
 * most callers need: checking whether a flow exists, injecting a stage hook,
 * and running a flow. Use `ctx.flow` on any bootstrap context to access it.
 *
 * @example Guard-and-inject pattern (idiomatic):
 * ```ts
 * if (ctx.flow.exists("construct-settings-ui")) {
 *     ctx.flow.extend("construct-settings-ui", "resolve-sections", {
 *         id: "my-gateway:settings-section",
 *     }, () => ({ sectionId: "my-section", scriptUrl: "/static/..." }));
 * }
 * ```
 *
 * @example Running a flow from a route handler:
 * ```ts
 * const result = await ctx.flow.run("provision-user", { username, password });
 * const persisted = result.stageResults["persist-account"]?.[0];
 * ```
 */
export interface FlowApi {
    /** Returns true if a flow with the given ID is currently registered. */
    exists(flowId: string): boolean;
    /**
     * Injects a stage hook into an existing flow. Returns true when the hook
     * was registered, false when the hook ID is already present (idempotent —
     * never throws on duplicate). Also returns false when the flow or stage
     * does not exist.
     */
    extend(
        flowId: string,
        stageId: string,
        hook: FlowHookRegistration,
        handler: FlowStageHook,
    ): boolean;
    /**
     * Runs a registered flow with optional input data and options. Resolves
     * with the accumulated stage results when all hooks complete.
     */
    run(
        flowId: string,
        input?: unknown,
        options?: FlowRunOptions,
    ): Promise<FlowRunResult>;
}

export interface Ctx {
    contributeCapability(key: string, value: unknown): void;
    contributePublicCapability(key: string, value: unknown): void;
    removeCapability(key: string): boolean;
    isPublicCapability(key: string): boolean;
    listPublicCapabilities(): string[];
    hasCapability(key: string): boolean;
    getCapability<T>(key: string): T | undefined;
    requireCapability<T>(key: string): T;
    registerFlow(flow: FlowRegistration): void;
    unregisterFlow(flowId: string): boolean;
    hasFlow(flowId: string): boolean;
    listFlows(): string[];
    addFlowStageHook(
        flowId: string,
        stageId: string,
        hook: FlowHookRegistration,
        handler: FlowStageHook,
    ): void;
    removeFlowStageHook(
        flowId: string,
        stageId: string,
        hookId: string,
    ): boolean;
    runFlow(
        flowId: string,
        input?: unknown,
        options?: FlowRunOptions,
    ): Promise<FlowRunResult>;
    /** Direct access to the flow API; the preferred surface for consuming code. */
    readonly flow: FlowApi;
}
