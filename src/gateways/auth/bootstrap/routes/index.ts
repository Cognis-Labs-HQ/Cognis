import type { IncomingMessage } from "node:http";
import type {
    CapabilityStore,
    GatewayBootstrapContext,
} from "../../../shared.js";
import type { CoreAuthGateway } from "../../gateway.js";
import type {
    AuthAccountStore,
    AuthRouteBootstrapRuntime,
    SecuritySettings,
} from "../index.js";
import { MemoryRateLimiter } from "../rate-limiter.js";
import { PASSWORD_RESET_RATE_LIMIT_MS } from "../route-runtime.js";
import { createLoginLinkRoutes } from "./login-links.js";
import { createPasswordRoutes } from "./password.js";
import { createRegistrationRoutes } from "./registration.js";
import { createSecurityRoutes, type SecuritySubsection } from "./security.js";
import { createSessionRoutes } from "./session.js";
import type { AuthGatewayRouteHandler, AuthRouteLogMeta } from "./shared.js";

export function createAuthGatewayRoutes(
    authGateway: CoreAuthGateway,
    accountStore: AuthAccountStore,
    capabilities: CapabilityStore,
    authRouteBootstrapRuntime: AuthRouteBootstrapRuntime,
    securitySubsections: SecuritySubsection[],
    log?: GatewayBootstrapContext["log"],
    readSecuritySettings?: () => Promise<SecuritySettings>,
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

    const resolvedReadSecuritySettings: () => Promise<SecuritySettings> =
        readSecuritySettings ??
        (async () => ({
            registrationsEnabled: false,
            userValidationMode: "none",
        }));

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
            readSecuritySettings: resolvedReadSecuritySettings,
            log,
        }),
        createSecurityRoutes({
            capabilities,
            securitySubsections,
            registrationsEnabled,
            readSecuritySettings: resolvedReadSecuritySettings,
            log,
        }),
        createRegistrationRoutes({
            accountStore,
            capabilities,
            registrationsEnabled,
            readSecuritySettings: resolvedReadSecuritySettings,
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
            capabilities,
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
