/**
 * Minimal database executor interface used throughout the API and bootstrap
 * layers. Concrete implementations live in the DB adapters; this definition
 * keeps the API layer free of any adapter-specific import.
 */
export interface DbExecutor {
    execute(
        sql: string,
        params?: unknown[],
    ): Promise<{ rows?: any[]; rowCount?: number }>;
}
