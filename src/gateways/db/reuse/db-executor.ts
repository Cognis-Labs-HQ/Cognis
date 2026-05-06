/**
 * Core database executor contract for the DB gateway.
 *
 * This interface is the only import that code outside the DB gateway
 * (e.g. api/bootstrap/db-init.ts, api/gateway-bootstrap.ts, DB adapters)
 * should take from the DB gateway tree. Every concrete driver implementation
 * (SqliteExecutor, PostgresExecutor, MariadbExecutor) lives inside the DB
 * adapter and satisfies this interface.
 *
 * Why it lives here rather than in src/api/reuse/:
 *   DbExecutor is the DB gateway's own contract — knowing its shape requires
 *   knowing the gateway exists. Placing it here keeps all DB-specific
 *   knowledge inside the gateway tree and out of the generic API layer.
 *
 * Cross-boundary callers (API bootstrap files and the GatewayBootstrapContext)
 * may import this type directly from the DB gateway's reuse, as the DB gateway
 * is a required component for every deployment.
 *
 * @example
 *   import type { DbExecutor } from '../../gateways/db/reuse/db-executor.js';
 */
export interface DbExecutor {
    execute(
        sql: string,
        params?: unknown[],
    ): Promise<{ rows?: any[]; rowCount?: number }>;
}
