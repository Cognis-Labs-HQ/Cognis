import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { bootstrap } from "../bootstrap.js";

function createCapabilities(entries) {
    return {
        get(key) {
            return entries.get(key);
        },
        contribute(key, value) {
            entries.set(key, value);
        },
    };
}

test("registration gateway bootstrap registers admin section, navbar plugin, and static dir", async () => {
    const map = new Map();
    map.set("db:executor", {
        execute: async () => ({ rows: [], rowCount: 0 }),
        executeCommand: async () => ({ rows: [], rowCount: 0 }),
        ensureTable: async () => {},
        transaction: async (cb) => cb(map.get("db:executor")),
    });
    map.set("db:type", "postgresql");
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
            return { username, isAdmin: false, enabled: true };
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
        routeRegistry: { register() {} } as any,
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
    map.set("db:type", "postgresql");
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
            return { username, isAdmin: false, enabled: true };
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
            contribute(key: string, value: unknown) {
                map.set(key, value);
            },
        } as any,
        routeRegistry: { register() {} } as any,
        uiRegistry: {
            registerAdminSection() {},
            registerNavbarPlugin() {},
            registerStaticDir() {},
            registerAuthTypingMessage() {},
        } as any,
        gatewayRegistry: registry as any,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
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
    map.set("db:type", "postgresql");
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
            return { username, isAdmin: false, enabled: true };
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
            contribute(key: string, value: unknown) {
                map.set(key, value);
            },
        } as any,
        routeRegistry: { register() {} } as any,
        uiRegistry: {
            registerAdminSection() {},
            registerNavbarPlugin() {},
            registerStaticDir() {},
            registerAuthTypingMessage() {},
        } as any,
        gatewayRegistry: registry as any,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
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
