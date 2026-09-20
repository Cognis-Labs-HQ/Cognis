import test from "node:test";
import assert from "node:assert/strict";
import { VolatileLocalAccountStore } from "../reuse/account-store.js";

test("external identities keep one normalized canonical account", async () => {
    const store = new VolatileLocalAccountStore();
    const firstAccountId = await store.ensureExternalAccount({
        accountId: "Provider:MixedCaseSubject",
        provider: "external-provider",
        externalUserId: "MixedCaseSubject",
    });
    const secondAccountId = await store.ensureExternalAccount({
        accountId: "provider:mixedcasesubject",
        provider: "external-provider",
        externalUserId: "MixedCaseSubject",
    });

    assert.equal(firstAccountId, "provider:mixedcasesubject");
    assert.equal(secondAccountId, firstAccountId);
    assert.equal(
        await store.resolveExternalAccountId(
            "external-provider",
            "MixedCaseSubject",
        ),
        firstAccountId,
    );
    assert.equal((await store.list()).length, 1);
});

test("deleted external identities cannot silently recreate accounts", async () => {
    const store = new VolatileLocalAccountStore();
    const identity = {
        accountId: "provider:subject",
        provider: "external-provider",
        externalUserId: "subject",
    };
    await store.ensureExternalAccount(identity);
    await store.delete(identity.accountId);

    assert.equal(
        await store.isExternalIdentityDeleted(
            identity.provider,
            identity.externalUserId,
        ),
        true,
    );
    await assert.rejects(
        () => store.ensureExternalAccount(identity),
        /external_identity_deleted/,
    );
    assert.equal((await store.list()).length, 0);
});
