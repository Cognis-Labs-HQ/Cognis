/**
 * Re-exports for backwards compatibility.
 *
 * DbProviderId and DbExecutor live in the DB gateway reuse layer.
 * DbLocalAccountStore has moved to src/adapters/auth/local/store.ts.
 * New code should import directly from those canonical locations.
 */
export type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
export type {
    DbProviderId,
    DbProviderId as SupportedDbType,
} from "../../../gateways/db/reuse/provider-id.js";
