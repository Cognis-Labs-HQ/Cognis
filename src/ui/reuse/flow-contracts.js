/**
 * Declares the browser shell's built-in staged flow contracts.
 *
 * Public exports:
 * - `BROWSER_FLOW_CONTRACTS` — immutable flow IDs and their ordered stages.
 *
 * The `uiCtx` singleton consumes this catalog during construction so every
 * module that imports the context sees the contracts before registering hooks.
 *
 * @example
 * ```js
 * import { BROWSER_FLOW_CONTRACTS } from '/static/reuse/flow-contracts.js';
 * const authenticationStages = BROWSER_FLOW_CONTRACTS['authenticate-session'];
 * ```
 */

export const BROWSER_FLOW_CONTRACTS = Object.freeze({
    "declare-focus-surfaces": Object.freeze(["collect", "validate"]),
    "authorize-focus-operation": Object.freeze(["resolve-scope", "authorize"]),
    "start-focus": Object.freeze(["authorize", "create-session", "publish"]),
    "load-focus-target": Object.freeze(["resolve-route", "load", "mount"]),
    "publish-focus-state": Object.freeze(["validate", "persist", "broadcast"]),
    "apply-focus-state": Object.freeze([
        "deduplicate",
        "validate-revision",
        "apply",
    ]),
    "transfer-focus-control": Object.freeze([
        "authorize",
        "transfer",
        "publish",
    ]),
    "end-focus": Object.freeze(["authorize", "end", "restore", "publish"]),
    "request-component-page": Object.freeze(["validate", "resolve", "prepare"]),
    "authenticate-session": Object.freeze([
        "validate-stored-token",
        "apply-alternate-auth",
        "enforce-setup-requirements",
        "resolve-session",
    ]),
    "navigate-to": Object.freeze([
        "resolve-route",
        "authenticate",
        "prepare-assets",
        "mount-page",
    ]),
    "load-page": Object.freeze(["authenticate", "mount-page"]),
    "defer-page-action": Object.freeze(["schedule"]),
    "complete-login": Object.freeze(["setup-account-services"]),
    search: Object.freeze([
        "visible-indexes",
        "component-indexes",
        "settings-index",
    ]),
});
