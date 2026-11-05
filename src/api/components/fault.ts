import type { ComponentTarget } from "./types.js";
const owners = new WeakMap<object, ComponentTarget>();

/** Only owner boundaries can attribute an exception; request data cannot forge this map. */
export function attributeComponentFault(
    error: unknown,
    owner: ComponentTarget,
): unknown {
    const status = (error as { status?: number } | null)?.status;
    if (
        error instanceof SyntaxError ||
        (typeof status === "number" && status < 500)
    )
        return error;
    if (typeof error === "object" && error !== null && owners.has(error))
        return error;
    const failure = new Error(
        error instanceof Error ? error.message : "component_runtime_failed",
        { cause: error },
    );
    owners.set(failure, owner);
    return failure;
}
export function componentFaultOwner(
    error: unknown,
): ComponentTarget | undefined {
    return typeof error === "object" && error !== null
        ? owners.get(error)
        : undefined;
}
