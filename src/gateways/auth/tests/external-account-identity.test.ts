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
