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
