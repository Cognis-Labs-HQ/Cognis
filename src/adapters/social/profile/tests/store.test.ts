import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";
import { DbProfileStore } from "../store.js";

test("profile store resolves handles case-insensitively", async () => {
    const databaseExecutor = new InMemoryTestExecutor();
    const store = new DbProfileStore(databaseExecutor);
    await store.ensureSchema();
    await store.createProfile("alice-account", "AliceUser", "user", "Alice");

    const profile = await store.getProfileByHandle("aliceuser");

    assert.ok(profile);
    assert.equal(profile?.accountId, "alice-account");
    assert.equal(profile?.handle, "AliceUser");
});

test("profile store search can require a follow relationship", async () => {
    const databaseExecutor = new InMemoryTestExecutor();
    const store = new DbProfileStore(databaseExecutor);
    await store.ensureSchema();
    await store.createProfile("alice-account", "alice", "user", "Alice");
    await store.createProfile("bob-account", "bob", "user", "Bob Teacher");
    await store.createProfile(
        "mallory-account",
        "mallory",
        "user",
        "Mallory Teacher",
    );
    await store.follow("alice-account", "bob-account");

    const profiles = await store.searchProfiles("", 50, {
        includeHidden: true,
        requesterAccountId: "alice-account",
        followingAccountId: "alice-account",
        candidateHandles: ["bob", "mallory"],
    });

    assert.deepEqual(
        profiles.map((profile) => profile.handle),
        ["bob"],
    );
});
