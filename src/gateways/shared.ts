/**
 * Common import capabilities for gateway authors. Re-exports the utilities
 * that nearly every gateway bootstrap and route handler needs, reducing the
 * number of deep relative imports in each gateway subdirectory.
 *
 * Public exports:
 *   - GatewayBootstrapContext  Context passed to every gateway bootstrap function.
 *   - GatewayBootstrapBase     Minimal context subset consumed by GatewayService.
 *   - GatewayRegistry          Registry for gateway self-registration and lookup.
 *   - CapabilityStore          Key-value store for inter-gateway capability sharing.
 *   - BootstrapLog             Logging function type contributed by the logging gateway.
 *   - requireAuth              Guard that validates the caller's access token and role.
 *   - requireRoleAccess        Guard that enforces a role access policy (minRole / onlyRole).
 *   - getAuthClaims            Extracts validated claims from an authenticated request.
 *   - getCookieSession         Reads the access token from the request cookie.
 *   - setPageSecurityHeaders   Writes security headers on HTML page responses.
 *   - hasMinRole               Returns true when a role meets or exceeds the minimum required rank.
 *   - isRoleAllowed            Returns true when a role satisfies a role access policy.
 *   - isAccessRole             Runtime check for AccessRole values.
 *   - canAccessUserData        Returns true when the caller may access a target user's data.
 *   - readJson                 Parses the request body as JSON.
 *
 * @example
 * ```ts
 * import type { GatewayBootstrapContext } from "../shared.js";
 * import { requireAuth, readJson } from "../shared.js";
 * ```
 */

export type {
    GatewayBootstrapContext,
    GatewayBootstrapBase,
    BootstrapLog,
} from "../api/gateway-bootstrap.js";
export { GatewayRegistry, CapabilityStore } from "@cognis/core";
export {
    requireAuth,
    requireRoleAccess,
    getAuthClaims,
    getCookieSession,
    setPageSecurityHeaders,
    hasMinRole,
    isRoleAllowed,
    isAccessRole,
    canAccessUserData,
} from "./auth/guard.js";
export { readJson } from "../api/reuse/read-json.js";
