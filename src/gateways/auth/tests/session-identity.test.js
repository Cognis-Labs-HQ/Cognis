import assert from "node:assert/strict";
import test from "node:test";
import { createSessionIdentityClient } from "../ui/session-identity.js";

function fixture() {
    let token = "account-token";
    let deny = false;
    const requests = [];
    const identities = new Map([
        [
            "account-token",
            { sub: "share:ordinary", purpose: "session", role: "user" },
        ],
        [
            "guest-token",
            { sub: "share:resource:guest", purpose: "share", role: "user" },
        ],
    ]);
    const client = createSessionIdentityClient(
        async (url, options) => {
            requests.push({ url, ...options });
            return {
                ok: !deny,
                json: async () => ({
                    data: identities.get(options.accessToken),
                }),
            };
        },
        () => token,
    );
    return {
        client,
        requests,
        setToken(value) {
            token = value;
        },
        deny() {
            deny = true;
        },
    };
}

test("identity classification requires a verified token, including prefixed account names", async () => {
    const state = fixture();
    assert.equal(state.client.get(), null);
    const identity = await state.client.verify();
    assert.equal(identity.purpose, "session");
    assert.equal(identity.sub, "share:ordinary");
    assert.equal(state.client.get(), identity);
    state.setToken("unverified");
    assert.equal(state.client.get(), null);
    assert.equal(await state.client.verify(), null);
});

test("guest verification uses the explicit token without replacing the current account identity", async () => {
    const state = fixture();
    await state.client.verify();
    assert.equal((await state.client.verify("guest-token")).purpose, "share");
    assert.equal(state.client.get().purpose, "session");
    state.setToken("guest-token");
    assert.equal(state.client.get().purpose, "share");
    assert.equal(state.requests.at(-1).accessToken, "guest-token");
    state.deny();
    assert.equal(await state.client.verify(), null);
    assert.equal(state.client.get(), null);
});

test("concurrent identity reads coalesce and logout prevents a late read from restoring identity", async () => {
    const release = Promise.withResolvers();
    let calls = 0;
    const client = createSessionIdentityClient(
        async () => {
            calls++;
            await release.promise;
            return {
                ok: true,
                json: async () => ({
                    data: { sub: "account", role: "user", purpose: "session" },
                }),
            };
        },
        () => "token",
    );
    const first = client.verify();
    const second = client.verify();
    await Promise.resolve();
    assert.equal(calls, 1);
    client.clear();
    release.resolve();
    assert.equal(await first, null);
    assert.equal(await second, null);
    assert.equal(client.get(), null);
});
