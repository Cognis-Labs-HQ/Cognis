/**
 * Client-side flow contract registry for the Cognis browser shell.
 *
 * Declares the three cross-cutting browser flows on the `uiCtx` singleton.
 * This module must be imported before any `uiCtx.extendFlow(...)` call so
 * that the flow contracts exist when hook files register their stage handlers.
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
 * `search` (owner: ui)
 *   Collects local search indexes from visible content, component-owned
 *   indexes, and the settings index before matching happens in the popup.
 *   Stages: visible-indexes → component-indexes → settings-index
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

uiCtx.registerFlow("search", [
    "visible-indexes",
    "component-indexes",
    "settings-index",
]);
