/**
 * Registers release notes as an awaited page-readiness blocker.
 * Public export: registerReleaseChangelogReadiness — owns a page-lifetime blocking hook.
 * @example registerReleaseChangelogReadiness(uiCtx, {i18n, signal});
 * @param {object} ctx Browser flow/capability context.
 * @param {object} options Localizer and shell lifetime.
 * @returns {Function} Registration cleanup.
 */
import { maybeShowReleaseChangelogPopup } from "./popup.js";

import { registerPageReadinessBlocker } from "../../reuse/page-readiness.js";
const checked = new WeakMap();

export function registerReleaseChangelogReadiness(ctx, { i18n, signal }) {
    return registerPageReadinessBlocker(
        ctx,
        { id: "layout:releaseChangelog", order: 0, signal },
        async ({ input }) => {
            input.signal.throwIfAborted();
            const account = globalThis.localStorage?.getItem("cognis_account");
            if (
                !account ||
                checked.get(ctx) === account ||
                ctx.capabilities.get("session:isGuest")?.() === true
            )
                return;
            try {
                await maybeShowReleaseChangelogPopup(i18n, {
                    signal: input.signal,
                });
                input.signal.throwIfAborted();
                if (
                    globalThis.localStorage?.getItem("cognis_account") ===
                    account
                )
                    checked.set(ctx, account);
            } catch (error) {
                if (input.signal.aborted) throw error;
                if (signal?.aborted) return;
                ctx.capabilities.get("ui:log")?.(
                    "error",
                    "release_changelog_check_failed",
                    {
                        component: "ui",
                        operation: "releaseChangelogReadiness",
                        errorName: error?.name,
                    },
                );
            }
        },
    );
}
