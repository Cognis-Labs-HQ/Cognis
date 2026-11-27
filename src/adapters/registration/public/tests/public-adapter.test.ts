import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("public registration persists display name through the account store", async () => {
    let registerArgumentsList:
        | {
              username: string;
              password: string;
              role: string | undefined;
              displayName: string | undefined;
          }
        | undefined;
    let profileArgumentsList:
        | {
              accountId: string;
              handle: string;
              role: string | undefined;
              displayName: string | undefined;
          }
        | undefined;

    const adapter = createAdapter({
        accountStore: {
            async register(username, password, role, displayName) {
                registerArgumentsList = {
                    username,
                    password,
                    role,
                    displayName,
                };
                return { username, role: role ?? "user", enabled: true };
            },
        } as never,
        async createProfile(accountId, handle, role, displayName) {
            profileArgumentsList = { accountId, handle, role, displayName };
        },
    });

    const result = await adapter.public?.register({
        username: "alice",
        password: "secret",
        displayName: "  Alice Liddell  ",
    });

    assert.deepEqual(result, {
        username: "alice",
        role: "user",
        enabled: true,
    });
    assert.deepEqual(registerArgumentsList, {
        username: "alice",
        password: "secret",
        role: "user",
        displayName: "Alice Liddell",
    });
    assert.deepEqual(profileArgumentsList, {
        accountId: "alice",
        handle: "alice",
        role: "user",
        displayName: "Alice Liddell",
    });
});
