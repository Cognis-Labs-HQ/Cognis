/**
 * LocalAccountStore interface — auth gateway's canonical contract for local
 * account persistence.
 *
 * The concrete interface definition lives in src/api/reuse/account-store.ts
 * because it is also consumed by API-layer route factories that cannot import
 * directly from a gateway or adapter directory. This re-export lets gateway
 * code (gateway.ts, bootstrap.ts) import from a short local path without
 * crossing adapter boundaries.
 *
 * @example
 *   import type { LocalAccountStore } from './reuse/local-account-store.js';
 */
export type { LocalAccountStore } from "../../../api/reuse/account-store.js";
export { VolatileLocalAccountStore } from "../../../api/reuse/account-store.js";
