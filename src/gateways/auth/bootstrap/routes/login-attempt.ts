import { type Ctx } from "@cognis/core";
import {
    readJson,
    type CapabilityStore,
    type GatewayBootstrapContext,
} from "../../../shared.js";
import type { AuthGatewayRouteHandler } from "./shared.js";

export function createLoginAttemptRoutes(
    capabilities: CapabilityStore,
    log?: GatewayBootstrapContext["log"],
): AuthGatewayRouteHandler {
    return async (req, res, url) => {
        if (
            url.pathname !== "/api/v1/auth/login-attempt" ||
            !["GET", "DELETE"].includes(req.method ?? "")
        )
            return false;
        const headers = {
            "content-type": "application/json",
            "cache-control": "no-store",
        };
        try {
            let loginAttemptId: string | undefined;
            if (req.method === "DELETE") {
                let body: Record<string, unknown>;
                try {
                    body = await readJson(req, { maxBytes: 1024 });
                } catch {
                    res.writeHead(400, headers);
                    res.end(
                        JSON.stringify({
                            error: { code: "invalid_login_attempt_request" },
                        }),
                    );
                    return true;
                }
                if (
                    typeof body.loginAttemptId !== "string" ||
                    !/^tfa_login_[A-Za-z0-9_-]{24}$/.test(
                        body.loginAttemptId,
                    ) ||
                    Object.keys(body).length !== 1
                ) {
                    res.writeHead(400, headers);
                    res.end(
                        JSON.stringify({
                            error: { code: "invalid_login_attempt_request" },
                        }),
                    );
                    return true;
                }
                loginAttemptId = body.loginAttemptId;
            }
            const root = capabilities.require<Ctx>("system:ctx");
            const result = await root.flow.run("auth:loginContinuation", {
                req,
                action: req.method === "GET" ? "resume" : "cancel",
                loginAttemptId,
            });
            if (req.method === "DELETE") {
                log?.("info", "Cancelled pending login continuation.", {
                    component: "auth",
                    operation: "cancelLoginAttempt",
                });
                res.writeHead(204, headers);
                res.end();
            } else {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ data: result.data.result ?? null }));
            }
        } catch (error) {
            log?.("error", "Pending login continuation failed.", {
                component: "auth",
                operation: "loginContinuation",
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            res.writeHead(503, headers);
            res.end(
                JSON.stringify({
                    error: { code: "login_attempt_unavailable" },
                }),
            );
        }
        return true;
    };
}
