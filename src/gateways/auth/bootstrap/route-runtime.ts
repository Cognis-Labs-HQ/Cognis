import { randomBytes, randomInt } from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
    buildAccessTokenCookie,
    shouldSetSecureCookie,
} from "../../../api/reuse/access-token-http.js";
import type {
    AuthRouteBootstrapRuntime,
    PendingTfaLoginAttempt,
} from "./index.js";

// 18 random bytes provide ample entropy for short-lived login-attempt IDs.
export const TFA_LOGIN_ATTEMPT_ID_BYTES = 18;
// Pending TFA login attempts expire after 5 minutes to limit replay windows.
export const TFA_LOGIN_ATTEMPT_TTL_MS = 5 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;
export const PASSWORD_RESET_RATE_LIMIT_MS = 60_000;
export const PASSWORD_RESET_MIN_RESPONSE_MS = 350;
export const PASSWORD_RESET_RESPONSE_JITTER_MS = 120;
export const PASSWORD_RESET_LOOKUP_JITTER_MS = 40;

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForPasswordResetResponseFloor(
    startedAt: number,
): Promise<void> {
    const jitterMs = randomInt(0, PASSWORD_RESET_RESPONSE_JITTER_MS);
    const targetMs = PASSWORD_RESET_MIN_RESPONSE_MS + jitterMs;
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= targetMs) return;
    await sleep(targetMs - elapsedMs);
}

export function createAuthRouteBootstrapRuntime(): AuthRouteBootstrapRuntime {
    const pendingTfaLoginAttempts = new Map<string, PendingTfaLoginAttempt>();

    function pruneExpiredTfaLoginAttempts(now = Date.now()): void {
        for (const [
            loginAttemptId,
            entry,
        ] of pendingTfaLoginAttempts.entries()) {
            if (entry.expiresAt < now) {
                pendingTfaLoginAttempts.delete(loginAttemptId);
            }
        }
    }

    return {
        buildAccessTokenCookie(
            req: IncomingMessage,
            rawToken: string,
            ttlSeconds: number | null,
        ): string {
            return buildAccessTokenCookie(
                rawToken,
                ttlSeconds,
                shouldSetSecureCookie(req),
            );
        },
        clearPendingTfaLoginAttempt(loginAttemptId: string): void {
            pendingTfaLoginAttempts.delete(loginAttemptId);
        },
        createPendingTfaLoginAttempt(
            input: Omit<PendingTfaLoginAttempt, "id" | "expiresAt">,
        ): PendingTfaLoginAttempt {
            pruneExpiredTfaLoginAttempts();
            const pendingAttempt: PendingTfaLoginAttempt = {
                ...input,
                id: `tfa_login_${randomBytes(TFA_LOGIN_ATTEMPT_ID_BYTES).toString("base64url")}`,
                expiresAt: Date.now() + TFA_LOGIN_ATTEMPT_TTL_MS,
            };
            pendingTfaLoginAttempts.set(pendingAttempt.id, pendingAttempt);
            return pendingAttempt;
        },
        getAccessTokenTtlSeconds(): number {
            return 43_200;
        },
        getPendingTfaLoginAttempt(
            loginAttemptId: string,
        ): PendingTfaLoginAttempt | null {
            pruneExpiredTfaLoginAttempts();
            return pendingTfaLoginAttempts.get(loginAttemptId) ?? null;
        },
    };
}
