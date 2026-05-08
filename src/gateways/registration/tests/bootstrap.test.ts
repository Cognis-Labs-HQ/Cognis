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

    const registeredSections = [];
    const registeredPlugins = [];
    const registeredStaticDirs = [];

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
});
