import {
    registerBootstrapEntry,
    requireBootstrapScope,
    type BootstrapRegistrationState,
} from "./bootstrap-scope.js";
import type { Ctx } from "./types.js";

export const CAPABILITY_CONTRACTS = "system:contracts";
export interface CapabilityContract {
    version: number;
    kind: "function" | "object";
    members?: Readonly<
        Record<string, "function" | "string" | "number" | "boolean" | "object">
    >;
    description: string;
}
export interface CapabilityContracts {
    define(id: string, contract: CapabilityContract): void;
    describe(
        id: string,
    ): Readonly<CapabilityContract & { owner: string }> | undefined;
    list(): Array<Readonly<CapabilityContract & { id: string; owner: string }>>;
    resolve<T = Record<string, (...args: any[]) => any>>(
        id: string,
        version: number,
    ): T;
}
type Lookup = (id: string) => unknown;
const resolvers = new WeakMap<
    CapabilityContracts,
    (id: string, version: number, lookup?: Lookup) => unknown
>();

/** Preserve a module context's capability authorization wrappers when resolving contracts. */
export function scopeCapabilityContracts(
    registry: CapabilityContracts,
    lookup: Lookup,
): CapabilityContracts {
    const resolve = resolvers.get(registry);
    if (!resolve) throw new Error("invalid_capability_contract_registry");
    const bound = (id: string, version: number) => resolve(id, version, lookup);
    const scoped = Object.freeze({
        ...registry,
        resolve: bound,
    }) as CapabilityContracts;
    resolvers.set(scoped, bound);
    return scoped;
}

/** Domain owners publish declarations at bootstrap; Core knows only structural kinds and versions. */
export function createCapabilityContracts(ctx: Ctx): CapabilityContracts {
    const entries = new Map<
        string,
        Readonly<CapabilityContract & { owner: string }>
    >();
    const lifetimes = new WeakMap<object, BootstrapRegistrationState>();
    function assertValue(contract: CapabilityContract, value: unknown) {
        if (value === null || typeof value !== contract.kind)
            throw new Error("capability_contract_mismatch");
        for (const [name, kind] of Object.entries(contract.members ?? {})) {
            if (typeof (value as Record<string, unknown>)[name] !== kind)
                throw new Error("capability_contract_mismatch");
        }
    }
    const api = Object.freeze({
        define(id, input) {
            const scope = requireBootstrapScope(ctx);
            if (
                scope.owner.startsWith("module:") &&
                !id.startsWith(scope.owner.slice(7) + ":")
            )
                throw new Error("capability_contract_namespace_denied");
            if (
                !/^[a-z][a-zA-Z0-9:._-]{0,149}$/.test(id) ||
                !Number.isSafeInteger(input?.version) ||
                input.version < 1 ||
                !["object", "function"].includes(input.kind) ||
                typeof input.description !== "string" ||
                !input.description.trim() ||
                Object.entries(input.members ?? {}).some(
                    ([name, kind]) =>
                        !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) ||
                        ["constructor", "prototype", "__proto__"].includes(
                            name,
                        ) ||
                        ![
                            "function",
                            "string",
                            "number",
                            "boolean",
                            "object",
                        ].includes(kind),
                )
            )
                throw new Error("invalid_capability_contract");
            const record = Object.freeze({
                ...input,
                members: Object.freeze({ ...input.members }),
                owner: scope.owner,
            });
            lifetimes.set(
                record,
                registerBootstrapEntry(
                    ctx,
                    entries,
                    id,
                    record,
                    "capability_contract_conflict",
                ),
            );
        },
        describe: (id) =>
            ctx.isPublicCapability(id) ? entries.get(id) : undefined,
        list: () =>
            [...entries]
                .filter(([id]) => ctx.isPublicCapability(id))
                .map(([id, contract]) => Object.freeze({ id, ...contract })),
        resolve<T>(
            id: string,
            version: number,
            lookup: Lookup = ctx.getCapability.bind(ctx),
        ): T {
            const contract = entries.get(id);
            if (
                !contract ||
                contract.version !== version ||
                !ctx.isPublicCapability(id)
            )
                throw new Error("capability_contract_unavailable");
            const lifetime = lifetimes.get(contract)!;
            const revision = lifetime.revision;
            const original = ctx.requireCapability<object>(id);
            const implementation = lookup(id) as object;
            assertValue(contract, implementation);
            const assertActive = () => {
                if (
                    !lifetime.active ||
                    lifetime.revision !== revision ||
                    entries.get(id) !== contract ||
                    ctx.getCapability(id) !== original ||
                    !ctx.isPublicCapability(id)
                )
                    throw new Error("capability_contract_unavailable");
            };
            const call = (fn: Function, args: unknown[]) => {
                assertActive();
                const result = Reflect.apply(fn, implementation, args);
                if (result && typeof result.then === "function")
                    return Promise.resolve(result).then((value) => {
                        assertActive();
                        return value;
                    });
                return result;
            };
            const target =
                contract.kind === "function"
                    ? (...args: unknown[]) =>
                          call(implementation as Function, args)
                    : Object.create(null);
            return new Proxy(target, {
                get(_target, property) {
                    assertActive();
                    if (
                        typeof property !== "string" ||
                        (contract.kind === "object"
                            ? !Object.hasOwn(contract.members ?? {}, property)
                            : !["name", "length"].includes(property))
                    )
                        return undefined;
                    const value = Reflect.get(implementation, property);
                    return typeof value === "function"
                        ? (...args: unknown[]) => call(value, args)
                        : value;
                },
                apply(_target, _receiver, args) {
                    return call(implementation as Function, args);
                },
                set() {
                    throw new Error("capability_contract_readonly");
                },
            }) as T;
        },
    } satisfies CapabilityContracts);
    resolvers.set(api, api.resolve);
    return api;
}
