import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { registerCommands } from "../cli/index.js";

test("adapter commands generate tokens and send invitation emails through the authenticated gateway API", async () => {
    const commands = new Map();
    registerCommands({
        register: (name, handler) => commands.set(name, handler),
    });
    const bodies = [];
    let deny = false;
    const server = http.createServer(async (req, res) => {
        assert.equal(req.url, "/api/v1/registration/tokens");
        assert.equal(req.method, "POST");
        assert.equal(req.headers.authorization, "Bearer fixture-admin");
        let body = "";
        for await (const chunk of req) body += chunk;
        bodies.push(JSON.parse(body));
        res.writeHead(deny ? 403 : 201, { "content-type": "application/json" });
        res.end(
            JSON.stringify(
                deny
                    ? { error: { code: "forbidden" } }
                    : { data: { token: "fixture-invite" } },
            ),
        );
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const context = {
        apiBaseUrl: `http://127.0.0.1:${server.address().port}`,
        getApiToken: async () => "fixture-admin",
    };
    try {
        await commands.get("invite:token:generate")({ ...context, args: [] });
        await commands.get("invite:email:send")({
            ...context,
            args: ["person@example.com"],
        });
        assert.deepEqual(bodies, [
            { deliverEmail: false },
            { email: "person@example.com", deliverEmail: true },
        ]);
        deny = true;
        await assert.rejects(
            commands.get("invite:email:send")({
                ...context,
                args: ["person@example.com"],
            }),
            (error) => error.status === 403,
        );
    } finally {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    }
});
