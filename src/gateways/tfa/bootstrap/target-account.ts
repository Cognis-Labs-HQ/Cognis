import type { AccessRole, CapabilityContracts, Ctx } from "@cognis/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthorizeAccountTarget } from "../../auth/contracts/account-target.js";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { RouteLifetime } from "./route-lifetime.js";

type Actor = { sub: string; role: AccessRole };

interface TargetAuthorization {
    accountId: string;
    check(): boolean;
}

export async function authorizeTargetAccount(input: {
    claims: Actor;
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    capabilities: GatewayBootstrapContext["capabilities"];
    lifetime?: Pick<RouteLifetime, "isCurrent">;
    revision?: number;
    log?: GatewayBootstrapContext["log"];
    encodedAccountId?: string;
}): Promise<TargetAuthorization | null> {
    const { claims, req, res, url, capabilities, lifetime, revision, log } =
        input;
    const reject = (status: number, code: string): null => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { code } }));
        return null;
    };
    const unavailable = (error: unknown): null => {
        log?.("error", "TFA account target authorization is unavailable.", {
            component: "tfa-gateway",
            operation: "authorizeAccountTarget",
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return reject(503, "account_policy_unavailable");
    };
    let accountId: string;
    try {
        if (input.encodedAccountId !== undefined) {
            accountId = decodeURIComponent(input.encodedAccountId);
        } else {
            const requested = url.searchParams.getAll("accountId");
            if (requested.length > 1) return reject(400, "bad_request");
            accountId = requested.length ? requested[0] : claims.sub;
        }
    } catch (error) {
        log?.("error", "Invalid encoded TFA account target.", {
            component: "tfa-gateway",
            operation: "decodeAccountTarget",
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return reject(400, "bad_request");
    }
    if (!accountId || /[\s\p{Cc}/\\]/u.test(accountId))
        return reject(400, "bad_request");
    const actor = Object.freeze({ sub: claims.sub, role: claims.role });
    const assertActorCurrent = (): void => {
        const current =
            capabilities.get<(request: IncomingMessage) => Actor | null>(
                "auth:getAuthClaims",
            )?.(req);
        if (
            (lifetime && !lifetime.isCurrent(revision ?? -1)) ||
            current?.sub !== actor.sub ||
            current.role !== actor.role
        )
            throw new Error("account_policy_unavailable");
    };
    try {
        assertActorCurrent();
    } catch (error) {
        return unavailable(error);
    }
    if (accountId === actor.sub) {
        return {
            accountId,
            check: () => {
                try {
                    assertActorCurrent();
                    return true;
                } catch (error) {
                    unavailable(error);
                    return false;
                }
            },
        };
    }
    try {
        const root = capabilities.require<Ctx>("system:ctx");
        const contracts =
            root.requireCapability<CapabilityContracts>("system:contracts");
        const contractId = "auth:authorizeAccountTarget";
        const declaration = contracts.describe(contractId);
        const implementation = root.getCapability(contractId);
        const authorize = contracts.resolve<AuthorizeAccountTarget>(
            contractId,
            1,
        );
        const decision = await authorize(
            Object.freeze({ actor, accountId, allowSelf: true }),
        );
        const assertContextCurrent = (): void => {
            assertActorCurrent();
            if (
                capabilities.get("system:ctx") !== root ||
                root.getCapability("system:contracts") !== contracts ||
                contracts.describe(contractId) !== declaration ||
                root.getCapability(contractId) !== implementation ||
                !root.isPublicCapability(contractId)
            )
                throw new Error("account_policy_unavailable");
        };
        assertContextCurrent();
        const check = (): boolean => {
            try {
                assertContextCurrent();
                if (
                    decision.allowed !== true ||
                    decision.accountId !== accountId ||
                    typeof decision.isCurrent !== "function" ||
                    decision.isCurrent() !== true
                )
                    throw new Error("account_policy_unavailable");
                return true;
            } catch (error) {
                unavailable(error);
                return false;
            }
        };
        if (!decision || typeof decision !== "object")
            return unavailable(new Error("invalid_policy_decision"));
        if (decision.allowed === false) {
            const codes: Record<number, readonly string[]> = {
                400: ["bad_request"],
                403: [
                    "forbidden",
                    "protected_admin_account",
                    "protected_self_account",
                ],
                404: ["not_found"],
                503: ["account_policy_unavailable"],
            };
            if (
                typeof decision.status !== "number" ||
                !codes[decision.status]?.includes(decision.code)
            )
                return unavailable(new Error("invalid_policy_decision"));
            return reject(decision.status, decision.code);
        }
        if (!check()) return null;
        return { accountId, check };
    } catch (error) {
        return unavailable(error);
    }
}
