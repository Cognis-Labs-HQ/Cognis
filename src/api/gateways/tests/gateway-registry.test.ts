import test from "node:test";
import assert from "node:assert/strict";
import { GatewayRegistry } from "../../gateway-registry.js";

test("GatewayRegistry.register and list", () => {
    const registry = new GatewayRegistry();

    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        publisher: "Cognis Labs",
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
        publisher: "Cognis Labs",
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
