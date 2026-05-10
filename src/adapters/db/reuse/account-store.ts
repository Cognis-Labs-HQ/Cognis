/**
 * Re-exports for backwards compatibility.
 *
 * Executor classes and SupportedDbType have moved to src/gateways/db/executor.ts.
 * DbLocalAccountStore has moved to src/adapters/auth/local/store.ts.
 * New code should import directly from those canonical locations.
 */
export type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
export type {
    SupportedDbType,
    PostgresExecutor,
    MariadbExecutor,
} from "../../../gateways/db/executor.js";
export {
    createDbExecutor,
    PostgresExecutor,
    MariadbExecutor,
} from "../../../gateways/db/executor.js";
