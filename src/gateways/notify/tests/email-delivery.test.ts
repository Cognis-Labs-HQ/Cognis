import { createRequest, createResponse } from "./reuse/http.js";
import { createAuthContext } from "./reuse/auth.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "../gateway.js";
import { createNotificationRoutes } from "../routes/index.js";

test("email delivery availability is authenticated and independent of sender identity", async () => {
    const gateway = new CoreNotificationGateway(
        new VolatileNotificationPreferenceStore(),
    );
    let available = true;
    let authenticated = true;
    const route = createNotificationRoutes(gateway, undefined, {
        emailAvailable: () => available,
        routeContext: {
            ...createAuthContext(),
            requireAuth(_request, response) {
                if (authenticated) return { sub: "reader", role: "user" };
                response.writeHead(401);
                response.end();
                return null;
            },
        },
    });
    for (const state of [true, false]) {
        available = state;
        let status = 0;
        let payload = "";
        const handled = await route(
            createRequest({ method: "GET" }),
            createResponse({
                writeHead(code: number) {
                    status = code;
                },
                end(body: string) {
                    payload = body;
                },
            }),
            new URL("http://localhost/api/v1/notify/email-delivery"),
        );
        assert.equal(handled, true);
        assert.equal(status, 200);
        assert.deepEqual(JSON.parse(payload), { data: { available: state } });
    }
    authenticated = false;
    let status = 0;
    await route(
        createRequest({ method: "GET" }),
        createResponse({
            writeHead(code: number) {
                status = code;
            },
            end() {},
        }),
        new URL("http://localhost/api/v1/notify/email-delivery"),
    );
    assert.equal(status, 401);
});

test("senders declare email requirements without tying preferences to their identifier", () => {
    const gateway = new CoreNotificationGateway(
        new VolatileNotificationPreferenceStore(),
    );
    gateway.registerSender({
        senderId: "mail-service",
        requiresVerifiedEmail: true,
        isConfigured: () => true,
        send: async () => {
            throw new Error("unexpected_delivery");
        },
    });
    const provider = gateway.listSenders()[0];
    assert.equal(provider.senderId, "mail-service");
    assert.equal(provider.active, true);
    assert.equal(provider.requiresVerifiedEmail, true);
});
