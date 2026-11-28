export type StructuredDatabaseColumnType =
    "text" | "integer" | "bigint" | "boolean" | "timestamp" | "blob";

export type StructuredDatabaseColumnDefault =
    "now" | "true" | "false" | null | string | number;

export interface StructuredDatabaseColumnDefinition {
    name: string;
    type: StructuredDatabaseColumnType;
    notNull?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
    default?: StructuredDatabaseColumnDefault;
    references?: {
        table: string;
        column: string;
        onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
    };
}

export interface StructuredDatabaseTableDefinition {
    name: string;
    columns: StructuredDatabaseColumnDefinition[];
    /** Composite primary key — overrides column-level primaryKey when set. */
    primaryKey?: string[];
    /** Composite unique constraints. */
    uniqueKeys?: string[][];
    /** Additional indexes beyond those implied by uniqueKeys. */
    indexes?: Array<{ columns: string[]; name?: string }>;
}
