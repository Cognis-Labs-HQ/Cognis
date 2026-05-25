import type { AuthRouteBootstrapHookContext } from "./index.js";

export async function registerAuthRouteBootstrapHook({
    capabilities,
    runtime,
}: AuthRouteBootstrapHookContext): Promise<void> {
    capabilities.contribute("auth:getAccessTokenTtlSeconds", () =>
        runtime.getAccessTokenTtlSeconds(),
    );
    capabilities.contribute(
        "auth:buildAccessTokenCookie",
        runtime.buildAccessTokenCookie,
    );
    capabilities.contribute(
        "tfa:createPendingLoginAttempt",
        runtime.createPendingTfaLoginAttempt,
    );
    capabilities.contribute(
        "tfa:getPendingLoginAttempt",
        runtime.getPendingTfaLoginAttempt,
    );
    capabilities.contribute(
        "tfa:clearPendingLoginAttempt",
        runtime.clearPendingTfaLoginAttempt,
    );
}
