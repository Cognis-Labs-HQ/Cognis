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

test("deleted external identities cannot silently recreate accounts", async () => {
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
    await assert.rejects(
        () => store.ensureExternalAccount(identity),
        /external_identity_deleted/,
    );
    assert.equal((await store.list()).length, 0);
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
