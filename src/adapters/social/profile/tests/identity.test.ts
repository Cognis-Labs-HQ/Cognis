import assert from "node:assert/strict";
import test from "node:test";
import { createProfileIdentityCapability } from "../identity.js";

test("profile identity normalizes handles and resolves account IDs", async () => {
    const identity = createProfileIdentityCapability({
        async getProfile(accountId: string) {
            return accountId === "account-1"
                ? ({ handle: "  @@Alice  " } as never)
                : null;
        },
    });

    assert.equal(identity.normalizeHandleKey(" @@Alice "), "alice");
    assert.deepEqual(
        identity.normalizeHandleKeys([" @Bob ", "alice", "@bob", ""]),
        ["alice", "bob"],
    );
    assert.equal(await identity.resolveAccountHandle(" account-1 "), "alice");
    await assert.rejects(
        identity.resolveAccountHandle("", "actorAccountId"),
        /actorAccountId is required/,
    );
    await assert.rejects(
        identity.resolveAccountHandle("missing", "userAccountId"),
        /userAccountId must identify a profile with a handle/,
    );
});

test("profile identity rejects access while its adapter is disabled", async () => {
    let enabled = true;
    const identity = createProfileIdentityCapability(
        {
            async getProfile() {
                return { handle: "alice" } as never;
            },
        },
        () => enabled,
    );

    assert.equal(identity.normalizeHandleKey("@Alice"), "alice");
    enabled = false;

    assert.throws(
        () => identity.normalizeHandleKey("@Alice"),
        /Social Profile adapter is disabled/,
    );
    assert.throws(
        () => identity.normalizeHandleKeys(["@Alice"]),
        /Social Profile adapter is disabled/,
    );
    await assert.rejects(
        identity.resolveAccountHandle("account-1"),
        /Social Profile adapter is disabled/,
    );
});
