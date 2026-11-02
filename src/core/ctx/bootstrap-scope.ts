import { AsyncLocalStorage } from "node:async_hooks";
import type {
    Ctx,
    FlowRegistration,
    FlowHookRegistration,
    FlowStageHook,
} from "./types.js";

export type BootstrapDisposer = (() => void | Promise<void>) & {
    reactivate?: () => void | Promise<void>;
};
type Disposer = BootstrapDisposer;
export interface BootstrapScope {
    readonly root: object;
    readonly owner: string;
    readonly active: boolean;
    registerDisposer(dispose: Disposer): void;
}
const key = Symbol.for("cognis.bootstrapScope");
const host = globalThis as typeof globalThis & {
    [key: symbol]: AsyncLocalStorage<BootstrapScope> | undefined;
};
const current = (host[key] ??= new AsyncLocalStorage<BootstrapScope>());

/** Host-only entry point: authority expires even when detached bootstrap work continues. */
export async function runBootstrapScope<T>(
    root: object,
    owner: string,
    operation: () => Promise<T>,
    registerDisposer?: (dispose: Disposer) => void,
): Promise<T> {
    const cleanup: Disposer[] = [];
    const currentParent = current.getStore();
    const parent = currentParent?.root === root ? currentParent : undefined;
    if (parent && !parent.active)
        throw new Error("bootstrap_registration_closed");
    let active = true;
    const scope: BootstrapScope = Object.freeze({
        root,
        owner,
        get active() {
            return active && (!parent || parent.active);
        },
        registerDisposer(dispose: Disposer) {
            if (!scope.active) throw new Error("bootstrap_scope_closed");
            cleanup.push(dispose);
        },
    });
    return current.run(scope, async () => {
        try {
            const result = await operation();
            for (const dispose of cleanup) registerDisposer?.(dispose);
            return result;
        } catch (error) {
            active = false;
            const failures: unknown[] = [];
            for (const dispose of cleanup.reverse()) {
                try {
                    await dispose();
                } catch (failure) {
                    failures.push(failure);
                }
            }
            if (failures.length)
                throw new AggregateError(
                    [error, ...failures],
                    "bootstrap_cleanup_failed",
                    { cause: error },
                );
            throw error;
        } finally {
            active = false;
        }
    });
}

/** Registration capabilities call this on every invocation, including retained references. */
export function requireBootstrapScope(root?: object): BootstrapScope {
    const scope = current.getStore();
    if (!scope?.active || (root && scope.root !== root))
        throw new Error("bootstrap_registration_closed");
    return scope;
}

/** A declared flow and its handlers share the owner's rollback, disable and reactivation lifetime. */
export function registerBootstrapFlow(
    ctx: Ctx,
    definition: FlowRegistration,
): {
    extend(
        stage: string,
        metadata: FlowHookRegistration,
        handler: FlowStageHook,
    ): void;
} {
    const scope = requireBootstrapScope(ctx);
    const hooks: Array<{
        stage: string;
        metadata: FlowHookRegistration;
        handler: FlowStageHook;
    }> = [];
    let active = false;
    const activate = () => {
        if (active) return;
        let registered = false;
        try {
            ctx.registerFlow(definition);
            registered = true;
            for (const hook of hooks) {
                if (
                    !ctx.flow.extend(
                        definition.id,
                        hook.stage,
                        hook.metadata,
                        hook.handler,
                    )
                )
                    throw new Error("bootstrap_flow_hook_conflict");
            }
            active = true;
        } catch (error) {
            if (registered) ctx.unregisterFlow(definition.id);
            throw error;
        }
    };
    activate();
    const dispose = () => {
        if (active) {
            ctx.unregisterFlow(definition.id);
            active = false;
        }
    };
    dispose.reactivate = activate;
    scope.registerDisposer(dispose);
    return Object.freeze({
        extend(
            stage: string,
            metadata: FlowHookRegistration,
            handler: FlowStageHook,
        ) {
            if (requireBootstrapScope(ctx).owner !== scope.owner)
                throw new Error("bootstrap_flow_owner_mismatch");
            if (!ctx.flow.extend(definition.id, stage, metadata, handler))
                throw new Error("bootstrap_flow_hook_conflict");
            hooks.push({ stage, metadata: { ...metadata }, handler });
        },
    });
}

export interface BootstrapRegistrationState {
    readonly active: boolean;
    readonly revision: number;
}

/** Bind one registry record to its contributor's bootstrap, rollback and disable lifetime. */
export function registerBootstrapEntry<K, V extends object>(
    ctx: Ctx,
    entries: Map<K, V>,
    key: K,
    value: V,
    conflictCode: string,
): BootstrapRegistrationState {
    const scope = requireBootstrapScope(ctx);
    let active = false;
    let revision = 0;
    const activate = () => {
        if (active && entries.get(key) === value) return;
        if (entries.has(key)) throw new Error(conflictCode);
        entries.set(key, value);
        active = true;
        revision++;
    };
    activate();
    const dispose = () => {
        if (!active) return;
        if (entries.get(key) === value) entries.delete(key);
        active = false;
        revision++;
    };
    dispose.reactivate = activate;
    scope.registerDisposer(dispose);
    return Object.freeze({
        get active() {
            return active && entries.get(key) === value;
        },
        get revision() {
            return revision;
        },
    });
}
