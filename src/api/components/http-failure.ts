import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog } from "@cognis/core";
import type { ComponentTarget } from "./types.js";
import { componentFaultOwner } from "./fault.js";

/** Isolates a failed request and reports only faults attributed by an owner boundary. */
export async function recoverComponentRequest(
    req: IncomingMessage,
    res: ServerResponse,
    error: unknown,
    management:
        | Promise<{
              reportServerFailure(
                  request: IncomingMessage,
                  owner: ComponentTarget,
              ): Promise<void>;
          }>
        | undefined,
    log: BootstrapLog,
): Promise<void> {
    const owner = componentFaultOwner(error);
    if (owner) {
        try {
            await (await management)?.reportServerFailure(req, owner);
        } catch (recoveryError) {
            log("error", "Component failure recovery failed.", {
                component: "api",
                operation: "componentRecovery",
                errorName:
                    recoveryError instanceof Error
                        ? recoveryError.name
                        : "UnknownError",
            });
        }
    }
    if (!res.headersSent) {
        res.writeHead(owner ? 500 : 400, {
            "content-type": "application/json",
        });
        res.end(
            JSON.stringify({
                error: {
                    code: "bad_request",
                    message: "Request failed",
                },
            }),
        );
    } else if (!res.writableEnded) res.end();
}
