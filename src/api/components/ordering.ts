import { componentKey, type ComponentInfo } from "./types.js";

/** Orders parents and declared hard dependencies before their consumers. */
export function orderComponents(
    entries: ComponentInfo[],
    reverse: boolean,
): ComponentInfo[] {
    const remaining = new Set(entries);
    const ordered: ComponentInfo[] = [];
    while (remaining.size) {
        const ready = [...remaining].filter(
            (entry) =>
                ![...remaining].some(
                    (candidate) =>
                        candidate !== entry &&
                        ((entry.type === "adapter" &&
                            candidate.type === "gateway" &&
                            entry.gatewayId === candidate.id) ||
                            [
                                ...((entry.requires as string[]) ?? []),
                                ...((entry.hardDependencies as string[]) ?? []),
                            ].some(
                                (reference) =>
                                    reference === candidate.uuid ||
                                    reference === candidate.id,
                            )),
                ),
        );
        if (!ready.length)
            throw Object.assign(new Error("component_dependency_cycle"), {
                status: 409,
            });
        for (const entry of ready) {
            remaining.delete(entry);
            ordered.push(entry);
        }
    }
    const unique = [
        ...new Map(
            ordered.map((entry) => [componentKey(entry), entry]),
        ).values(),
    ];
    return reverse ? unique.reverse() : unique;
}

export function requiredConsumer(
    target: ComponentInfo,
    entries: ComponentInfo[],
): boolean {
    const seen = new Set<string>();
    const dependsOn = (consumer: ComponentInfo): boolean => {
        const key = componentKey(consumer);
        if (seen.has(key)) return false;
        seen.add(key);
        const references = [
            ...((consumer.requires as string[]) ?? []),
            ...((consumer.hardDependencies as string[]) ?? []),
        ];
        if (
            consumer.type === "adapter" &&
            target.type === "gateway" &&
            consumer.gatewayId === target.id
        )
            return true;
        return entries.some(
            (dependency) =>
                dependency !== consumer &&
                references.some(
                    (reference) =>
                        reference === dependency.id ||
                        reference === dependency.uuid,
                ) &&
                (componentKey(dependency) === componentKey(target) ||
                    dependsOn(dependency)),
        );
    };
    return entries.some((consumer) => {
        seen.clear();
        return (
            componentKey(consumer) !== componentKey(target) &&
            (consumer.required ||
                consumer.critical ||
                consumer.class === "core") &&
            dependsOn(consumer)
        );
    });
}
