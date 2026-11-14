/**
 * Core contracts for the database gateway surface.
 *
 * These types define the cross-component API for database access. Gateway
 * implementations and adapters must implement/consume these interfaces rather
 * than importing each other's internal types directly.
 */

export interface QueryResult<Row = Record<string, unknown>> {
    rows: Row[];
    rowCount: number;
}

export interface DatabaseGateway {
    query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>>;

    execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }>;

    transaction<T>(callback: (db: DatabaseGateway) => Promise<T>): Promise<T>;
}
