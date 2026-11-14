import type { CapabilityContracts, Ctx } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { TfaChallengeLifetime } from "../contracts/method.js";
import { assertLiveChallenge } from "../challenge-lifetimes.js";

export function readLoginLifetime(
    capabilities: GatewayBootstrapContext["capabilities"],
    loginAttemptId: string,
    accountId: string,
): TfaChallengeLifetime {
    const root = capabilities.require<Ctx>("system:ctx");
    const read = root
        .requireCapability<CapabilityContracts>("system:contracts")
        .resolve<
            (
                id: string,
            ) => (TfaChallengeLifetime & { accountId: string }) | null
        >("auth:getPendingLoginLifetime", 1);
    const lifetime = read(loginAttemptId);
    if (
        !lifetime ||
        lifetime.id !== loginAttemptId ||
        lifetime.accountId !== accountId
    )
        throw new Error("tfa_attempt_expired");
    assertLiveChallenge(lifetime);
    return lifetime;
}
