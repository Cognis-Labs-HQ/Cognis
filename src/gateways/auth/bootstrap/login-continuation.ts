import { registerBootstrapFlow, type Ctx } from "@cognis/core";
import type { IncomingMessage } from "node:http";
import type { AuthRouteBootstrapHookContext } from "./index.js";
import type { LoginFlowSessionResult } from "./routes/shared.js";

export async function registerAuthRouteBootstrapHook({
    capabilities,
    runtime,
}: AuthRouteBootstrapHookContext): Promise<void> {
    const root = capabilities.require<Ctx>("system:ctx");
    const flow = registerBootstrapFlow(root, {
        id: "auth:loginContinuation",
        stages: ["validateRequest", "applyContinuation"],
    });
    flow.extend(
        "validateRequest",
        { id: "auth:validateLoginContinuation" },
        ({ input }) => {
            const request = input as { req: IncomingMessage; action: string };
            if (
                !request.req?.headers ||
                !["bind", "resume", "cancel", "clear"].includes(request.action)
            )
                throw new Error("invalid_login_attempt_request");
        },
    );
    flow.extend(
        "applyContinuation",
        { id: "auth:applyLoginContinuation" },
        ({ input, data }) => {
            const request = input as {
                req: IncomingMessage;
                action: string;
                sessionResult: LoginFlowSessionResult;
                loginAttemptId: string;
            };
            if (request.action === "bind")
                data.result = runtime.loginContinuation.bind(
                    request.req,
                    request.sessionResult,
                );
            else if (request.action === "resume")
                data.result = runtime.loginContinuation.resume(request.req);
            else if (request.action === "cancel")
                runtime.loginContinuation.cancel(
                    request.req,
                    request.loginAttemptId,
                );
            else if (request.action === "clear")
                runtime.loginContinuation.clear(request.req);
            else throw new Error("invalid_login_attempt_request");
        },
    );
}
