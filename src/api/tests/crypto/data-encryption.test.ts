import test from "node:test";
import assert from "node:assert/strict";
import {
    getDataEncryptionKey,
    deriveScopedKey,
    encryptPayload,
    decryptPayload,
} from "../../reuse/crypto.js";

test("getDataEncryptionKey: returns DATA_ENCRYPTION_KEY when set", () => {
    const original = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = "test-secret-value";
    assert.equal(getDataEncryptionKey(), "test-secret-value");
    if (original === undefined) {
        delete process.env.DATA_ENCRYPTION_KEY;
    } else {
        process.env.DATA_ENCRYPTION_KEY = original;
    }
});

test("getDataEncryptionKey: returns empty string when env var is unset", () => {
    const original = process.env.DATA_ENCRYPTION_KEY;
    delete process.env.DATA_ENCRYPTION_KEY;
    assert.equal(getDataEncryptionKey(), "");
    if (original !== undefined) {
        process.env.DATA_ENCRYPTION_KEY = original;
    }
});

test("deriveScopedKey: produces a non-extractable CryptoKey", async () => {
    const key = await deriveScopedKey(
        "user:notifications:alice",
        "server-secret",
    );
    assert.ok(key instanceof CryptoKey);
    assert.equal(key.type, "secret");
    assert.equal(key.extractable, false);
});

test("deriveScopedKey: different scopes produce different keys (encrypt/decrypt isolation)", async () => {
    const keyAlice = await deriveScopedKey(
        "user:notifications:alice",
        "server-secret",
    );
    const keyBob = await deriveScopedKey(
        "user:notifications:bob",
        "server-secret",
    );
    const { iv, ciphertext } = await encryptPayload(keyAlice, "hello");
    await assert.rejects(
        () => decryptPayload(keyBob, iv, ciphertext),
        "Decrypting with a different scope's key should fail",
    );
});

test("deriveScopedKey: different subsystems with same identifier produce different keys", async () => {
    const notifKey = await deriveScopedKey(
        "user:notifications:alice",
        "server-secret",
    );
    const mfaKey = await deriveScopedKey("user:mfa:alice", "server-secret");
    const { iv, ciphertext } = await encryptPayload(notifKey, "hello");
    await assert.rejects(
        () => decryptPayload(mfaKey, iv, ciphertext),
        "Different subsystems with the same identifier must derive distinct keys",
    );
});

test("deriveScopedKey: same scope + secret produces equivalent keys (round-trip)", async () => {
    const key1 = await deriveScopedKey("user:notifications:alice", "s3cr3t");
    const key2 = await deriveScopedKey("user:notifications:alice", "s3cr3t");
    const plaintext = JSON.stringify({ subject: "Hello", body: "World" });
    const { iv, ciphertext } = await encryptPayload(key1, plaintext);
    const decrypted = await decryptPayload(key2, iv, ciphertext);
    assert.equal(decrypted, plaintext);
});

test("encryptPayload: returns hex iv and ciphertext", async () => {
    const key = await deriveScopedKey("user:notifications:user1", "secret");
    const { iv, ciphertext } = await encryptPayload(key, "test message");
    assert.match(iv, /^[0-9a-f]+$/);
    assert.match(ciphertext, /^[0-9a-f]+$/);
    assert.equal(iv.length, 24, "AES-GCM IV is 12 bytes = 24 hex chars");
});

test("encryptPayload + decryptPayload: round-trip preserves plaintext", async () => {
    const key = await deriveScopedKey(
        "user:notifications:round-trip-user",
        "round-trip-secret",
    );
    const original = JSON.stringify({
        subject: "Test",
        body: "Content",
        category: "system",
    });
    const { iv, ciphertext } = await encryptPayload(key, original);
    const decrypted = await decryptPayload(key, iv, ciphertext);
    assert.equal(decrypted, original);
});

test("encryptPayload: each call produces a unique IV", async () => {
    const key = await deriveScopedKey("user:notifications:user2", "secret");
    const { iv: iv1 } = await encryptPayload(key, "same plaintext");
    const { iv: iv2 } = await encryptPayload(key, "same plaintext");
    assert.notEqual(iv1, iv2, "IVs must be unique across encryptions");
});

test("decryptPayload: rejects tampered ciphertext", async () => {
    const key = await deriveScopedKey(
        "user:notifications:tamper-user",
        "secret",
    );
    const { iv, ciphertext } = await encryptPayload(key, "sensitive data");
    const tampered = ciphertext.slice(0, -2) + "00";
    await assert.rejects(
        () => decryptPayload(key, iv, tampered),
        "Tampered ciphertext must not decrypt",
    );
});
