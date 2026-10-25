import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../store-contract.js";
import { allocatePublicHandle } from "../public-handle.js";

test("SSO public names are distinct from account keys and remain stable when another provider owns the same name", async () => {
    const store = new VolatileProfileStore();
    await store.createProfile("local", "person");
    await store.createProfile("x:person", "x:person");
    const handle = await allocatePublicHandle(store, "x:person", "x:person");
    assert.match(handle, /^person-[a-f0-9]{32}$/);
    await store.updateProfile("x:person", { handle });
    assert.equal(
        await allocatePublicHandle(store, "x:person", "person"),
        handle,
    );
    assert.equal((await store.getProfile("x:person"))?.accountId, "x:person");
    assert.equal(
        (await store.getProfileByHandle(handle))?.accountId,
        "x:person",
    );
    assert.equal(
        await allocatePublicHandle(store, "oidc:another", "oidc:another"),
        "another",
    );
});
