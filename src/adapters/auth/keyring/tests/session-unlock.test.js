import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createSessionUnlockCache } from "../ui/session-unlock.js";
import { createKeyringIdentityGuard } from "../ui/identity-guard.js";
import { deriveKey } from "../ui/crypto.js";

Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
});

async function fixture() {
    const records = new Map();
    const guard = createKeyringIdentityGuard({
        readActor: () => ({
            origin: "https://one.test",
            accountId: "alice",
            token: "authenticated-session-secret",
        }),
        onInvalidate: () => {},
    });
    const binding = await guard.verify(guard.snapshot(), "instance-one");
    const options = {
        assertBinding: (value) => guard.assertBinding(value),
        storage: () => ({
            getItem: (id) => records.get(id) ?? null,
            setItem: (id, value) => records.set(id, value),
            removeItem: (id) => records.delete(id),
        }),
    };
    const key = await deriveKey(
        "keyring-password",
        new Uint8Array(16),
        1000,
        true,
    );
    return {
        records,
        binding,
        options,
        key,
        cache: createSessionUnlockCache(options),
    };
}

test("refresh restores a session-encrypted key without persisting the password, token or raw key", async () => {
    const state = await fixture();
    assert.equal(await state.cache.remember(state.binding, state.key, 0), true);
    const encoded = JSON.stringify([...state.records.values()]);
    const raw = Buffer.from(
        await crypto.subtle.exportKey("raw", state.key),
    ).toString("base64");
    assert.doesNotMatch(
        encoded,
        /keyring-password|authenticated-session-secret/,
    );
    assert.equal(encoded.includes(raw), false);
    const restored = await createSessionUnlockCache(state.options).restore(
        state.binding,
    );
    const initializationVector = new Uint8Array(12);
    const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initializationVector },
        state.key,
        new TextEncoder().encode("private vault"),
    );
    assert.equal(
        new TextDecoder().decode(
            await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: initializationVector },
                restored.key,
                cipher,
            ),
        ),
        "private vault",
    );
    state.cache.remove(state.binding);
    assert.equal(await state.cache.restore(state.binding), null);
});

test("copying cached ciphertext cannot unlock another origin, account, instance or session", async () => {
    const state = await fixture();
    await state.cache.remember(state.binding, state.key, 0);
    const original = [...state.records.values()][0];
    for (const change of [
        { origin: "https://two.test" },
        { accountId: "bob" },
        { accountInstanceId: "instance-two" },
        { sessionId: "other", actor: { token: "other-session-secret" } },
    ]) {
        const binding = { ...state.binding, ...change };
        const options = {
            ...state.options,
            assertBinding: (value) => assert.equal(value, binding),
        };
        const record = JSON.parse(original);
        record.scope = JSON.stringify([
            binding.origin,
            binding.accountId,
            binding.accountInstanceId,
            binding.sessionId,
            0,
        ]);
        const owner = encodeURIComponent(
            JSON.stringify([
                binding.origin,
                binding.accountId,
                binding.accountInstanceId,
            ]),
        );
        state.records.set(
            `cognis_keyring_unlock:${owner}:${binding.sessionId}`,
            JSON.stringify(record),
        );
        assert.equal(
            await createSessionUnlockCache(options).restore(binding),
            null,
        );
    }
});

test("expiry is authenticated and a lock cancels an in-progress cache write", async (context) => {
    const state = await fixture();
    await state.cache.remember(state.binding, state.key, Date.now() + 1000);
    const id = [...state.records.keys()][0];
    const record = JSON.parse(state.records.get(id));
    record.deadline += 10_000;
    record.scope = JSON.stringify([
        state.binding.origin,
        state.binding.accountId,
        state.binding.accountInstanceId,
        state.binding.sessionId,
        record.deadline,
    ]);
    state.records.set(id, JSON.stringify(record));
    assert.equal(await state.cache.restore(state.binding), null);
    let release;
    let entered;
    const started = new Promise((resolve) => {
        entered = resolve;
    });
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    const exportKey = crypto.subtle.exportKey.bind(crypto.subtle);
    context.mock.method(crypto.subtle, "exportKey", async (...args) => {
        entered();
        await pending;
        return exportKey(...args);
    });
    const remembering = state.cache.remember(state.binding, state.key, 0);
    await started;
    state.cache.remove(state.binding);
    release();
    assert.equal(await remembering, false);
    assert.equal(state.records.size, 0);
});
