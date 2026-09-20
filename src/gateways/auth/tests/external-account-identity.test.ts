import test from "node:test";
import assert from "node:assert/strict";
import { VolatileLocalAccountStore } from "../reuse/account-store.js";

test("external identities keep one normalized canonical account", async () => {
    const store = new VolatileLocalAccountStore();
    const firstAccountId = await store.ensureExternalAccount({
        accountId: "MixedCaseSubject",
        provider: "external-provider",
        externalUserId: "MixedCaseSubject",
    });
    const secondAccountId = await store.ensureExternalAccount({
        accountId: "external-provider:mixedcasesubject",
        provider: "external-provider",
        externalUserId: "MixedCaseSubject",
    });

    assert.equal(firstAccountId, "external-provider:mixedcasesubject");
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

test("successful external authentication can recreate a deleted account", async () => {
    const store = new VolatileLocalAccountStore();
    const identity = {
        accountId: "subject",
        provider: "external-provider",
        externalUserId: "subject",
    };
    const accountId = await store.ensureExternalAccount(identity);
    await store.delete(accountId);

    assert.equal(
        await store.isExternalIdentityDeleted(
            identity.provider,
            identity.externalUserId,
        ),
        true,
    );
    const recreatedAccountId = await store.ensureExternalAccount(identity);

    assert.equal(recreatedAccountId, accountId);
    assert.equal(
        await store.isExternalIdentityDeleted(
            identity.provider,
            identity.externalUserId,
        ),
        false,
    );
    assert.equal((await store.list()).length, 1);
});

test("provider namespaces keep identical local and external handles distinct", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("firehawksystems", "password");
    await store.ensureExternalAccount({
        accountId: "firehawksystems",
        accountNamespace: "x",
        provider: "x-sso",
        externalUserId: "x-subject",
    });
    await store.ensureExternalAccount({
        accountId: "firehawksystems",
        accountNamespace: "line",
        provider: "line-sso",
        externalUserId: "line-subject",
    });

    assert.deepEqual(
        (await store.list()).map((account) => account.username).sort(),
        ["firehawksystems", "line:firehawksystems", "x:firehawksystems"],
    );
});

test("external identities cannot attach to a colliding local account", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("external-provider:alice", "password");

    await assert.rejects(
        () =>
            store.ensureExternalAccount({
                accountId: "alice",
                provider: "external-provider",
                externalUserId: "opaque-alice-subject",
            }),
        /external_account_id_conflict/,
    );
    assert.equal(
        await store.resolveExternalAccountId(
            "external-provider",
            "opaque-alice-subject",
        ),
        null,
    );
});
