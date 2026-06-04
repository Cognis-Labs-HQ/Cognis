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

export interface Ctx {
    contributeCapability(key: string, value: unknown): void;
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
}
