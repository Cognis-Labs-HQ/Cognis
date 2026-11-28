/**
 * Core database executor contract for the DB gateway.
 *
 * This interface is the only import that code outside the DB gateway
 * (e.g. api/bootstrap/db-init.ts, api/bootstrap/gateway.ts, DB adapters)
 * should take from the DB gateway tree. Concrete driver implementations live
 * inside DB adapters and satisfy this interface.
 *
 * Why it lives here rather than in src/api/reuse/:
 *   DatabaseExecutor is the DB gateway's own contract — knowing its shape requires
 *   knowing the gateway exists. Placing it here keeps all DB-specific
 *   knowledge inside the gateway tree and out of the generic API layer.
 *
 * Cross-boundary callers (API bootstrap files and the GatewayBootstrapContext)
 * may import this type directly from the DB gateway's reuse, as the DB gateway
 * is a required component for every deployment.
 *
 * @example
 *   import type { DatabaseExecutor } from '../../gateways/db/reuse/db-executor.js';
 */
import type {
    StructuredDatabaseCommand,
    StructuredDatabaseCommandResult,
} from "./db-command.js";
import type { StructuredDatabaseTableDefinition } from "./db-table.js";

/**
 * Public DB executor interface for application code.
 *
 * No raw SQL is exposed here. All queries go through the structured
 * command DSL. DDL is expressed via ensureTable(); transactional
 * grouping via transaction().
 */
export interface DatabaseExecutor {
    executeCommand(
        command: StructuredDatabaseCommand,
    ): Promise<StructuredDatabaseCommandResult>;
    ensureTable(definition: StructuredDatabaseTableDefinition): Promise<void>;
    transaction<T>(
        callback: (executor: DatabaseExecutor) => Promise<T>,
    ): Promise<T>;
}

/**
 * Extended interface for DB adapter internals only.
 *
 * Exposes the raw execute() method. Nothing outside
 * src/adapters/db/ or src/gateways/db/ may import or call this.
 */
export interface RawDatabaseExecutor extends DatabaseExecutor {
    execute(
        sql: string,
        params?: unknown[],
    ): Promise<{ rows?: any[]; rowCount?: number }>;
}
