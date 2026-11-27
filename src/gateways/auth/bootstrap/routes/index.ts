import { parseLoginSessionTimeoutMinutes } from "../../session-timeout.js";
import type { IncomingMessage } from "node:http";
import type {
    CapabilityStore,
    GatewayBootstrapContext,
} from "../../../shared.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { CoreAuthGateway } from "../../gateway.js";
import type {
    AuthAccountStore,
    AuthRouteBootstrapRuntime,
    SecuritySettings,
} from "../index.js";
import { MemoryRateLimiter } from "../rate-limiter.js";
import { PASSWORD_RESET_RATE_LIMIT_MS as PASSWORD_RESET_RATE_LIMIT_MILLISECONDS } from "../route-runtime.js";
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
    routeContext: RouteContext,
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
            userValidationMode: "none",
            loginSessionTimeoutMinutes:
                parseLoginSessionTimeoutMinutes(undefined),
        }));

    async function registrationsEnabled(): Promise<boolean> {
        const isPublicRegistrationEnabled = capabilities.get<() => boolean>(
            "registration:public:isEnabled",
        );
        return Boolean(isPublicRegistrationEnabled?.());
    }

    function resolveRequestAddress(request: IncomingMessage): string {
        const forwardedFor = request.headers["x-forwarded-for"];
        if (typeof forwardedFor === "string") {
            const firstHop = forwardedFor.split(",")[0]?.trim();
            if (firstHop) return firstHop;
        }
        return String(request.socket?.remoteAddress ?? "unknown");
    }

    const oneTimeLoginAccountRateLimiter = new MemoryRateLimiter(
        PASSWORD_RESET_RATE_LIMIT_MILLISECONDS,
    );
    const oneTimeLoginIpRateLimiter = new MemoryRateLimiter(
        PASSWORD_RESET_RATE_LIMIT_MILLISECONDS,
    );

    const keyringRouteFactory = capabilities.require<
        (context: RouteContext) => AuthGatewayRouteHandler
    >("auth:keyringRouteFactory");
    const handlers: AuthGatewayRouteHandler[] = [
        keyringRouteFactory(routeContext),
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
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMetadata: AuthRouteLogMeta = {
            component: "auth-gateway",
            method: request.method ?? "GET",
            path: url.pathname,
        };
        for (const handler of handlers) {
            if (await handler(request, response, url, logMetadata)) {
                return true;
            }
        }
        return false;
    };
}

export type { SecuritySubsection } from "./security.js";
