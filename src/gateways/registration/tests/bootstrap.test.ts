import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";

function createCapabilities(entries) {
    return {
        get(key) {
            return entries.get(key);
        },
        require(key) {
            if (!entries.has(key)) {
                throw new Error(`Missing capability: ${key}`);
            }
            return entries.get(key);
        },
        contribute(key, value) {
            entries.set(key, value);
        },
    };
}

class ResponseRecorder extends EventEmitter {
    statusCode = 0;
    headers: Record<string, string> = {};
    payload = "";

    writeHead(code: number, headers?: Record<string, string>) {
        this.statusCode = code;
        this.headers = { ...this.headers, ...(headers ?? {}) };
    }

    end(chunk?: string | Buffer) {
        if (chunk) {
            this.payload += String(chunk);
        }
        this.emit("close");
    }
}

class RequestRecorder extends EventEmitter {
    method: string;
    headers: Record<string, string>;
    private readonly body: string;

    constructor(options: {
        method: string;
        bearerToken?: string;
        body?: string;
    }) {
        super();
        this.method = options.method;
        this.body = options.body ?? "";
        this.headers = {};
        if (options.bearerToken) {
            this.headers.authorization = `Bearer ${options.bearerToken}`;
        }
    }

    async *[Symbol.asyncIterator]() {
        if (this.body.length > 0) {
            yield Buffer.from(this.body);
        }
    }
}

async function dispatchRoute(
    routeRegistry: RouteRegistry,
    request: RequestRecorder,
    response: ResponseRecorder,
    url: URL,
): Promise<boolean> {
    for (const routeEntry of routeRegistry.getEntries()) {
        const handled = await routeEntry.handler(
            request as any,
            response as any,
            url,
        );
        if (handled) {
            return true;
        }
    }
    return false;
}

test("registration gateway bootstrap registers admin section, navbar plugin, and static dir", async () => {
    const map = new Map();
    map.set("db:executor", {
        execute: async () => ({ rows: [], rowCount: 0 }),
        executeCommand: async () => ({ rows: [], rowCount: 0 }),
        ensureTable: async () => {},
        transaction: async (cb) => cb(map.get("db:executor")),
    });
    map.set("db:type", "memory");
    map.set("auth:accountStore", {
        async isFounder() {
            return false;
        },
        async getDisplayName(username) {
            return username;
        },
        async exists() {
            return true;
        },
        async register(username) {
            return { username, role: "user", enabled: true };
        },
    });
    map.set("notify:canSendRegistrationInviteEmail", () => true);
    map.set("notify:sendRegistrationInviteEmail", async () => {});
    map.set("notify:isEmailRegistered", async () => false);
    map.set(
        "notify:upsertVerifiedPrimaryEmail",
        async (_accountId: string, _email: string) => {},
    );

    const registeredSections = [];
    const registeredPlugins = [];
    const registeredStaticDirs = [];
    const registeredTypingMessages = [];

    await bootstrap({
        capabilities: createCapabilities(map) as any,
        routeRegistry: { register() {}, registerPrefix() {} } as any,
        uiRegistry: {
            registerAdminSection(section) {
                registeredSections.push(section);
            },
            registerNavbarPlugin(plugin) {
                registeredPlugins.push(plugin);
            },
            registerStaticDir(id, dir) {
                registeredStaticDirs.push({ id, dir });
            },
            registerAuthTypingMessage(message) {
                registeredTypingMessages.push(message);
            },
        } as any,
        gatewayRegistry: { register() {} } as any,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: createCtx().flow,
    } as any);

    assert.equal(
        registeredSections.some((section) => section.id === "registration"),
        true,
    );
    assert.equal(
        registeredPlugins.some(
            (plugin) =>
                plugin.scriptUrl === "/static/gateways/registration/navbar.js",
        ),
        true,
    );
    const staticDir = registeredStaticDirs.find(
        (entry) => entry.id === "registration",
    );
    assert.ok(staticDir);
    assert.equal(
        existsSync(path.resolve(staticDir.dir, "admin-section.js")),
        true,
    );
    assert.equal(existsSync(path.resolve(staticDir.dir, "navbar.js")), true);
    assert.equal(registeredTypingMessages.length, 1);
    const msg = registeredTypingMessages[0];
    assert.equal(msg.id, "registration-register-today");
    assert.equal(msg.textKey, "ui.app.login.typing.sample.7");
    assert.equal(msg.ownerType, "adapter");
    assert.equal(msg.ownerId, "public");
    assert.equal(typeof msg.isEnabled, "function");
});

