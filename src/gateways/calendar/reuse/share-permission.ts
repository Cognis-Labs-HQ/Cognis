/** A delivered Calendar requires an explicit read grant; write does not imply read. */
export function calendarSharePermission(
    grantedCapabilities: unknown,
): "read" | "write" | null {
    if (
        !Array.isArray(grantedCapabilities) ||
        !grantedCapabilities.includes("calendar:read")
    )
        return null;
    return grantedCapabilities.includes("calendar:write") ? "write" : "read";
}
