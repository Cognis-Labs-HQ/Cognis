import assert from "node:assert/strict";
import test from "node:test";
import { DbProfileStore } from "../store.js";
import { ProfileTestExecutor } from "./reuse/executor.js";

test("profile database fixture rolls back failed writes through the executor contract", async () => {
    const executor = new ProfileTestExecutor();
    const profiles = new DbProfileStore(executor);
    await profiles.ensureSchema();
    await profiles.createProfile("existing", "existing");
    await assert.rejects(
        executor.transaction(async (transaction) => {
            const transactionalProfiles = new DbProfileStore(transaction);
            await transactionalProfiles.createProfile("temporary", "temporary");
            await transactionalProfiles.updateProfile("existing", {
                displayName: "Temporary",
            });
            throw new Error("Reject transaction");
        }),
        /Reject transaction/,
    );
    assert.equal(await profiles.getProfile("temporary"), null);
    assert.equal((await profiles.getProfile("existing"))?.displayName, null);
});

test("profile database fixture persists committed writes through the executor contract", async () => {
    const executor = new ProfileTestExecutor();
    const profiles = new DbProfileStore(executor);
    await profiles.ensureSchema();
    await executor.transaction(async (transaction) => {
        await new DbProfileStore(transaction).createProfile(
            "committed",
            "committed",
        );
    });
    assert.equal((await profiles.getProfile("committed"))?.handle, "committed");
});
