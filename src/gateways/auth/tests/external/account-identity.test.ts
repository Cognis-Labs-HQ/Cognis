import test from "node:test";
import assert from "node:assert/strict";
import { VolatileLocalAccountStore } from "../../reuse/account-store.js";

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

    assert.match(firstAccountId, /^u_[a-f0-9]{32}$/);
    assert.equal(await store.getUsername(firstAccountId), "mixedcasesubject");
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

    assert.notEqual(recreatedAccountId, accountId);
    assert.match(recreatedAccountId, /^u_[a-f0-9]{32}$/);
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

    const accounts = await store.list();
    assert.equal(new Set(accounts.map((account) => account.username)).size, 3);
    assert.equal(accounts[0].username, "firehawksystems");
    for (const account of accounts.slice(1)) {
        assert.match(account.username, /^firehawksystems-[a-z0-9]{4}$/);
        assert.match(account.accountId, /^u_[a-f0-9]{32}$/);
    }
});

test("two subjects from one provider cannot claim the same username", async () => {
    const store = new VolatileLocalAccountStore();
    await store.ensureExternalAccount({
        accountId: "alice",
        provider: "oidc",
        externalUserId: "one",
    });
    await assert.rejects(
        store.ensureExternalAccount({
            accountId: "ALICE",
            provider: "oidc",
            externalUserId: "two",
        }),
        /provider_username_taken/,
    );
    assert.equal((await store.list()).length, 1);
});
