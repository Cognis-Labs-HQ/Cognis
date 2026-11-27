/**
 * Shared browser capability registry, available before the shell initializes.
 * Deferred bindings preserve bounded startup calls until their owner contributes.
 * Public exports: createCapabilityRegistry, uiCapabilities, bindCapability.
 * @example const update = bindCapability('example:update');
 */
const MAX_PENDING_INVOCATIONS = 128;

export function createCapabilityRegistry() {
    const values = new Map();
    const pending = [];
    const normalize = (id) => String(id ?? "").trim();
    const invoke = (id, argumentsList) => {
        const handler = values.get(id);
        if (typeof handler !== "function")
            throw new TypeError(`capability_not_callable:${id}`);
        return handler(...argumentsList);
    };
    return {
        contribute(id, value) {
            const key = normalize(id);
            if (!key || values.has(key)) return false;
            values.set(key, value);
            const ready = pending.filter((call) => call.id === key);
            for (let index = pending.length - 1; index >= 0; index--)
                if (pending[index].id === key) pending.splice(index, 1);
            for (const call of ready) void invoke(key, call.args);
            return true;
        },
        remove(id, value) {
            const key = normalize(id);
            if (values.get(key) !== value) return false;
            return values.delete(key);
        },
        get(id) {
            return values.get(normalize(id));
        },
        bind(id) {
            const key = normalize(id);
            if (!key) throw new TypeError("capability_id_required");
            return (...argumentsList) => {
                if (values.has(key)) return invoke(key, argumentsList);
                pending.push({ id: key, args: argumentsList });
                if (pending.length > MAX_PENDING_INVOCATIONS) pending.shift();
                return Promise.resolve(false);
            };
        },
    };
}

const key = Symbol.for("cognis.uiCapabilities");
export const uiCapabilities =
    globalThis[key] ?? (globalThis[key] = createCapabilityRegistry());
export const bindCapability = uiCapabilities.bind;
