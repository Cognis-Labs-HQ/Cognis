import type { DatabaseGateway, QueryResult } from "@cognis/core";

export class MemoryDatabaseGateway implements DatabaseGateway {
    private readonly queryLog: Array<{
        statement: string;
        params?: unknown[];
    }> = [];

    async query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>> {
        this.queryLog.push({ statement, params });
        return { rows: [], rowCount: 0 };
    }

    async execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }> {
        this.queryLog.push({ statement, params });
        return { affectedRows: 0 };
    }

    async transaction<T>(
        callback: (db: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }

    getQueries(): ReadonlyArray<{ statement: string; params?: unknown[] }> {
        return this.queryLog;
    }
}
