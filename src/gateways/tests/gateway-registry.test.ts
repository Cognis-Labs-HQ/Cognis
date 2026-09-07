import test from "node:test";
import assert from "node:assert/strict";
import { GatewayRegistry } from "@cognis/core";

test("GatewayRegistry.register and list", () => {
    const registry = new GatewayRegistry();

    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        publisher: "Cognis Labs HQ",
    });
    registry.register({
        id: "auth",
        name: "Auth Gateway",
        version: "0.2.0",
    });

    const list = registry.list();
    assert.equal(list.length, 2);
    assert.ok(list.some((g) => g.id === "notify"));
    assert.ok(list.some((g) => g.id === "auth"));
});

test("GatewayRegistry.get returns correct manifest", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        description: "Sends notifications.",
        publisher: "Cognis Labs HQ",
    });

    const manifest = registry.get("notify");
    assert.ok(manifest !== undefined);
    assert.equal(manifest.name, "Notification Gateway");
    assert.equal(manifest.description, "Sends notifications.");
});

test("GatewayRegistry.get returns undefined for unknown gateway", () => {
    const registry = new GatewayRegistry();
    assert.equal(registry.get("nonexistent"), undefined);
});

test("GatewayRegistry.list is empty when no gateways are registered", () => {
    const registry = new GatewayRegistry();
    assert.deepEqual(registry.list(), []);
});

test("GatewayRegistry later registration overwrites earlier for same id", () => {
    const registry = new GatewayRegistry();
    registry.register({ id: "notify", name: "Old Name", version: "0.1.0" });
    registry.register({ id: "notify", name: "New Name", version: "0.2.0" });

    const manifest = registry.get("notify");
    assert.equal(manifest?.name, "New Name");
    assert.equal(manifest?.version, "0.2.0");
    assert.equal(registry.list().length, 1);
});

test("assertRequiredInitialized passes when all required gateways are registered", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        required: true,
    });
    registry.register({ id: "files", name: "File Gateway", version: "0.1.0" });

    assert.doesNotThrow(() => {
        registry.assertRequiredInitialized(["notify"]);
    });
});

test("assertRequiredInitialized throws when a required gateway is absent", () => {
    const registry = new GatewayRegistry();
    registry.register({ id: "files", name: "File Gateway", version: "0.1.0" });

    assert.throws(
        () => registry.assertRequiredInitialized(["notify"]),
        /Required gateway "notify" did not initialize/,
    );
});

test("assertRequiredInitialized is a no-op when requiredIds is empty", () => {
    const registry = new GatewayRegistry();
    assert.doesNotThrow(() => {
        registry.assertRequiredInitialized([]);
    });
});

test("GatewayManifest accepts requires field", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "profile",
        name: "Profile Gateway",
        version: "0.1.0",
        requires: ["db", "files"],
    });

    const manifest = registry.get("profile");
    assert.ok(manifest);
    assert.deepEqual(manifest.requires, ["db", "files"]);
});

test("GatewayRegistry.assertRequiredInitialized throws for missing required gateway", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "db",
        name: "DB Gateway",
        version: "0.1.0",
        required: true,
    });

    assert.throws(
        () => registry.assertRequiredInitialized(["db", "logging"]),
        (err: Error) => err.message.includes("logging"),
    );
});

test("GatewayRegistry.assertRequiredInitialized succeeds when all present", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "db",
        name: "DB Gateway",
        version: "0.1.0",
        required: true,
    });
    registry.register({
        id: "logging",
        name: "Logging Gateway",
        version: "0.1.0",
        required: true,
    });

    assert.doesNotThrow(() =>
        registry.assertRequiredInitialized(["db", "logging"]),
    );
});

test("GatewayRegistry registered gateway has status active by default", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    assert.equal(registry.get("notify")?.status, "active");
});

test("GatewayRegistry.disable sets status to disabled", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    const result = registry.disable("notify");
    assert.ok(result);
    assert.equal(registry.get("notify")?.status, "disabled");
});

test("GatewayRegistry.enable restores status to active", () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    registry.disable("notify");
    const result = registry.enable("notify");
    assert.ok(result);
    assert.equal(registry.get("notify")?.status, "active");
});

test("GatewayRegistry.disable returns false for unknown gateway", () => {
    const registry = new GatewayRegistry();
    assert.equal(registry.disable("unknown"), false);
});

test("GatewayRegistry.enable returns false for unknown gateway", () => {
    const registry = new GatewayRegistry();
    assert.equal(registry.enable("unknown"), false);
});
