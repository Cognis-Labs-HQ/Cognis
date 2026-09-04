/**
 * Client-side flow catalog for the Cognis browser shell.
 *
 * Wires together flow contract registration and the default stage-hook
 * implementations. Importing this module is the only wiring required: each
 * gateway that contributes hooks (auth, share, …) is loaded here so that all
 * hooks are registered before the first flow runs.
 *
 * Flow contracts are declared in `flow-registry.js` and are imported from
 * there by each hook file independently, so hooks can be loaded safely on
 * their own without relying on this catalog being loaded first.
 *
 * Flows wired here:
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
 * `defer-page-action`
 *   Defers popup-producing actions until the current page mount completes.
 *
 * @example
 * ```js
 * import '/static/reuse/page-flow-catalog.js';
 * import { uiCtx } from '/static/reuse/ui-ctx.js';
 * const result = await uiCtx.runFlow('authenticate-session', {});
 * ```
 */

import "./flow-registry.js";
import "/static/gateways/auth/session-flow-hooks.js";
