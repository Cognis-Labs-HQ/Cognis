import type { RouteLifetime } from "./route-lifetime.js";
import type { ServerResponse } from "node:http";
import type { AccessRole } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";

export interface AssuredSession {
    accountId: string;
    role: AccessRole;
    ttlSeconds: number | null;
    providerId?: string;
    isAssuranceCurrent?: () => boolean;
}

export type CompleteSession = (
    input: AssuredSession,
) => Promise<{ outcome: string; token?: string }>;

export async function commitVerifiedSession(
    complete: CompleteSession,
    input: AssuredSession,
    res: ServerResponse,
    log?: GatewayBootstrapContext["log"],
): Promise<string | null> {
    let result: Awaited<ReturnType<CompleteSession>>;
    try {
        result = await complete(input);
    } catch (error) {
        log?.("error", "Verified session commit failed.", {
            component: "tfa-gateway",
            operation: "completeSession",
            accountId: input.accountId,
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        result = { outcome: "session_unavailable" };
    }
    if (result.outcome === "success" && result.token) return result.token;
    const denied = ["account_archived", "account_disabled"].includes(
        result.outcome,
    );
    const code = denied ? result.outcome : "session_unavailable";
    res.writeHead(denied ? 403 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code, message: code } }));
    return null;
}

export function rejectExpiredAssurance(
    res: ServerResponse,
    lifetime: Pick<RouteLifetime, "isCurrent"> | undefined,
    revision: number | undefined,
): boolean {
    if (!lifetime || lifetime.isCurrent(revision ?? -1)) return false;
    res.writeHead(503, { "content-type": "application/json" });
    res.end(
        JSON.stringify({
            error: { code: "tfa_unavailable", message: "tfa_unavailable" },
        }),
    );
    return true;
}
