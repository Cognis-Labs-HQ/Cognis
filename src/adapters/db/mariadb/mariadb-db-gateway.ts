import type { DatabaseGateway, QueryResult } from "@cognis/core";

export interface MariaDbClient {
    query(
        sql: string,
        params?: unknown[],
    ): Promise<[unknown[], { affectedRows?: number }]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}

export class MariaDbGateway implements DatabaseGateway {
    constructor(private readonly client: MariaDbClient) {}

    async query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>> {
        const [rows] = await this.client.query(statement, params);
        const typedRows = rows as Row[];
        return { rows: typedRows, rowCount: typedRows.length };
    }

    async execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }> {
        const [, meta] = await this.client.query(statement, params);
        return { affectedRows: meta.affectedRows ?? 0 };
    }

    async transaction<T>(
        callback: (db: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        await this.client.beginTransaction();
        try {
            const result = await callback(this);
            await this.client.commit();
            return result;
        } catch (error) {
            await this.client.rollback();
            throw error;
        }
    }
}
