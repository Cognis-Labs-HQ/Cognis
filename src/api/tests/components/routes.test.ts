import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { createComponentRoutes } from "../../routes/components/index.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import type { ComponentService } from "../../components/service.js";

test("component routes enforce role boundaries and bind channel changes to the URL target", async (t) => {
    const calls: unknown[] = [];
    const unexpectedOperation = async (): Promise<never> => {
        throw new Error("Unexpected component operation");
    };
    const service: ComponentService = {
        dispose() {
            throw new Error("Unexpected component disposal");
        },
        info: unexpectedOperation,
        apply: unexpectedOperation,
        releaseChannels: unexpectedOperation,
        list: async () => [],
        releaseChannel: async (_request, input) => {
            calls.push(input);
            return { channel: input?.channel };
        },
    };
    const context = createDefaultRouteContext();
    context.requireAuth = (request, response, minimum) => {
        const role = request.headers.authorization;
        if (!role || (minimum === "admin" && role !== "admin")) {
            response.writeHead(role ? 403 : 401);
            response.end();
            return null;
        }
        return { sub: "fixture", role: role === "admin" ? "admin" : "user" };
    };
    const route = createComponentRoutes(
        service,
        async (_request, _input, canDisable) => {
            calls.push({ canDisable });
            return { disabled: false };
        },
        context,
        () => {},
    );
    const server = http.createServer(async (request, response) => {
        await route(request, response, new URL(request.url!, "http://test"));
    });
    await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
    );
    t.after(
        () => new Promise<void>((resolve) => server.close(() => resolve())),
    );
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/components`;
    assert.equal((await fetch(base)).status, 401);
    assert.equal(
        (await fetch(base, { headers: { authorization: "user" } })).status,
        403,
    );
    assert.equal(
        (await fetch(base, { headers: { authorization: "admin" } })).status,
        200,
    );
    const report = await fetch(base + "/failures", {
        method: "POST",
        headers: { authorization: "user" },
        body: "{}",
    });
    assert.equal(report.status, 200);
    assert.deepEqual(calls.pop(), { canDisable: false });
    const changed = await fetch(base + "/module/example/release-channel", {
        method: "PUT",
        headers: { authorization: "admin" },
        body: JSON.stringify({
            channel: "preview",
            target: { type: "module", id: "forged" },
        }),
    });
    assert.equal(changed.status, 200);
    assert.deepEqual(calls.pop(), {
        target: { type: "module", id: "example" },
        channel: "preview",
    });
});
