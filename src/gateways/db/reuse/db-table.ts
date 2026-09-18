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
