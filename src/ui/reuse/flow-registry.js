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
 *
 * `defer-page-action` (owner: ui)
 *   Schedules popup-producing work after the current page mount/navigation
 *   stack has completed. Stages: schedule
 *
 * `complete-login` (owner: auth-gateway)
 *   Lets authentication adapters prepare account-bound browser services after
 *   session persistence and before navigation. Stages: setup-account-services
 */

import { uiCtx } from "./ui-ctx.js";
uiCtx.extendFlow(
    "defer-page-action",
    "schedule",
    { id: "ui:defer-page-action" },
    (stageCtx) => {
        const action = stageCtx.input?.action;
        if (typeof action !== "function") return { scheduled: false };
        setTimeout(() => void action(), 0);
        return { scheduled: true };
    },
);
