import type { IncomingMessage } from "node:http";
import {
    registerBootstrapFlow,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreShareGateway } from "../gateway/index.js";
import {
    resolveShareGuestId,
    resolveShareGuestSessionId,
} from "../reuse/share-guest.js";

interface GuestClaims {
    sub: string;
    role: "user";
    providerId: string;
    purpose: "share";
    setupPending: boolean;
}

/** Verifies guest credentials and rechecks their current grant on every admission. */
export function registerGuestCredentialAccess(
    ctx: GatewayBootstrapContext,
    gateway: CoreShareGateway,
): void {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const verify = ctx.capabilities.require<
        (req: IncomingMessage, purpose: "share") => GuestClaims | null
    >("auth:readCredentialClaims");
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "share:getGuestClaims",
        {
            version: 1,
            kind: "function",
            description:
                "Verify a guest credential against its live Share grant. Resource consumers must additionally authorize their target capability.",
        },
    );
    const flow = registerBootstrapFlow(root, {
        id: "share:authenticateGuest",
        stages: ["classifyCredential", "validateGrant"],
    });
    flow.extend(
        "classifyCredential",
        { id: "share:classifyGuestCredential" },
        ({ input, data }) => {
            const claims = input as GuestClaims | null;
            if (
                claims?.purpose === "share" &&
                claims.role === "user" &&
                !claims.setupPending
            ) {
                data.claims = claims;
            }
        },
    );
    flow.extend(
        "validateGrant",
        { id: "share:validateGuestGrant" },
        async ({ data }) => {
            const claims = data.claims as GuestClaims | undefined;
            if (!claims) return;
            data.claims = null;
            const shareId = resolveShareGuestId(claims);
            const guestId = resolveShareGuestSessionId(claims);
            if (!shareId || !guestId) return;
            const record = await gateway.getTokenById(shareId);
            if (
                !record ||
                gateway.isTokenExpired(record) ||
                !record.grantedCapabilities.length
            )
                return;
            if (
                record.accessControls.recipients.some(
                    (recipient) => recipient.type === "user",
                )
            )
                return;
            const profile = await gateway.getGuestProfile(guestId);
            if (
                !profile ||
                profile.shareId !== shareId ||
                !Number.isFinite(Date.parse(profile.expiresAt)) ||
                Date.parse(profile.expiresAt) <= Date.now()
            )
                return;
            data.claims = claims;
        },
    );
    ctx.capabilities.contribute(
        "share:getGuestClaims",
        async (req: IncomingMessage): Promise<GuestClaims | null> => {
            const claims = verify(req, "share");
            const result = await root.flow.run(
                "share:authenticateGuest",
                claims,
            );
            return (result.data.claims as GuestClaims | null) ?? null;
        },
    );
}
