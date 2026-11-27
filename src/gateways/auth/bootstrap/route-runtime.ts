import { randomBytes, randomInt } from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
    buildAccessTokenCookie,
    shouldSetSecureCookie,
} from "../../../api/reuse/access-token-http.js";
import type {
    AuthRouteBootstrapRuntime,
    PendingAccountCreationAttempt,
    PendingTfaLoginAttempt,
} from "./index.js";

// 18 random bytes provide ample entropy for short-lived login-attempt IDs.
export const TFA_LOGIN_ATTEMPT_ID_BYTES = 18;
// Pending TFA login attempts expire after 5 minutes to limit replay windows.
const TFA_LOGIN_ATTEMPT_TTL_MILLISECONDS = 5 * 60 * 1000;
export { TFA_LOGIN_ATTEMPT_TTL_MILLISECONDS as TFA_LOGIN_ATTEMPT_TTL_MS };
const ACCOUNT_CREATION_ATTEMPT_TTL_MILLISECONDS = 10 * 60 * 1000;
export { ACCOUNT_CREATION_ATTEMPT_TTL_MILLISECONDS as ACCOUNT_CREATION_ATTEMPT_TTL_MS };
const ACCOUNT_CREATION_COOKIE = "cognis_account_creation";
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;
const PASSWORD_RESET_RATE_LIMIT_MILLISECONDS = 60_000;
export { PASSWORD_RESET_RATE_LIMIT_MILLISECONDS as PASSWORD_RESET_RATE_LIMIT_MS };
const PASSWORD_RESET_MIN_RESPONSE_MILLISECONDS = 350;
export { PASSWORD_RESET_MIN_RESPONSE_MILLISECONDS as PASSWORD_RESET_MIN_RESPONSE_MS };
const PASSWORD_RESET_RESPONSE_JITTER_MILLISECONDS = 120;
export { PASSWORD_RESET_RESPONSE_JITTER_MILLISECONDS as PASSWORD_RESET_RESPONSE_JITTER_MS };
const PASSWORD_RESET_LOOKUP_JITTER_MILLISECONDS = 40;
export { PASSWORD_RESET_LOOKUP_JITTER_MILLISECONDS as PASSWORD_RESET_LOOKUP_JITTER_MS };

export function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForPasswordResetResponseFloor(
    startedAt: number,
): Promise<void> {
    const jitterMilliseconds = randomInt(
        0,
        PASSWORD_RESET_RESPONSE_JITTER_MILLISECONDS,
    );
    const targetMilliseconds =
        PASSWORD_RESET_MIN_RESPONSE_MILLISECONDS + jitterMilliseconds;
    const elapsedMilliseconds = Date.now() - startedAt;
    if (elapsedMilliseconds >= targetMilliseconds) return;
    await sleep(targetMilliseconds - elapsedMilliseconds);
}

export function createAuthRouteBootstrapRuntime(): AuthRouteBootstrapRuntime {
    const pendingTfaLoginAttempts = new Map<string, PendingTfaLoginAttempt>();
    const pendingAccountCreationAttempts = new Map<
        string,
        PendingAccountCreationAttempt
    >();

    function pruneExpiredTfaLoginAttempts(now = Date.now()): void {
        for (const [
            loginAttemptId,
            entry,
        ] of pendingTfaLoginAttempts.entries()) {
            if (entry.expiresAt <= now) {
                pendingTfaLoginAttempts.delete(loginAttemptId);
            }
        }
    }

    function pruneExpiredAccountCreationAttempts(now = Date.now()): void {
        for (const [attemptId, entry] of pendingAccountCreationAttempts) {
            if (entry.expiresAt <= now) {
                pendingAccountCreationAttempts.delete(attemptId);
            }
        }
    }

    return {
        buildPendingAccountCreationCookie(
            request: IncomingMessage,
            attemptId: string,
        ): string {
            const securePart = shouldSetSecureCookie(request) ? "; Secure" : "";
            return `${ACCOUNT_CREATION_COOKIE}=${encodeURIComponent(attemptId)}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=${ACCOUNT_CREATION_ATTEMPT_TTL_MILLISECONDS / 1000}${securePart}`;
        },
        clearPendingAccountCreationCookie(request: IncomingMessage): string {
            const securePart = shouldSetSecureCookie(request) ? "; Secure" : "";
            return `${ACCOUNT_CREATION_COOKIE}=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0${securePart}`;
        },
        extractPendingAccountCreationAttemptId(
            request: IncomingMessage,
        ): string | null {
            for (const cookie of String(request.headers.cookie ?? "").split(
                ";",
            )) {
                const [name, ...valueParts] = cookie.trim().split("=");
                if (name !== ACCOUNT_CREATION_COOKIE) continue;
                const attemptId = valueParts.join("=");
                return /^account_creation_[A-Za-z0-9_-]+$/.test(attemptId)
                    ? attemptId
                    : null;
            }
            return null;
        },
        buildAccessTokenCookie(
            request: IncomingMessage,
            rawToken: string,
            ttlSeconds: number | null,
        ): string {
            return buildAccessTokenCookie(
                rawToken,
                ttlSeconds,
                shouldSetSecureCookie(request),
            );
        },
        clearPendingTfaLoginAttempt(loginAttemptId: string): void {
            pendingTfaLoginAttempts.delete(loginAttemptId);
        },
        clearPendingAccountCreationAttempt(attemptId: string): void {
            pendingAccountCreationAttempts.delete(attemptId);
        },
        createPendingAccountCreationAttempt(
            input: Omit<PendingAccountCreationAttempt, "id" | "expiresAt">,
        ): PendingAccountCreationAttempt {
            pruneExpiredAccountCreationAttempts();
            const pendingAttempt: PendingAccountCreationAttempt = {
                ...input,
                id: `account_creation_${randomBytes(TFA_LOGIN_ATTEMPT_ID_BYTES).toString("base64url")}`,
                expiresAt:
                    Date.now() + ACCOUNT_CREATION_ATTEMPT_TTL_MILLISECONDS,
            };
            pendingAccountCreationAttempts.set(
                pendingAttempt.id,
                pendingAttempt,
            );
            return pendingAttempt;
        },
        createPendingTfaLoginAttempt(
            input: Omit<PendingTfaLoginAttempt, "id" | "expiresAt">,
        ): PendingTfaLoginAttempt {
            pruneExpiredTfaLoginAttempts();
            const pendingAttempt: PendingTfaLoginAttempt = {
                ...input,
                id: `tfa_login_${randomBytes(TFA_LOGIN_ATTEMPT_ID_BYTES).toString("base64url")}`,
                expiresAt: Date.now() + TFA_LOGIN_ATTEMPT_TTL_MILLISECONDS,
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
        getPendingAccountCreationAttempt(
            attemptId: string,
        ): PendingAccountCreationAttempt | null {
            pruneExpiredAccountCreationAttempts();
            return pendingAccountCreationAttempts.get(attemptId) ?? null;
        },
    };
}
