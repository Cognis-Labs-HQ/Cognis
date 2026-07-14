/**
 * Normalizes a value read back from a database timestamp column into an ISO
 * 8601 string. DB adapters differ in how they deserialize timestamps — some
 * return Date instances, others return strings directly.
 */
export function readDbTimestampValue(value: unknown): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    return String(value);
}
