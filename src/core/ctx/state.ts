import type {
    FlowHookRegistration,
    FlowRegistration,
    FlowStageHook,
} from "./types.js";

export interface RegisteredFlowHook {
    readonly id: string;
    readonly order: number;
    readonly handler: FlowStageHook;
}

export interface RegisteredFlow {
    readonly flow: FlowRegistration;
    readonly stageHooks: Map<string, Map<string, RegisteredFlowHook>>;
}

export interface CtxState {
    readonly capabilities: Map<string, unknown>;
    readonly publicCapabilities: Set<string>;
    readonly flows: Map<string, RegisteredFlow>;
}

export function createCtxState(): CtxState {
    return {
        capabilities: new Map<string, unknown>(),
        publicCapabilities: new Set<string>(),
        flows: new Map<string, RegisteredFlow>(),
    };
}

export function normalizeHookOrder(hook: FlowHookRegistration): number {
    return Number.isFinite(hook.order) ? Number(hook.order) : 0;
}