test("registration:public:isEnabled capability returns false when gateway is disabled", async () => {
    const dbExec = {
        execute: async () => ({ rows: [], rowCount: 0 }),
        executeCommand: async () => ({ rows: [], rowCount: 0 }),
        ensureTable: async () => {},
        transaction: async (cb: (e: typeof dbExec) => Promise<unknown>) =>
            cb(dbExec),
    };
    const map = new Map();
    map.set("db:executor", dbExec);
    map.set("db:type", "memory");
    map.set("auth:accountStore", {
        async isFounder() {
            return false;
        },
        async getDisplayName(username: string) {
            return username;
        },
        async exists() {
            return true;
        },
        async register(username: string) {
            return { username, role: "user", enabled: true };
        },
    });
    map.set("notify:canSendRegistrationInviteEmail", () => true);
    map.set("notify:sendRegistrationInviteEmail", async () => {});
    map.set("notify:isEmailRegistered", async () => false);
    map.set(
        "notify:upsertVerifiedPrimaryEmail",
        async (_accountId: string, _email: string) => {},
    );

    const gatewayStatus = { status: "active" };
    const registry = {
        register() {},
        get(id: string) {
            return id === "registration" ? gatewayStatus : null;
        },
    };

    await bootstrap({
        capabilities: {
            get(key: string) {
                return map.get(key);
            },
            require(key: string) {
                if (!map.has(key)) {
                    throw new Error(`Missing capability: ${key}`);
                }
                return map.get(key);
            },
            contribute(key: string, value: unknown) {
                map.set(key, value);
            },
        } as any,
        routeRegistry: { register() {}, registerPrefix() {} } as any,
        uiRegistry: {
            registerAdminSection() {},
            registerNavbarPlugin() {},
            registerStaticDir() {},
            registerAuthTypingMessage() {},
        } as any,
        gatewayRegistry: registry as any,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: createCtx().flow,
    } as any);

    const isEnabled = map.get("registration:public:isEnabled") as () => boolean;
    assert.equal(typeof isEnabled, "function");

    gatewayStatus.status = "active";
    assert.equal(
        isEnabled(),
        false,
        "disabled when public adapter not enabled",
    );

    gatewayStatus.status = "disabled";
    assert.equal(isEnabled(), false, "disabled when gateway is disabled");
});

test("registration:public:register capability throws when gateway is disabled", async () => {
    const dbExec = {
        execute: async () => ({ rows: [], rowCount: 0 }),
        executeCommand: async () => ({ rows: [], rowCount: 0 }),
        ensureTable: async () => {},
        transaction: async (cb: (e: typeof dbExec) => Promise<unknown>) =>
            cb(dbExec),
    };
    const map = new Map();
    map.set("db:executor", dbExec);
    map.set("db:type", "memory");
    map.set("auth:accountStore", {
        async isFounder() {
            return false;
        },
        async getDisplayName(username: string) {
            return username;
        },
        async exists() {
            return true;
        },
        async register(username: string) {
            return { username, role: "user", enabled: true };
        },
    });
    map.set("notify:canSendRegistrationInviteEmail", () => true);
    map.set("notify:sendRegistrationInviteEmail", async () => {});
    map.set("notify:isEmailRegistered", async () => false);
    map.set(
        "notify:upsertVerifiedPrimaryEmail",
        async (_accountId: string, _email: string) => {},
    );

    const gatewayStatus = { status: "disabled" };
    const registry = {
        register() {},
        get(id: string) {
            return id === "registration" ? gatewayStatus : null;
        },
    };

    await bootstrap({
        capabilities: {
            get(key: string) {
                return map.get(key);
            },
            require(key: string) {
                if (!map.has(key)) {
                    throw new Error(`Missing capability: ${key}`);
                }
                return map.get(key);
            },
            contribute(key: string, value: unknown) {
                map.set(key, value);
            },
        } as any,
        routeRegistry: { register() {}, registerPrefix() {} } as any,
        uiRegistry: {
            registerAdminSection() {},
            registerNavbarPlugin() {},
            registerStaticDir() {},
            registerAuthTypingMessage() {},
        } as any,
        gatewayRegistry: registry as any,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: createCtx().flow,
    } as any);

    const registerFn = map.get("registration:public:register") as (
        input: unknown,
    ) => Promise<unknown>;
    assert.equal(typeof registerFn, "function");

    await assert.rejects(
        () => registerFn({ username: "u", password: "p" }),
        /gateway_disabled/,
        "should throw gateway_disabled when gateway is disabled",
    );
});

