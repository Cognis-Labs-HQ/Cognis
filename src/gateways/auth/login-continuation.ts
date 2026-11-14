import type { IncomingMessage } from "node:http";
import { shouldSetSecureCookie } from "../../api/reuse/access-token-http.js";
import type { PendingTfaLoginAttempt } from "./bootstrap/index.js";
import type { LoginFlowSessionResult } from "./bootstrap/routes/shared.js";

const COOKIE_NAME = "cognis_login_attempt";

export interface LoginContinuationData extends Omit<
    PendingTfaLoginAttempt,
    "id" | "expiresAt"
> {
    tfaRequired: true;
    loginUrl: "/login";
    loginAttemptId: string;
    methods: unknown[];
}

export interface LoginContinuation {
    bind(
        req: IncomingMessage,
        result: LoginFlowSessionResult,
    ): { cookie: string; data: LoginContinuationData };
    resume(req: IncomingMessage): LoginContinuationData | null;
    cancel(req: IncomingMessage, expectedAttemptId: string): void;
    clear(req: IncomingMessage): void;
    dispose(): void;
}

function readAttemptId(req: IncomingMessage): string | null {
    const values = String(req.headers.cookie ?? "")
        .split(";")
        .map((entry) => entry.trim());
    const matches = values.filter((entry) =>
        entry.startsWith(`${COOKIE_NAME}=`),
    );
    if (matches.length !== 1) return null;
    const value = matches[0].slice(COOKIE_NAME.length + 1);
    return /^tfa_login_[A-Za-z0-9_-]{24}$/.test(value) ? value : null;
}

export function createLoginContinuation(
    getAttempt: (id: string) => PendingTfaLoginAttempt | null,
    clearAttempt: (id: string) => void,
): LoginContinuation {
    const presentations = new Map<string, LoginContinuationData>();
    function prune(): void {
        for (const id of presentations.keys()) {
            if (!getAttempt(id)) presentations.delete(id);
        }
    }
    function clear(req: IncomingMessage): void {
        const id = readAttemptId(req);
        if (id) {
            clearAttempt(id);
            presentations.delete(id);
        }
    }
    return {
        bind(req, result) {
            prune();
            const attempt =
                typeof result.loginAttemptId === "string"
                    ? getAttempt(result.loginAttemptId)
                    : null;
            if (
                !attempt ||
                attempt.accountId !== result.accountId ||
                attempt.providerId !== result.providerId ||
                result.token ||
                !Array.isArray(result.methods) ||
                !result.methods.length
            ) {
                throw new Error("login_attempt_unavailable");
            }
            const data: LoginContinuationData = {
                accountId: attempt.accountId,
                displayName: attempt.displayName,
                role: attempt.role,
                provider: attempt.provider,
                providerId: attempt.providerId,
                isFounder: attempt.isFounder,
                userValidationMode: attempt.userValidationMode,
                requiredUserValidation: attempt.requiredUserValidation,
                ttlSeconds: attempt.ttlSeconds,
                tfaRequired: true,
                loginUrl: "/login",
                loginAttemptId: attempt.id,
                methods: structuredClone(result.methods),
            };
            const previousId = readAttemptId(req);
            if (previousId && previousId !== attempt.id) clear(req);
            presentations.set(attempt.id, data);
            const seconds = Math.max(
                0,
                Math.floor((attempt.expiresAt - Date.now()) / 1000),
            );
            const secure = shouldSetSecureCookie(req) ? "; Secure" : "";
            return {
                cookie: `${COOKIE_NAME}=${attempt.id}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure}`,
                data: structuredClone(data),
            };
        },
        resume(req) {
            prune();
            const id = readAttemptId(req);
            const data = id ? presentations.get(id) : undefined;
            return data ? structuredClone(data) : null;
        },
        cancel(req, expectedAttemptId) {
            prune();
            if (readAttemptId(req) === expectedAttemptId) clear(req);
            // Do not expire the cookie: a delayed response could erase a newer tab's attempt.
        },
        clear,
        dispose() {
            presentations.clear();
        },
    };
}
