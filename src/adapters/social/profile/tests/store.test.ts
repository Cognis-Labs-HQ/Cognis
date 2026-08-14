import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";
import { DbProfileStore } from "../store.js";
import { VolatileProfileStore } from "../store-contract.js";

for (const role of [
    "user",
    "moderator",
    "teacher",
    "admin",
    "owner",
] as const) {
    test(`${role} profiles default to friends visibility`, async () => {
        const stores = [
            new VolatileProfileStore(),
            new DbProfileStore(new InMemoryTestExecutor()),
        ];

        for (const store of stores) {
            if (store instanceof DbProfileStore) await store.ensureSchema();
            const profile = await store.createProfile(role, role, role);
            assert.equal(profile?.visibility, "friends");
        }
    });

    if (role === "user" || role === "moderator") {
        test(`${role} profiles can be changed to private or hidden`, async () => {
            const stores = [
                new VolatileProfileStore(),
                new DbProfileStore(new InMemoryTestExecutor()),
            ];

            for (const store of stores) {
                if (store instanceof DbProfileStore) await store.ensureSchema();
                await store.createProfile(role, role, role);

                for (const visibility of ["private", "hidden"] as const) {
                    const profile = await store.updateProfile(role, {
                        visibility,
                    });
                    assert.equal(profile?.visibility, visibility);
                }
            }
        });
    }

    if (role === "user" || role === "moderator") continue;
    test(`${role} role updates set profile visibility to friends`, async () => {
        const stores = [
            new VolatileProfileStore(),
            new DbProfileStore(new InMemoryTestExecutor()),
        ];

        for (const store of stores) {
            if (store instanceof DbProfileStore) await store.ensureSchema();
            await store.createProfile(role, role, "user");
            await store.setRoleByHandle(role, role);
            assert.equal((await store.getProfile(role))?.role, role);
            assert.equal((await store.getProfile(role))?.visibility, "friends");
        }
    });
}

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

test("profile store search returns every match when no limit is supplied", async () => {
    const databaseExecutor = new InMemoryTestExecutor();
    const store = new DbProfileStore(databaseExecutor);
    await store.ensureSchema();
    for (let index = 0; index < 12; index += 1) {
        await store.createProfile(
            `account-${index}`,
            `learner-${String(index).padStart(2, "0")}`,
            "user",
            `Learner ${index}`,
        );
    }

    const profiles = await store.searchProfiles("learner");

    assert.equal(profiles.length, 12);
});
