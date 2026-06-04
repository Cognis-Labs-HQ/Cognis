import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
    GatewayRegistry,
    CapabilityStore,
    CTX_CAPABILITY,
    createCtx,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { bootstrap as bootstrapAuth } from "../../auth/bootstrap.js";
import { bootstrap as bootstrapTfa } from "../bootstrap.js";
import { InMemoryTestExecutor } from "../../db/tests/in-memory-test-executor.js";

function makeJsonRequest(
    method: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
) {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
        headers,
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) {
                yield chunk;
            }
        },
    } as unknown as import("node:http").IncomingMessage;
}

function makeResponse() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(nextPayload: string) {
            payload = nextPayload;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as unknown as {
        writeHead: (code: number) => void;
        end: (payload: string) => void;
        status: number;
        payload: string;
    };
}

async function dispatchRoute(
    routeRegistry: RouteRegistry,
    req: import("node:http").IncomingMessage,
    pathname: string,
) {
    const res = makeResponse();
    let handled = false;
    Object.assign(req as object, { url: pathname });
    for (const entry of routeRegistry.getEntries()) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL(pathname, "http://localhost"),
        );
        if (handled) {
            break;
        }
    }
    return { handled, res };
}

test("login issues setup-pending token when global TFA setup is required", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();
    const systemCtx = createCtx();
    capabilities.contribute(CTX_CAPABILITY, systemCtx);
    capabilities.contribute("db:executor", db);

    await bootstrapAuth({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow: systemCtx.flow,
    });
    await bootstrapTfa({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow: systemCtx.flow,
    });

    const createLocalAdmin = capabilities.get<
        (username: string, password: string) => Promise<void>
    >("auth:createLocalAdmin");
    const setEnforceAllUsers = capabilities.get<
        (required: boolean) => Promise<void>
    >("tfa:setEnforceAllUsers");
    assert.ok(createLocalAdmin);
    assert.ok(setEnforceAllUsers);
    await createLocalAdmin?.("alice", "pass123");
    await setEnforceAllUsers?.(true);

    const loginResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {
            provider: "local",
            username: "alice",
            password: "pass123",
        }),
        "/api/v1/auth/login",
    );
    assert.ok(loginResult.handled);
    assert.equal(loginResult.res.status, 200);
    const payload = JSON.parse(loginResult.res.payload) as {
        data: {
            token: string;
            tfaSetupRequired: boolean;
        };
    };
    assert.equal(payload.data.tfaSetupRequired, true);

    const verifyResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "GET",
            {},
            { authorization: `Bearer ${payload.data.token}` },
        ),
        "/api/v1/auth/setup-status",
    );
    assert.ok(verifyResult.handled);
    assert.equal(verifyResult.res.status, 200);
    assert.match(verifyResult.res.payload, /requiresSetup/);
});
