import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { CapabilityStore } from "@cognis/core";
import { bootstrapNotifyAdapter } from "../index.js";

test("notification UI resources resolve through the adapter's registered public directory", async () => {
    const capabilities = new CapabilityStore();
    const senders: string[] = [];
    const plugins: string[] = [];
    const directories = new Map<string, string>();
    const routes: unknown[] = [];
    const logs: string[] = [];
    capabilities.contribute("notify:registerAlwaysOnSender", (id: string) =>
        senders.push(id),
    );
    await bootstrapNotifyAdapter({
        capabilities,
        registerStaticDir(prefix, directory) {
            directories.set(`/static/gateways/${prefix}/`, directory);
        },
        registerNavbarPlugin(url) {
            plugins.push(url);
        },
        registerRoute(handler) {
            routes.push(handler);
        },
        requireAuth() {
            throw new Error("Bootstrap must not authenticate a request");
        },
        async readJson() {
            throw new Error("Bootstrap must not read a request body");
        },
        log(_level, message) {
            logs.push(message);
        },
    });
    assert.deepEqual(senders, ["internal"]);
    assert.equal(plugins.length, 1);
    assert.equal(routes.length, 1);
    assert.ok(logs.length > 0);

    const resolveResource = (url: string) => {
        const registration = [...directories].find(([prefix]) =>
            url.startsWith(prefix),
        );
        assert.ok(registration, `No public directory registered for ${url}`);
        return path.join(registration[1], url.slice(registration[0].length));
    };
    const plugin = await readFile(resolveResource(plugins[0]), "utf8");
    const resources = new Set(
        [
            ...plugin.matchAll(/\/static\/(?:gateways|adapters)\/[^"'`\s<>]+/g),
        ].map((match) => match[0]),
    );
    assert.ok(resources.size > 0);
    for (const resource of resources)
        assert.ok(await stat(resolveResource(resource)), resource);
    const bell = plugin.match(/<img src="([^"]+)"[^>]+notification-icon-img/);
    assert.ok(bell, "The bell control declares an image resource");
    assert.match(await readFile(resolveResource(bell[1]), "utf8"), /<svg\b/);
});
