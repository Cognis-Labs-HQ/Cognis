import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultRouteContext } from "../../../api/reuse/route-context.js";
import { bootstrap } from "../bootstrap.js";
import type { Logger } from "../logger.js";
import {
    makeContext,
    RequestRecorder,
    ResponseRecorder,
} from "./fixtures/runtime.js";

test("gateway controls browser console output using current role and console threshold", async () => {
    const ctx = await makeContext();
    let authenticated = true;
    let currentRole: "user" | "admin" | "owner" = "user";
    ctx.capabilities.contribute("auth:routeContext", {
        ...createDefaultRouteContext(),
        requireAuth(_request: unknown, res: any, minimumRole: string) {
            assert.equal(minimumRole, "user");
            if (authenticated) return { sub: "log-user", role: currentRole };
            res.writeHead(401);
            res.end();
            return null;
        },
    });
    await bootstrap(ctx as any);
    const logger = ctx.capabilities.require<Logger>("logging:logger");
    const handler = ctx.routeRegistry.getHandlers()[0];
    for (const [role, level, threshold, expected] of [
        ["user", "error", "debug", "false"],
        ["admin", "info", "error", "false"],
        ["admin", "error", "error", "true"],
        ["admin", "info", "info", "true"],
        ["owner", "error", "error", "true"],
    ] as const) {
        logger.configure({ consoleLevel: threshold });
        currentRole = role;
        const req = new RequestRecorder(
            "POST",
            undefined,
            JSON.stringify({
                level,
                message: "challenge_request_failed",
                meta: { accountId: "spoofed" },
            }),
        );
        const response = new ResponseRecorder();
        await handler(
            req as any,
            response as any,
            new URL("http://localhost/api/v1/logging/entries"),
        );
        assert.equal(response.statusCode, 204);
        assert.equal(response.headers["x-cognis-log-console"], expected);
        assert.equal(response.headers["cache-control"], "no-store");
    }
    authenticated = false;
    const response = new ResponseRecorder();
    await handler(
        new RequestRecorder("POST") as any,
        response as any,
        new URL("http://localhost/api/v1/logging/entries"),
    );
    assert.equal(response.statusCode, 401);
});
