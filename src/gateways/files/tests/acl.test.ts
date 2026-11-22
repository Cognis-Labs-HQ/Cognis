import test from "node:test";
import assert from "node:assert/strict";
import {
    assertWithinCeiling,
    AclCeilingViolationError,
    canAccess,
} from "../reuse/acl.js";
import type { NamespaceAcl } from "@cognis/core";

const PRIVATE_OWNER: NamespaceAcl = { visibility: "private-owner" };
const PRIVATE_GROUP: NamespaceAcl = { visibility: "private-group" };
const COMPONENT_MANAGED: NamespaceAcl = { visibility: "component-managed" };

test("assertWithinCeiling rejects publicRead in a private-owner namespace", () => {
    assert.throws(
        () =>
            assertWithinCeiling(PRIVATE_OWNER, {
                ownerId: "alice",
                publicRead: true,
            }),
        AclCeilingViolationError,
    );
});

test("assertWithinCeiling rejects groupIds in a private-owner namespace", () => {
    assert.throws(
        () =>
            assertWithinCeiling(PRIVATE_OWNER, {
                ownerId: "alice",
                groupIds: ["bob"],
            }),
        AclCeilingViolationError,
    );
});

test("assertWithinCeiling rejects publicRead in a private-group namespace", () => {
    assert.throws(
        () =>
            assertWithinCeiling(PRIVATE_GROUP, {
                ownerId: "alice",
                publicRead: true,
            }),
        AclCeilingViolationError,
    );
});

test("assertWithinCeiling allows groupIds in a private-group namespace", () => {
    assert.doesNotThrow(() =>
        assertWithinCeiling(PRIVATE_GROUP, {
            ownerId: "alice",
            groupIds: ["bob"],
        }),
    );
});

test("assertWithinCeiling allows publicRead in a component-managed namespace", () => {
    assert.doesNotThrow(() =>
        assertWithinCeiling(COMPONENT_MANAGED, {
            ownerId: "alice",
            publicRead: true,
        }),
    );
});

test("canAccess always allows the owner", () => {
    assert.equal(
        canAccess(
            PRIVATE_OWNER,
            { ownerId: "alice" },
            { callerComponent: "test-component", actorId: "alice" },
        ),
        true,
    );
});

test("canAccess denies non-owners in a private-owner namespace", () => {
    assert.equal(
        canAccess(
            PRIVATE_OWNER,
            { ownerId: "alice" },
            { callerComponent: "test-component", actorId: "bob" },
        ),
        false,
    );
});

test("canAccess allows group members in a private-group namespace", () => {
    assert.equal(
        canAccess(
            PRIVATE_GROUP,
            { ownerId: "alice", groupIds: ["bob"] },
            { callerComponent: "test-component", actorId: "bob" },
        ),
        true,
    );
});

test("canAccess denies non-members in a private-group namespace", () => {
    assert.equal(
        canAccess(
            PRIVATE_GROUP,
            { ownerId: "alice", groupIds: ["bob"] },
            { callerComponent: "test-component", actorId: "carol" },
        ),
        false,
    );
});

test("canAccess allows public readers in a component-managed namespace", () => {
    assert.equal(
        canAccess(
            COMPONENT_MANAGED,
            { ownerId: "alice", publicRead: true },
            { callerComponent: "test-component", actorId: "carol" },
        ),
        true,
    );
});

test("canAccess denies unrelated actors in a component-managed namespace without publicRead", () => {
    assert.equal(
        canAccess(
            COMPONENT_MANAGED,
            { ownerId: "alice" },
            { callerComponent: "test-component", actorId: "carol" },
        ),
        false,
    );
});

test("canAccess restricts deletes to owners and privileged actors", () => {
    assert.equal(
        canAccess(
            COMPONENT_MANAGED,
            { ownerId: "alice", publicRead: true },
            { callerComponent: "test-component", actorId: "bob" },
            "delete",
        ),
        false,
    );
    assert.equal(
        canAccess(
            COMPONENT_MANAGED,
            { ownerId: "alice", publicRead: true },
            {
                callerComponent: "test-component",
                actorId: "root",
                role: "admin",
            },
            "delete",
        ),
        true,
    );
});
