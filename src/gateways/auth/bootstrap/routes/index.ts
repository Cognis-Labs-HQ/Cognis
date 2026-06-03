import type { IncomingMessage } from "node:http";
import type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";
import type {
    CapabilityStore,
    GatewayBootstrapContext,
} from "../../../shared.js";
import type { CoreAuthGateway } from "../../gateway.js";
import type { AuthAccountStore, AuthRouteBootstrapRuntime } from "../index.js";
import { MemoryRateLimiter } from "../rate-limiter.js";
import { PASSWORD_RESET_RATE_LIMIT_MS } from "../route-runtime.js";
import { createLoginLinkRoutes } from "./login-links.js";
import { createPasswordRoutes } from "./password.js";
import { createRegistrationRoutes } from "./registration.js";
import { createSecurityRoutes, type SecuritySubsection } from "./security.js";
import { createSessionRoutes } from "./session.js";
import type { AuthGatewayRouteHandler, AuthRouteLogMeta } from "./shared.js";

interface SecuritySettings {
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
}

export function createAuthGatewayRoutes(
    authGateway: CoreAuthGateway,
    accountStore: AuthAccountStore,
    capabilities: CapabilityStore,
    authRouteBootstrapRuntime: AuthRouteBootstrapRuntime,
    securitySubsections: SecuritySubsection[],
    log?: GatewayBootstrapContext["log"],
) {
    const dispatchNotification =
        capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
            }) => Promise<unknown>
        >("notify:dispatch");

    async function readSecuritySettings(): Promise<SecuritySettings> {
        const preferenceStore =
            capabilities.get<UserPreferenceStore>("preferences:store");
        if (!preferenceStore) {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
        const raw = await preferenceStore.get(
            "__system__",
            "security-settings",
        );
        if (!raw) {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            return {
                registrationsEnabled:
                    typeof parsed.registrationsEnabled === "boolean"
                        ? parsed.registrationsEnabled
                        : false,
                userValidationMode:
                    parsed.userValidationMode === "smtp" ? "smtp" : "none",
            };
        } catch {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
    }

    async function registrationsEnabled(): Promise<boolean> {
        const isPublicRegistrationEnabled = capabilities.get<() => boolean>(
            "registration:public:isEnabled",
        );
        return Boolean(isPublicRegistrationEnabled?.());
    }

    function resolveRequestAddress(req: IncomingMessage): string {
        const forwardedFor = req.headers["x-forwarded-for"];
        if (typeof forwardedFor === "string") {
            const firstHop = forwardedFor.split(",")[0]?.trim();
            if (firstHop) return firstHop;
        }
        return String(req.socket?.remoteAddress ?? "unknown");
    }

    const oneTimeLoginAccountRateLimiter = new MemoryRateLimiter(
        PASSWORD_RESET_RATE_LIMIT_MS,
    );
    const oneTimeLoginIpRateLimiter = new MemoryRateLimiter(
        PASSWORD_RESET_RATE_LIMIT_MS,
    );

    const handlers: AuthGatewayRouteHandler[] = [
        createSessionRoutes({
            authGateway,
            accountStore,
            capabilities,
            authRouteBootstrapRuntime,
            readSecuritySettings,
            log,
        }),
        createSecurityRoutes({
            capabilities,
            securitySubsections,
            registrationsEnabled,
            readSecuritySettings,
            log,
        }),
        createRegistrationRoutes({
            accountStore,
            capabilities,
            registrationsEnabled,
            readSecuritySettings,
            log,
        }),
        createLoginLinkRoutes({
            authGateway,
            accountStore,
            capabilities,
            oneTimeLoginAccountRateLimiter,
            oneTimeLoginIpRateLimiter,
            resolveRequestAddress,
            log,
        }),
        createPasswordRoutes({
            authGateway,
            accountStore,
            dispatchNotification,
            log,
        }),
    ];

    return async (
        req: import("node:http").IncomingMessage,
        res: import("node:http").ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta: AuthRouteLogMeta = {
            component: "auth-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
        };
        for (const handler of handlers) {
            if (await handler(req, res, url, logMeta)) {
                return true;
            }
        }
        return false;
    };
}

export type { SecuritySubsection } from "./security.js";
