export interface Selection {
    all?: boolean;
    type?: string;
    gatewayId?: string;
    target?: { type: string; id: string; gatewayId?: string };
}

export function selectComponents(args: string[]): Selection {
    const flags = args.filter((value) => value.startsWith("--"));
    if (
        flags.some(
            (flag) => !["--all", "--ack-external-disclaimer"].includes(flag),
        ) ||
        new Set(flags).size !== flags.length
    )
        throw new Error("Invalid component option.");
    const values = args.filter((value) => !value.startsWith("--"));
    if (flags.includes("--all")) {
        const [type, gatewayId] = values;
        if (
            (type && !["module", "gateway", "adapter"].includes(type)) ||
            values.length > (type === "adapter" ? 2 : 1)
        )
            throw new Error(
                "Use --all alone, with a component type, or with adapter <gatewayId>.",
            );
        return {
            all: true,
            ...(type ? { type } : {}),
            ...(gatewayId ? { gatewayId } : {}),
        };
    }
    const [type, firstId, secondId] = values;
    if (
        !["module", "gateway", "adapter"].includes(type) ||
        !firstId ||
        values.length !== (type === "adapter" ? 3 : 2)
    )
        throw new Error(
            "Expected <module|gateway> <id> or adapter <gatewayId> <adapterId>, or --all.",
        );
    return {
        target: {
            type,
            id: type === "adapter" ? secondId : firstId,
            ...(type === "adapter" ? { gatewayId: firstId } : {}),
        },
    };
}
export function selectionPath(target: NonNullable<Selection["target"]>) {
    const parts = [
        target.type,
        ...(target.gatewayId ? [target.gatewayId] : []),
        target.id,
    ];
    return "/api/v1/components/" + parts.map(encodeURIComponent).join("/");
}
export function batchExitCode(payload: unknown): number {
    const results = (
        payload as { data?: { results?: Array<{ status: string }> } }
    )?.data?.results;
    return results?.some((entry) => entry.status === "failed") ? 1 : 0;
}
