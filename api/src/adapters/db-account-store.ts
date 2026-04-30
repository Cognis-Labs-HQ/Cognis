import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { AuthContext } from '@cognis/core';
import type { LocalAccountStore } from './local-auth-gateway.js';

export type SupportedDbType = 'sqlite' | 'postgresql' | 'mariadb';

interface DbExecutor {
  execute(sql: string, params?: unknown[]): Promise<{ rows?: any[]; rowCount?: number }>;
}

class SqliteExecutor implements DbExecutor {
  private dbPromise: Promise<any> | null = null;
  constructor(private readonly dbPath: string) {}

  private async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = (async () => {
        const sqlite3 = await import('sqlite3').then((mod: any) => mod.default ?? mod);
        await mkdir(path.dirname(this.dbPath), { recursive: true });
        return new sqlite3.Database(this.dbPath);
      })();
    }
    return this.dbPromise;
  }

  async execute(sql: string, params: unknown[] = []) {
    const db = await this.getDb();
    const command = sql.trim().toLowerCase();
    if (command.startsWith('select')) {
      const rows = await new Promise<any[]>((resolve, reject) => db.all(sql, params, (err: Error | null, result: any[]) => err ? reject(err) : resolve(result)));
      return { rows, rowCount: rows.length };
    }
    const rowCount = await new Promise<number>((resolve, reject) => db.run(sql, params, function (this: { changes: number }, err: Error | null) { err ? reject(err) : resolve(this.changes ?? 0); }));
    return { rowCount };
  }
}

class PostgresExecutor implements DbExecutor {
  private clientPromise: Promise<any> | null = null;
  constructor(private readonly databaseUrl: string) {}
  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { Client } = await import('pg');
        const client = new Client({ connectionString: this.databaseUrl });
        await client.connect();
        return client;
      })();
    }
    return this.clientPromise;
  }
  async execute(sql: string, params: unknown[] = []) {
    const client = await this.getClient();
    const result = await client.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }
}

class MariadbExecutor implements DbExecutor {
  private connPromise: Promise<any> | null = null;
  constructor(private readonly databaseUrl: string) {}
  private async getConn() {
    if (!this.connPromise) {
      this.connPromise = (async () => {
        const mariadb = await import('mysql2/promise');
        return mariadb.createConnection(this.databaseUrl);
      })();
    }
    return this.connPromise;
  }
  async execute(sql: string, params: unknown[] = []) {
    const conn = await this.getConn();
    const [rows] = await conn.execute(sql, params);
    if (Array.isArray(rows)) return { rows, rowCount: rows.length };
    return { rowCount: (rows as any).affectedRows ?? 0 };
  }
}

function hash(input: string) { return createHash('sha256').update(input).digest('hex'); }

export class DbLocalAccountStore implements LocalAccountStore {
  constructor(private readonly db: DbExecutor, private readonly dbType: SupportedDbType) {}

  static async create(dbType: SupportedDbType): Promise<DbLocalAccountStore> {
    if (dbType === 'sqlite') {
      const dbPath = process.env.SQLITE_PATH ?? path.resolve(process.cwd(), 'data', 'cognis.sqlite');
      const store = new DbLocalAccountStore(new SqliteExecutor(dbPath), dbType);
      await store.ensureSchema();
      return store;
    }

    const url = process.env.DATABASE_URL;
    if (!url) throw new Error(`DATABASE_URL is required for DB_TYPE=${dbType}`);

    if (dbType === 'postgresql') {
      const store = new DbLocalAccountStore(new PostgresExecutor(url), dbType);
      await store.ensureSchema();
      return store;
    }

    const store = new DbLocalAccountStore(new MariadbExecutor(url), dbType);
    await store.ensureSchema();
    return store;
  }

  private placeholder(index: number) {
    if (this.dbType === 'postgresql') return `$${index}`;
    return '?';
  }

  private async ensureSchema() {
    await this.db.execute(`CREATE TABLE IF NOT EXISTS accounts (
      username VARCHAR(255) PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE
    )`);
  }

  async register(username: string, password: string, isAdmin = false) {
    if (await this.has(username)) throw new Error('username_taken');
    const role = isAdmin ? 'admin' : 'user';
    await this.db.execute(`INSERT INTO accounts (username, password_hash, role, enabled) VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)})`, [username, hash(password), role, true]);
    return { username, isAdmin, enabled: true };
  }

  async verify(username: string, password: string): Promise<AuthContext | null> {
    const result = await this.db.execute(`SELECT username, password_hash, role, enabled FROM accounts WHERE username = ${this.placeholder(1)}`, [username]);
    const account = result.rows?.[0];
    if (!account || !account.enabled || account.password_hash !== hash(password)) return null;
    return { accountId: username, provider: 'local', externalUserId: username, isAdmin: account.role === 'admin' };
  }

  async has(username: string) {
    const result = await this.db.execute(`SELECT username FROM accounts WHERE username = ${this.placeholder(1)}`, [username]);
    return Boolean(result.rows && result.rows.length > 0);
  }

  async list() {
    const result = await this.db.execute('SELECT username, role, enabled FROM accounts ORDER BY username');
    return (result.rows ?? []).map((row) => ({ username: row.username, isAdmin: row.role === 'admin', enabled: Boolean(row.enabled) }));
  }

  async setRole(username: string, role: 'user' | 'teacher' | 'moderator' | 'admin') {
    await this.db.execute(`UPDATE accounts SET role = ${this.placeholder(1)} WHERE username = ${this.placeholder(2)}`, [role, username]);
  }
  async setPassword(username: string, password: string) {
    await this.db.execute(`UPDATE accounts SET password_hash = ${this.placeholder(1)} WHERE username = ${this.placeholder(2)}`, [hash(password), username]);
  }
  async setEnabled(username: string, enabled: boolean) {
    await this.db.execute(`UPDATE accounts SET enabled = ${this.placeholder(1)} WHERE username = ${this.placeholder(2)}`, [enabled, username]);
  }
  async delete(username: string) {
    await this.db.execute(`DELETE FROM accounts WHERE username = ${this.placeholder(1)}`, [username]);
  }
}
