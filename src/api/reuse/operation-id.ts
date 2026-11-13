/** Validate an optional client operation identity before an idempotent creation. */
export function validateOperationId(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (
        typeof value !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value,
        )
    )
        throw Object.assign(new Error("invalid_operation_id"), { status: 400 });
    return value.toLowerCase();
}
