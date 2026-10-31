import { AsyncLocalStorage } from "node:async_hooks";

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
    let active = true;
    const scope: BootstrapScope = Object.freeze({
        root,
        owner,
        get active() {
            return active;
        },
        registerDisposer(dispose: Disposer) {
            if (!active) throw new Error("bootstrap_scope_closed");
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
