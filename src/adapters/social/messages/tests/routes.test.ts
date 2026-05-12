import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../../profile/profile-store.js";
import { canMessage } from "../routes.js";

test("canMessage allows recipient community visibility", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "friends" });
    await profileStore.updateProfile("bob", { visibility: "community" });

    const allowed = await canMessage(profileStore as any, "alice", "bob");
    assert.equal(allowed, true);
});

test("canMessage blocks non-community recipient that does not follow sender", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "friends" });
    await profileStore.updateProfile("bob", { visibility: "friends" });

    const allowed = await canMessage(profileStore as any, "alice", "bob");
    assert.equal(allowed, false);
});

test("canMessage allows non-community recipient that follows sender", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "friends" });
    await profileStore.updateProfile("bob", { visibility: "friends" });
    await profileStore.follow("bob", "alice");

    const allowed = await canMessage(profileStore as any, "alice", "bob");
    assert.equal(allowed, true);
});