test("registration adapter routes announce controls and accept empty config saves", async () => {
    const routeRegistry = new RouteRegistry();
    const capabilityStore = new CapabilityStore();
    const dbExecutor = {
        execute: async () => ({ rows: [], rowCount: 0 }),
        executeCommand: async ({ table }: { table?: string }) => {
            if (table === "registration_adapter_configs") {
                return { rows: [], rowCount: 0 };
            }
            return { rows: [], rowCount: 0 };
        },
        ensureTable: async () => {},
        transaction: async (
            callback: (executor: typeof dbExecutor) => Promise<unknown>,
        ) => callback(dbExecutor),
    };

    capabilityStore.contribute("db:executor", dbExecutor);
    capabilityStore.contribute("db:type", "memory");
    capabilityStore.contribute("auth:accountStore", {
        async isFounder() {
            return false;
        },
        async getDisplayName(username: string) {
            return username;
        },
        async exists() {
            return true;
        },
        async register(username: string) {
            return { username, role: "user", enabled: true };
        },
    });
    capabilityStore.contribute(
        "notify:canSendRegistrationInviteEmail",
        () => true,
    );
    capabilityStore.contribute(
        "notify:sendRegistrationInviteEmail",
        async () => {},
    );
    capabilityStore.contribute("notify:isEmailRegistered", async () => false);
    capabilityStore.contribute(
        "notify:upsertVerifiedPrimaryEmail",
        async (_accountId: string, _email: string) => {},
    );

    await bootstrap({
        capabilities: capabilityStore,
        routeRegistry,
        uiRegistry: {
            registerAdminSection() {},
            registerNavbarPlugin() {},
            registerStaticDir() {},
            registerAuthTypingMessage() {},
        } as any,
        gatewayRegistry: new GatewayRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: createCtx().flow,
    } as any);

    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const listResponse = new ResponseRecorder();
    const listHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: adminToken }),
        listResponse,
        new URL("http://localhost/api/v1/gateways/registration/adapters"),
    );

    assert.equal(listHandled, true);
    assert.equal(listResponse.statusCode, 200);
    const listPayload = JSON.parse(listResponse.payload) as {
        data: Array<{
            id: string;
            controls?: Record<string, string>;
        }>;
    };
    const publicAdapter = listPayload.data.find(
        (adapter) => adapter.id === "public",
    );
    assert.equal(
        publicAdapter?.controls?.config,
        "/api/v1/gateways/registration/adapters/public/config",
    );
    assert.equal(
        publicAdapter?.controls?.disable,
        "/api/v1/gateways/registration/adapters/public/disable",
    );

    const saveResponse = new ResponseRecorder();
    const saveHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "PUT",
            bearerToken: adminToken,
            body: JSON.stringify({ enabled: true }),
        }),
        saveResponse,
        new URL(
            "http://localhost/api/v1/gateways/registration/adapters/public/config",
        ),
    );

    assert.equal(saveHandled, true);
    assert.equal(saveResponse.statusCode, 200);
    assert.match(saveResponse.payload, /"saved":true/);
});
