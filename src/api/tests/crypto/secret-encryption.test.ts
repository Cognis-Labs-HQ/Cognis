import test from "node:test";
import assert from "node:assert/strict";
import { createCtx, type SecretEncryption } from "@cognis/core";
import { registerSecretEncryption } from "../../bootstrap/secret-encryption.js";

test("the private server cipher persists encrypted values and binds them to source scope and instance key", async (context) => {
    const previous = process.env.DATA_ENCRYPTION_KEY;
    context.after(() => {
        if (previous === undefined) delete process.env.DATA_ENCRYPTION_KEY;
        else process.env.DATA_ENCRYPTION_KEY = previous;
    });
    process.env.DATA_ENCRYPTION_KEY = "disposable-instance-key";
    const ctx = createCtx();
    registerSecretEncryption(ctx);
    assert.equal(ctx.isPublicCapability("secrets:encryption"), false);
    const cipher =
        ctx.requireCapability<SecretEncryption>("secrets:encryption");
    const sealed = await cipher.seal(
        "moduleSources:one",
        "concealed-credential",
    );
    assert.equal(
        JSON.stringify(sealed).includes("concealed-credential"),
        false,
    );
    const restarted = createCtx();
    registerSecretEncryption(restarted);
    assert.equal(
        await restarted
            .requireCapability<SecretEncryption>("secrets:encryption")
            .open("moduleSources:one", JSON.parse(JSON.stringify(sealed))),
        "concealed-credential",
    );
    await assert.rejects(cipher.open("moduleSources:two", sealed));
    process.env.DATA_ENCRYPTION_KEY = "another-instance-key";
    await assert.rejects(cipher.open("moduleSources:one", sealed));
    delete process.env.DATA_ENCRYPTION_KEY;
    await assert.rejects(
        cipher.seal("moduleSources:one", "credential"),
        /server_secret_encryption_unavailable/,
    );
});
