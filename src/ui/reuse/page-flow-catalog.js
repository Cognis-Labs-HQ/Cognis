/**
 * Client-side flow catalog for the Cognis browser shell.
 *
 * Registers the three cross-cutting browser flows on the `uiCtx` singleton
 * and imports the default stage-hook implementations that own each flow's
 * core behaviour. Importing this module is the only wiring required: each
 * gateway that contributes hooks (auth, share, …) is loaded here so that all
 * hooks are registered before the first flow runs.
 *
 * Flows declared here:
 *
 * `authenticate-session` (owner: auth-gateway)
 *   Validates the stored browser session and produces a normalised session
 *   descriptor used by page-entry and the SPA router.
 *   Stages: validate-stored-token → apply-alternate-auth →
 *           enforce-setup-requirements → resolve-session
 *
 * `navigate-to` (owner: ui)
 *   Drives a full SPA navigation: route resolution, auth enforcement, asset
 *   injection, and page mounting.
 *   Stages: resolve-route → authenticate → prepare-assets → mount-page
 *
 * `load-page` (owner: ui)
 *   Drives a direct (non-SPA) page load: auth enforcement then mount.
 *   Stages: authenticate → mount-page
 *
 * @example
 * ```js
 * import '/static/reuse/page-flow-catalog.js';
 * import { uiCtx } from '/static/reuse/ui-ctx.js';
 * const result = await uiCtx.runFlow('authenticate-session', {});
 * ```
 */

import { uiCtx } from "./ui-ctx.js";

uiCtx.registerFlow("authenticate-session", [
    "validate-stored-token",
    "apply-alternate-auth",
    "enforce-setup-requirements",
    "resolve-session",
]);

uiCtx.registerFlow("navigate-to", [
    "resolve-route",
    "authenticate",
    "prepare-assets",
    "mount-page",
]);

uiCtx.registerFlow("load-page", ["authenticate", "mount-page"]);

import "/static/gateways/auth/ui/session-flow-hooks.js";
