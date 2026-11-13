import { beginPageLoading } from "/static/reuse/page-entry.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { syncTimezoneOnLogin } from "/static/reuse/timestamp.js";

/** Keep login in the verified tab; optional preference synchronization cannot delay its page. */
export async function navigateAfterLogin(accountId) {
    const navigate = uiCtx.capabilities.get("ui:navigate");
    if (!navigate) throw new Error("login_navigation_unavailable");
    const assertAccount = captureAccountGuard();
    const finishLoading = beginPageLoading();
    try {
        const mounted = await navigate("/dashboard", { replace: true });
        assertAccount();
        if (!mounted) throw new Error("login_navigation_failed");
        void syncTimezoneOnLogin(accountId).catch((error) => {
            console.info("[auth] timezone synchronization unavailable", {
                operation: "syncTimezoneOnLogin",
                errorName: error?.name,
            });
        });
    } finally {
        finishLoading();
    }
}
