export type StructuredDbColumnType =
    | "text"
    | "integer"
    | "bigint"
    | "boolean"
    | "timestamp"
    | "blob";

export type StructuredDbColumnDefault =
    | "now"
    | "true"
    | "false"
    | null
    | string
    | number;

export interface StructuredDbColumnDef {
    name: string;
    type: StructuredDbColumnType;
    notNull?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
    default?: StructuredDbColumnDefault;
    references?: {
        table: string;
        column: string;
        onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
    };
}

export interface StructuredDbTableDef {
    name: string;
    columns: StructuredDbColumnDef[];
    /** Composite primary key — overrides column-level primaryKey when set. */
    primaryKey?: string[];
    /** Composite unique constraints. */
    uniqueKeys?: string[][];
    /** Additional indexes beyond those implied by uniqueKeys. */
    indexes?: Array<{ columns: string[]; name?: string }>;
}

/**
 * Normalizes a value read back from a `timestamp` column into an ISO 8601
 * string. DB adapters differ in how they deserialize timestamps — some
 * (e.g. node-postgres) return `Date` instances, others return strings
 * directly. Callers that re-read a timestamp column and might write it back
 * (e.g. an UPDATE using a previously stored value) must go through this
 * helper instead of `String(value)`, which invokes `Date.prototype.toString()`
 * and produces a locale-formatted string that databases reject as invalid
 * timestamp input.
 */
export function readTimestampValue(value: unknown): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    return String(value);
}
