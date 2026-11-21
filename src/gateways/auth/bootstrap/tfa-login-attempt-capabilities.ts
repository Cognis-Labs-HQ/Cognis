import {
    requireBootstrapScope,
    type Ctx,
    type CapabilityContracts,
} from "@cognis/core";
import type { AuthRouteBootstrapHookContext } from "./index.js";

export async function registerAuthRouteBootstrapHook({
    capabilities,
    runtime,
}: AuthRouteBootstrapHookContext): Promise<void> {
    const root = capabilities.require<Ctx>("system:ctx");
    requireBootstrapScope(root).registerDisposer(
        runtime.clearPendingTfaLoginAttempts,
    );
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "auth:consumePendingLoginAttempt",
        {
            version: 1,
            kind: "function",
            description:
                "Atomically consume one unexpired primary-authenticated login attempt after factor verification.",
        },
    );
    capabilities.contribute(
        "auth:consumePendingLoginAttempt",
        runtime.consumePendingTfaLoginAttempt,
    );
    root.contributePublicCapability(
        "auth:consumePendingLoginAttempt",
        runtime.consumePendingTfaLoginAttempt,
    );
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "auth:getPendingLoginLifetime",
        {
            version: 1,
            kind: "function",
            description:
                "Read the immutable expiry and cancellation signal of a pending primary-authenticated login attempt.",
        },
    );
    capabilities.contribute(
        "auth:getPendingLoginLifetime",
        runtime.getPendingLoginLifetime,
    );
    root.contributePublicCapability(
        "auth:getPendingLoginLifetime",
        runtime.getPendingLoginLifetime,
    );
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
