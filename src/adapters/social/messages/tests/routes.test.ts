import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../../profile/profile-store.js";
import {
    canMessage,
    canSendMessageRequest,
    canDirectMessageNowOrByApprovedRequest,
} from "../routes.js";

test("canMessage allows mutual followers", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    await profileStore.follow("alice", "bob");
    await profileStore.follow("bob", "alice");

    const allowed = await canMessage(profileStore as any, "alice", "bob");
    assert.equal(allowed, true);
});

test("canMessage blocks one-way follow", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    await profileStore.follow("alice", "bob");

    const allowed = await canMessage(profileStore as any, "alice", "bob");
    assert.equal(allowed, false);
});

test("canSendMessageRequest allows visible non-blocked users", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });

    const allowed = await canSendMessageRequest(
        profileStore as any,
        "alice",
        "bob",
    );
    assert.equal(allowed, true);
});

test("canDirectMessageNowOrByApprovedRequest allows once-approved pairs", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    const messagesStore = {
        async hasApprovedMessageRequestBetween() {
            return true;
        },
    };

    const allowed = await canDirectMessageNowOrByApprovedRequest(
        profileStore as any,
        messagesStore as any,
        "alice",
        "bob",
    );
    assert.equal(allowed, true);
});

test("canDirectMessageNowOrByApprovedRequest blocks unapproved non-mutual pairs", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    await profileStore.follow("alice", "bob");
    const messagesStore = {
        async hasApprovedMessageRequestBetween() {
            return false;
        },
    };

    const allowed = await canDirectMessageNowOrByApprovedRequest(
        profileStore as any,
        messagesStore as any,
        "alice",
        "bob",
    );
    assert.equal(allowed, false);
});
