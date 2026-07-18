import test from "node:test";
import assert from "node:assert/strict";
import { NamespaceRegistry } from "../reuse/namespace-registry.js";

test("namespace registry rejects duplicate namespace ids", () => {
    const registry = new NamespaceRegistry();
    registry.register({
        id: "profile",
        ownerComponent: "social-profile",
        acl: { visibility: "component-managed" },
    });
    assert.throws(
        () =>
            registry.register({
                id: "profile",
                ownerComponent: "someone-else",
                acl: { visibility: "component-managed" },
            }),
        /already registered/,
    );
});

test("namespace registry require throws for unknown namespace", () => {
    const registry = new NamespaceRegistry();
    assert.throws(() => registry.require("unknown"), /is not registered/);
});

test("namespace registry lists all registered namespaces", () => {
    const registry = new NamespaceRegistry();
    registry.register({
        id: "default",
        ownerComponent: "core",
        acl: { visibility: "component-managed" },
    });
    registry.register({
        id: "user",
        ownerComponent: "core",
        acl: { visibility: "private-owner" },
    });
    assert.deepEqual(
        registry
            .list()
            .map((definition) => definition.id)
            .sort(),
        ["default", "user"],
    );
});

test("componentAllowed permits core, owner, and allow-listed components only", () => {
    const registry = new NamespaceRegistry();
    const definition = {
        id: "chats",
        ownerComponent: "social-messages",
        acl: { visibility: "private-group" as const },
        allowComponents: ["study-classes"],
    };
    registry.register(definition);

    assert.equal(registry.componentAllowed(definition, "core"), true);
    assert.equal(
        registry.componentAllowed(definition, "social-messages"),
        true,
    );
    assert.equal(registry.componentAllowed(definition, "study-classes"), true);
    assert.equal(
        registry.componentAllowed(definition, "social-profile"),
        false,
    );
});

test("namespace registry validates namespace and component ids", () => {
    const registry = new NamespaceRegistry();

    assert.throws(
        () =>
            registry.register({
                id: "Profile Media",
                ownerComponent: "social-profile",
                acl: { visibility: "component-managed" },
            }),
        /Namespace id/,
    );
    assert.throws(
        () =>
            registry.register({
                id: "profile",
                ownerComponent: "SocialProfile",
                acl: { visibility: "component-managed" },
            }),
        /Namespace owner component/,
    );
});
