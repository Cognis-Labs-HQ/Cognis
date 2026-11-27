import type { DatabaseGateway, QueryResult } from "@cognis/core";

export class MemoryDatabaseGateway implements DatabaseGateway {
    private readonly queryLog: Array<{
        statement: string;
        params?: unknown[];
    }> = [];

    async query<Row = Record<string, unknown>>(
        statement: string,
        parameters?: unknown[],
    ): Promise<QueryResult<Row>> {
        this.queryLog.push({ statement, params: parameters });
        return { rows: [], rowCount: 0 };
    }

    async execute(
        statement: string,
        parameters?: unknown[],
    ): Promise<{ affectedRows: number }> {
        this.queryLog.push({ statement, params: parameters });
        return { affectedRows: 0 };
    }

    async transaction<T>(
        callback: (database: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }

    getQueries(): ReadonlyArray<{ statement: string; params?: unknown[] }> {
        return this.queryLog;
    }
}
