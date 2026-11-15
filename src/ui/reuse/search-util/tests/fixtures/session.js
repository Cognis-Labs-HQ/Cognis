import { uiCtx } from "../../../ui-ctx.js";

uiCtx.extendFlow(
    "authenticate-session",
    "resolve-session",
    { id: "fixture:searchSession" },
    () => ({ authenticated: true }),
);
