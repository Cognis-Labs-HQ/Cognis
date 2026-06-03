import { issueAccessToken } from "../../access-tokens.js";
import { validateUsername } from "../../../../api/reuse/account-store.js";
import type { AuthAccountStore } from "../index.js";
import type {
    CapabilityStore,
    GatewayBootstrapContext,
} from "../../../shared.js";
import { readJson } from "../../../shared.js";
import type { AuthGatewayRouteHandler, AuthRouteLogMeta } from "./shared.js";

interface SecuritySettings {
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
}

interface RegistrationRouteDependencies {
    accountStore: AuthAccountStore;
    capabilities: CapabilityStore;
    registrationsEnabled: () => Promise<boolean>;
    readSecuritySettings: () => Promise<SecuritySettings>;
    log?: GatewayBootstrapContext["log"];
}

export function createRegistrationRoutes({
    accountStore,
    capabilities,
    registrationsEnabled,
    readSecuritySettings,
    log,
}: RegistrationRouteDependencies): AuthGatewayRouteHandler {
    return async (
        req,
        res,
        url,
        logMeta: AuthRouteLogMeta,
    ): Promise<boolean> => {
        if (url.pathname !== "/api/v1/auth/register" || req.method !== "POST") {
            return false;
        }

        if (!(await registrationsEnabled())) {
            log?.(
                "warn",
                "Blocked public registration because registrations are disabled.",
                logMeta,
            );
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "registrations_disabled",
                        message: "Open registration is disabled",
                    },
                }),
            );
            return true;
        }

        const body = await readJson(req);
        const username = String(body.username ?? "");
        const password = String(body.password ?? "");
        const email = String(body.email ?? "");
        const displayName = String(body.displayName ?? "").trim();
        if (!username || !password) {
            log?.(
                "warn",
                "Rejected public registration with missing credentials.",
                {
                    ...logMeta,
                    username,
                },
            );
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message: "username and password are required",
                    },
                }),
            );
            return true;
        }

        const usernameError = validateUsername(username);
        if (usernameError) {
            log?.(
                "warn",
                "Rejected public registration with invalid username.",
                {
                    ...logMeta,
                    username,
                    usernameError,
                },
            );
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: usernameError,
                        message: "Invalid username format.",
                    },
                }),
            );
            return true;
        }

        const registerPublic = capabilities.get<
            (input: {
                username: string;
                password: string;
                email?: string;
                displayName?: string;
            }) => Promise<{
                username: string;
                role?: string;
                enabled: boolean;
            }>
        >("registration:public:register");
        if (!registerPublic) {
            log?.(
                "warn",
                "Blocked public registration because registration capability is unavailable.",
                logMeta,
            );
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "registration_unavailable",
                        message: "Public registration is not available",
                    },
                }),
            );
            return true;
        }

        const result = await registerPublic({
            username,
            password,
            email,
            displayName: displayName || undefined,
        });
        const verifyToken = issueAccessToken(
            result.username,
            result.role ?? "user",
            1800,
        );

        const { userValidationMode: registrationValidationMode } =
            await readSecuritySettings();
        const hasVerifiedEmail = capabilities.get<
            (accountId: string) => Promise<boolean>
        >("notify:hasVerifiedEmail");
        if (hasVerifiedEmail && registrationValidationMode === "smtp") {
            const fiveMinutesMs = 5 * 60 * 1000;
            const timer = setTimeout(async () => {
                try {
                    const verified = await hasVerifiedEmail(result.username);
                    if (!verified) {
                        await accountStore.delete(result.username);
                        log?.(
                            "info",
                            "Deleted unverified account after 5-minute window.",
                            {
                                component: "auth-gateway",
                                accountId: result.username,
                            },
                        );
                    }
                } catch (error) {
                    log?.(
                        "warn",
                        "Failed to clean up unverified account after 5-minute window.",
                        {
                            component: "auth-gateway",
                            accountId: result.username,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                }
            }, fiveMinutesMs);
            timer.unref();
        }

        log?.("info", "Registered public account.", {
            ...logMeta,
            accountId: result.username,
            hasEmail: Boolean(email),
            hasDisplayName: Boolean(displayName),
        });
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { ...result, verifyToken } }));
        return true;
    };
}
