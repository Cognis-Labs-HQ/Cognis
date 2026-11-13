interface PreparationResult {
    data: Record<string, unknown>;
    stageResults: Record<string, unknown[]>;
}
function record(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : undefined;
}
/** A returned or data-mutating denial must never be erased by a successful gate. */
export function sessionGateResult(
    prepared: PreparationResult,
    key: string,
    allowed: string,
): Record<string, unknown> | undefined {
    const current = record(prepared.data[key]);
    const returned = Object.values(prepared.stageResults)
        .flat()
        .flatMap((entry) => {
            const value = record(record(entry)?.[key]);
            return value ? [value] : [];
        });
    return current && current.outcome !== allowed
        ? current
        : (returned.findLast((value) => value.outcome !== allowed) ??
              current ??
              returned.at(-1));
}
