import {
    readJson,
    requireAuth,
    type CapabilityStore,
} from "../../../shared.js";
import type { GatewayBootstrapContext } from "../../../shared.js";
import type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";
import {
    AUTH_PASSWORD_POLICY_KEY,
    defaultPasswordPolicy,
    parsePasswordPolicy,
} from "../../password-policy.js";
import type { AuthGatewayRouteHandler, AuthRouteLogMeta } from "./shared.js";
import {
    LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY,
    resolveLoginSessionTimeoutPreference,
} from "../../session-timeout.js";

export interface SecuritySubsection {
    id: string;
    scriptUrl: string;
    stringsBaseUrl?: string | string[];
}

interface SecuritySettings {
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
    loginSessionTimeoutMinutes: number;
}

interface SecurityRouteDependencies {
    capabilities: CapabilityStore;
    securitySubsections: SecuritySubsection[];
    registrationsEnabled: () => Promise<boolean>;
    readSecuritySettings: () => Promise<SecuritySettings>;
    log?: GatewayBootstrapContext["log"];
}

export function createSecurityRoutes({
    capabilities,
    securitySubsections,
    registrationsEnabled,
    readSecuritySettings,
    log,
}: SecurityRouteDependencies): AuthGatewayRouteHandler {
    function revokeUserSessions(accountId: string): number {
        return (
            capabilities.get<(subject: string) => number>(
                "auth:revokeAccessTokensForSubject",
            )?.(accountId) ?? 0
        );
    }

    async function readCurrentTimeoutMinutes(
        preferenceStore: UserPreferenceStore,
        accountId: string,
        maximumMinutes: number,
    ): Promise<number> {
        const stored = await preferenceStore
            .get(accountId, LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY)
            .catch(() => null);
        return resolveLoginSessionTimeoutPreference(stored, maximumMinutes)
            .timeoutMinutes;
    }

    function applyTimeoutToSessions(
        accountId: string,
        currentTimeoutMinutes: number,
        nextTimeoutMinutes: number,
    ): { appliesOnNextLogin: boolean; revokedSessionCount: number } {
        const appliesOnNextLogin = nextTimeoutMinutes > currentTimeoutMinutes;
        return {
            appliesOnNextLogin,
            revokedSessionCount: appliesOnNextLogin
                ? 0
                : revokeUserSessions(accountId),
        };
    }

    return async (
        req,
        res,
        url,
        logMeta: AuthRouteLogMeta,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/auth/security-sections" &&
            req.method === "GET"
        ) {
            if (!requireAuth(req, res, "user")) return true;
            log?.("debug", "Listed auth security sections.", {
                ...logMeta,
                count: securitySubsections.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: securitySubsections }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/registration-config" &&
            req.method === "GET"
        ) {
            const enabled = await registrationsEnabled();
            const { userValidationMode } = await readSecuritySettings();
            log?.("debug", "Read registration config.", {
                ...logMeta,
                registrationsEnabled: enabled,
                userValidationMode,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        registrationsEnabled: enabled,
                        userValidationMode,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/password-policy" &&
            req.method === "GET"
        ) {
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            let policy = defaultPasswordPolicy();
            if (preferenceStore) {
                const raw = await preferenceStore
                    .get("__system__", AUTH_PASSWORD_POLICY_KEY)
                    .catch(() => null);
                if (raw) {
                    try {
                        policy = parsePasswordPolicy(JSON.parse(raw));
                    } catch {
                        policy = defaultPasswordPolicy();
                    }
                }
            }
            log?.("debug", "Served password policy.", logMeta);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: policy }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/login-session-timeout" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const { loginSessionTimeoutMinutes: maximumMinutes } =
                await readSecuritySettings();
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            const stored = await preferenceStore
                ?.get(claims.sub, LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY)
                .catch(() => null);
            const { timeoutMinutes, shouldPersist } =
                resolveLoginSessionTimeoutPreference(stored, maximumMinutes);
            if (shouldPersist && typeof preferenceStore?.set === "function") {
                await preferenceStore
                    .set(
                        claims.sub,
                        LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY,
                        String(timeoutMinutes),
                    )
                    .catch(() => undefined);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        timeoutMinutes,
                        maximumMinutes,
                        usesDefault: false,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/login-session-timeout" &&
            req.method === "PUT"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const { loginSessionTimeoutMinutes: maximumMinutes } =
                await readSecuritySettings();
            const body = await readJson(req);
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            if (!preferenceStore) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "preferences_unavailable",
                            message: "Preference storage is unavailable.",
                        },
                    }),
                );
                return true;
            }
            if (body.useDefault === true) {
                const currentTimeoutMinutes = await readCurrentTimeoutMinutes(
                    preferenceStore,
                    claims.sub,
                    maximumMinutes,
                );
                await preferenceStore.set(
                    claims.sub,
                    LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY,
                    String(maximumMinutes),
                );
                const { appliesOnNextLogin, revokedSessionCount } =
                    applyTimeoutToSessions(
                        claims.sub,
                        currentTimeoutMinutes,
                        maximumMinutes,
                    );
                log?.("info", "Reset login session timeout preference.", {
                    ...logMeta,
                    accountId: claims.sub,
                    revokedSessionCount,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: {
                            timeoutMinutes: maximumMinutes,
                            usesDefault: true,
                            appliesOnNextLogin,
                        },
                    }),
                );
                return true;
            }
            const timeoutMinutes = body.timeoutMinutes;
            if (
                maximumMinutes === 0 ||
                !Number.isInteger(timeoutMinutes) ||
                Number(timeoutMinutes) < 1 ||
                Number(timeoutMinutes) > maximumMinutes
            ) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_session_timeout",
                            message: `timeoutMinutes must be an integer from 1 to ${maximumMinutes}.`,
                        },
                    }),
                );
                return true;
            }
            const currentTimeoutMinutes = await readCurrentTimeoutMinutes(
                preferenceStore,
                claims.sub,
                maximumMinutes,
            );
            await preferenceStore.set(
                claims.sub,
                LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY,
                String(timeoutMinutes),
            );
            const { appliesOnNextLogin, revokedSessionCount } =
                applyTimeoutToSessions(
                    claims.sub,
                    currentTimeoutMinutes,
                    timeoutMinutes,
                );
            log?.("info", "Updated login session timeout preference.", {
                ...logMeta,
                accountId: claims.sub,
                timeoutMinutes,
                revokedSessionCount,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { timeoutMinutes, appliesOnNextLogin },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/password-policy" &&
            req.method === "PUT"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            const policy = parsePasswordPolicy(body);
            const preferenceStore =
                capabilities.get<UserPreferenceStore>("preferences:store");
            if (preferenceStore) {
                await preferenceStore.set(
                    "__system__",
                    AUTH_PASSWORD_POLICY_KEY,
                    JSON.stringify(policy),
                );
            }
            log?.("info", "Updated password policy.", {
                ...logMeta,
                accountId: claims.sub,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        return false;
    };
}
