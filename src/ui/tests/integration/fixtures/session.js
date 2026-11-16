import "/static/reuse/flow-registry.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

uiCtx.extendFlow(
    "authenticate-session",
    "resolve-session",
    { id: "fixture:resolveSession" },
    () => ({
        authenticated: true,
        accountId: "fixture",
        requiresRedirect: false,
    }),
);
