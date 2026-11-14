import type { AccessRole } from "@cognis/core";

export interface AccountTargetRequest {
    actor: { sub: string; role: AccessRole };
    accountId: string;
    allowSelf: boolean;
    /** Omit or use true for ordinary targeting; deprovision forbids founders. */
    allowFounder?: boolean;
}

export type AccountTargetDecision =
    | { allowed: true; accountId: string; isCurrent(): boolean }
    | { allowed: false; status: 400 | 403 | 404 | 503; code: string };

export type AuthorizeAccountTarget = (
    input: AccountTargetRequest,
) => Promise<AccountTargetDecision>;
