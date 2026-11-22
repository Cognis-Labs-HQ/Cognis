import {
    readJson,
    type CapabilityStore,
    type GatewayBootstrapContext,
} from "../../../shared.js";
import {
    OnboardingError,
    type OnboardingAuthority,
} from "../../onboarding/contracts.js";
import type { AuthGatewayRouteHandler } from "./shared.js";

export function createOnboardingRoutes(
    capabilities: CapabilityStore,
    log?: GatewayBootstrapContext["log"],
): AuthGatewayRouteHandler {
    return async (req, res, url) => {
        if (
            req.method !== "POST" ||
            ![
                "/api/v1/auth/onboarding/operations",
                "/api/v1/auth/onboarding/complete",
            ].includes(url.pathname)
        )
            return false;
        res.setHeader("cache-control", "no-store");
        try {
            const authority =
                capabilities.get<OnboardingAuthority>("auth:onboarding");
            if (!authority)
                throw new OnboardingError(503, "onboarding_unavailable");
            if (url.pathname.endsWith("/complete")) {
                await authority.complete(req);
                res.writeHead(204);
                res.end();
                return true;
            }
            let body: Record<string, unknown>;
            try {
                body = await readJson(req, { maxBytes: 65536 });
            } catch {
                throw new OnboardingError(400, "invalid_onboarding_request");
            }
            if (
                typeof body.operation !== "string" ||
                !/^[a-z][a-zA-Z0-9:._-]{0,149}$/.test(body.operation) ||
                Object.keys(body).some(
                    (key) => key !== "operation" && key !== "input",
                )
            )
                throw new OnboardingError(400, "invalid_onboarding_request");
            const result = await authority.dispatch(
                req,
                body.operation,
                body.input,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: result }));
        } catch (error) {
            log?.("error", "Onboarding request failed.", {
                component: "auth",
                operation: "onboardingRequest",
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            const failure =
                error instanceof OnboardingError
                    ? error
                    : new OnboardingError(503, "onboarding_operation_failed");
            res.writeHead(failure.status, {
                "content-type": "application/json",
            });
            res.end(
                JSON.stringify({
                    error: { code: failure.code, message: failure.code },
                }),
            );
        }
        return true;
    };
}
