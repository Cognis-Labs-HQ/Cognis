declare module "pg" {
    export interface PoolConfig {
        connectionString?: string;
        options?: string;
        max?: number;
        idleTimeoutMillis?: number;
        connectionTimeoutMillis?: number;
        statement_timeout?: number;
    }

    export interface QueryResult<Row = Record<string, unknown>> {
        rows: Row[];
        rowCount: number | null;
    }

    export interface PoolClient {
        query<Row = Record<string, unknown>>(
            sql: string,
            params?: unknown[],
        ): Promise<QueryResult<Row>>;
        release(error?: Error | boolean): void;
    }

    export class Pool {
        constructor(config?: PoolConfig);
        query<Row = Record<string, unknown>>(
            sql: string,
            params?: unknown[],
        ): Promise<QueryResult<Row>>;
        connect(): Promise<PoolClient>;
        end(): Promise<void>;
        on(
            event: "error",
            listener: (error: Error, client: PoolClient) => void,
        ): this;
    }
}
