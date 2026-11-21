import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    AccessRole,
    BootstrapLog,
    CapabilityContracts,
    Ctx,
} from "@cognis/core";
import type { RouteContext } from "../../reuse/route-context.js";

/** Structural shape consumed from the versioned runtime contract; Auth owns the policy. */
export type AccountTargetDecision =
    | { allowed: true; accountId: string; isCurrent(): boolean }
    | { allowed: false; status: 400 | 403 | 404 | 503; code: string };

export type AuthorizeAccountTarget = (input: {
    actor: { sub: string; role: AccessRole };
    accountId: string;
    allowSelf: boolean;
    allowFounder?: boolean;
}) => Promise<AccountTargetDecision>;

export interface ManagementTargetAuthorization {
    /** Pure lifetime check for downstream staged flow handlers. */
    isCurrent(): boolean;
    /** Check the lease and respond with a safe error when it is no longer current. */
    check(): boolean;
}

const POLICY_ID = "auth:authorizeAccountTarget";
const DENIALS = new Set([
    "400:bad_request",
    "403:forbidden",
    "403:protected_self_account",
    "403:protected_admin_account",
    "403:protected_founder_account",
    "404:not_found",
    "503:account_policy_unavailable",
]);
const ERROR_MESSAGES: Readonly<Record<string, string>> = {
    protected_self_account: "Accounts cannot modify themselves here",
    protected_admin_account: "Only owner can modify admin or owner accounts",
    forbidden: "Access denied",
    not_found: "User not found",
};

export function isAccountTargetDenial(
    value: unknown,
): value is Extract<AccountTargetDecision, { allowed: false }> {
    const decision = value as Partial<AccountTargetDecision> | null;
    return (
        decision?.allowed === false &&
        typeof decision.status === "number" &&
        typeof decision.code === "string" &&
        DENIALS.has(`${decision.status}:${decision.code}`)
    );
}

export function rejectAccountTarget(
    res: ServerResponse,
    decision: Extract<AccountTargetDecision, { allowed: false }>,
): void {
    res.writeHead(decision.status, { "content-type": "application/json" });
    res.end(
        JSON.stringify({
            error: {
                code: decision.code,
                message: ERROR_MESSAGES[decision.code] ?? decision.code,
            },
        }),
    );
}

/** Resolve Auth's public policy for management only; display reads keep their existing guards. */
export async function authorizeManagementTarget(
    ctx: RouteContext,
    req: IncomingMessage,
    res: ServerResponse,
    accountId: string,
    expectedActor: Readonly<{ sub: string; role: AccessRole }>,
    log?: BootstrapLog,
): Promise<ManagementTargetAuthorization | undefined> {
    const unavailable = (
        reason: string,
        level: "warn" | "error" = "warn",
    ): undefined => {
        log?.(level, "Account target authorization unavailable.", {
            component: "api-users",
            operation: "authorizeAccountTarget",
            reason,
        });
        rejectAccountTarget(res, {
            allowed: false,
            status: 503,
            code: "account_policy_unavailable",
        });
        return undefined;
    };
    try {
        const claims = ctx.getAuthClaims(req);
        if (!claims) {
            rejectAccountTarget(res, {
                allowed: false,
                status: 403,
                code: "forbidden",
            });
            return undefined;
        }
        const actor = Object.freeze({
            sub: expectedActor.sub,
            role: expectedActor.role,
        });
        if (claims.sub !== actor.sub || claims.role !== actor.role) {
            return unavailable("authorization_changed");
        }
        const root = ctx.getCapability<Ctx>("system:ctx");
        const contracts =
            root?.getCapability<CapabilityContracts>("system:contracts");
        const implementation =
            root?.getCapability<AuthorizeAccountTarget>(POLICY_ID);
        const declaration = contracts?.describe(POLICY_ID);
        if (
            !root ||
            !root.isPublicCapability(POLICY_ID) ||
            !contracts ||
            typeof implementation !== "function" ||
            !declaration
        ) {
            return unavailable("policy_missing");
        }
        const authorize = contracts.resolve<AuthorizeAccountTarget>(
            POLICY_ID,
            1,
        );
        const decision = await authorize(
            Object.freeze({
                actor,
                accountId,
                allowSelf: false,
            }),
        );
        const identityIsCurrent = (): boolean => {
            const currentClaims = ctx.getAuthClaims(req);
            return Boolean(
                currentClaims &&
                currentClaims.sub === actor.sub &&
                currentClaims.role === actor.role &&
                ctx.getCapability("system:ctx") === root &&
                root.getCapability("system:contracts") === contracts &&
                root.isPublicCapability(POLICY_ID) &&
                root.getCapability(POLICY_ID) === implementation &&
                contracts.describe(POLICY_ID) === declaration,
            );
        };
        if (!identityIsCurrent()) return unavailable("authorization_changed");
        if (decision?.allowed === true) {
            if (
                decision.accountId !== accountId ||
                typeof decision.isCurrent !== "function" ||
                decision.isCurrent() !== true
            ) {
                return unavailable("authorization_expired");
            }
            const current = (): boolean =>
                identityIsCurrent() &&
                decision.allowed === true &&
                decision.accountId === accountId &&
                typeof decision.isCurrent === "function" &&
                decision.isCurrent() === true;
            return Object.freeze({
                isCurrent(): boolean {
                    try {
                        return current();
                    } catch {
                        return false;
                    }
                },
                check(): boolean {
                    try {
                        if (current()) return true;
                        unavailable("authorization_expired");
                    } catch {
                        unavailable("policy_failed", "error");
                    }
                    return false;
                },
            });
        }
        if (!isAccountTargetDenial(decision)) {
            return unavailable("invalid_policy_response");
        }
        if (decision.status === 503) return unavailable("policy_unavailable");
        rejectAccountTarget(res, decision);
        return undefined;
    } catch {
        return unavailable("policy_failed", "error");
    }
}
