import test from "node:test";
import assert from "node:assert/strict";
import {
    getServerSecret,
    deriveUserKey,
    encryptPayload,
    decryptPayload,
} from "../reuse/crypto-keys.js";

test("getServerSecret: returns NOTIFICATION_ENCRYPT_SECRET when set", () => {
    const original = process.env.NOTIFICATION_ENCRYPT_SECRET;
    process.env.NOTIFICATION_ENCRYPT_SECRET = "test-secret-value";
    assert.equal(getServerSecret(), "test-secret-value");
    if (original === undefined) {
        delete process.env.NOTIFICATION_ENCRYPT_SECRET;
    } else {
        process.env.NOTIFICATION_ENCRYPT_SECRET = original;
    }
});

test("getServerSecret: returns empty string when env var is unset", () => {
    const original = process.env.NOTIFICATION_ENCRYPT_SECRET;
    delete process.env.NOTIFICATION_ENCRYPT_SECRET;
    assert.equal(getServerSecret(), "");
    if (original !== undefined) {
        process.env.NOTIFICATION_ENCRYPT_SECRET = original;
    }
});

test("deriveUserKey: produces a CryptoKey", async () => {
    const key = await deriveUserKey("alice", "server-secret");
    assert.ok(key instanceof CryptoKey);
    assert.equal(key.type, "secret");
    assert.equal(key.extractable, false);
});

test("deriveUserKey: different users produce different keys (encrypt/decrypt isolation)", async () => {
    const keyAlice = await deriveUserKey("alice", "server-secret");
    const keyBob = await deriveUserKey("bob", "server-secret");
    const { iv, ciphertext } = await encryptPayload(keyAlice, "hello");
    await assert.rejects(
        () => decryptPayload(keyBob, iv, ciphertext),
        "Decrypting with a different user's key should fail",
    );
});

test("deriveUserKey: same user + secret produces equivalent keys (round-trip)", async () => {
    const key1 = await deriveUserKey("alice", "s3cr3t");
    const key2 = await deriveUserKey("alice", "s3cr3t");
    const plaintext = JSON.stringify({ subject: "Hello", body: "World" });
    const { iv, ciphertext } = await encryptPayload(key1, plaintext);
    const decrypted = await decryptPayload(key2, iv, ciphertext);
    assert.equal(decrypted, plaintext);
});

test("encryptPayload: returns hex iv and ciphertext", async () => {
    const key = await deriveUserKey("user1", "secret");
    const { iv, ciphertext } = await encryptPayload(key, "test message");
    assert.match(iv, /^[0-9a-f]+$/);
    assert.match(ciphertext, /^[0-9a-f]+$/);
    assert.equal(iv.length, 24, "AES-GCM IV is 12 bytes = 24 hex chars");
});

test("encryptPayload + decryptPayload: round-trip preserves plaintext", async () => {
    const key = await deriveUserKey("round-trip-user", "round-trip-secret");
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
    const key = await deriveUserKey("user2", "secret");
    const { iv: iv1 } = await encryptPayload(key, "same plaintext");
    const { iv: iv2 } = await encryptPayload(key, "same plaintext");
    assert.notEqual(iv1, iv2, "IVs must be unique across encryptions");
});

test("decryptPayload: rejects tampered ciphertext", async () => {
    const key = await deriveUserKey("tamper-user", "secret");
    const { iv, ciphertext } = await encryptPayload(key, "sensitive data");
    const tampered = ciphertext.slice(0, -2) + "00";
    await assert.rejects(
        () => decryptPayload(key, iv, tampered),
        "Tampered ciphertext must not decrypt",
    );
});
