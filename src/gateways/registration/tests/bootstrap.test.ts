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
    });
    map.set("db:type", "sqlite");
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
    assert.deepEqual(registeredTypingMessages, [
        {
            id: "registration-register-today",
            textKey: "ui.app.login.typing.sample.7",
            ownerType: "gateway",
            ownerId: "registration",
        },
    ]);
});
