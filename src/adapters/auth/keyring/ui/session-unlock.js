import { encodeBytes, decodeBytes } from "./crypto.js";
import { keyringStorageKeys } from "./storage-keys.js";

/** Persist only session-encrypted unlock material in the current tab, never a password or plaintext key. */
export function createSessionUnlockCache({
    assertBinding,
    storage = () => sessionStorage,
}) {
    let generation = 0;
    let last;
    const cacheKey = (binding) =>
        `cognis_keyring_unlock:${keyringStorageKeys(binding).session}`;
    const scope = (binding, deadline) =>
        JSON.stringify([
            binding.origin,
            binding.accountId,
            binding.accountInstanceId,
            binding.sessionId,
            deadline,
        ]);
    const wrappingKey = async (binding, salt) => {
        const material = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(binding.actor.token),
            "HKDF",
            false,
            ["deriveKey"],
        );
        return crypto.subtle.deriveKey(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt,
                info: new TextEncoder().encode(
                    keyringStorageKeys(binding).session,
                ),
            },
            material,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"],
        );
    };
    const remove = (binding) => {
        generation++;
        last = null;
        try {
            if (binding) storage().removeItem(cacheKey(binding));
        } catch (error) {
            console.info("[keyring] unlock cleanup unavailable", {
                operation: "removeUnlock",
                errorName: error?.name,
            });
        }
    };
    function remember(binding, key, deadline) {
        if (
            last?.binding === binding &&
            last.key === key &&
            last.deadline === deadline
        )
            return last.promise;
        const version = ++generation;
        const promise = (async () => {
            try {
                assertBinding(binding);
                storage().removeItem(cacheKey(binding));
                const salt = crypto.getRandomValues(new Uint8Array(32));
                const initializationVector = crypto.getRandomValues(
                    new Uint8Array(12),
                );
                const raw = await crypto.subtle.exportKey("raw", key);
                const encryptionKey = await wrappingKey(binding, salt);
                const cipher = await crypto.subtle.encrypt(
                    {
                        name: "AES-GCM",
                        iv: initializationVector,
                        additionalData: new TextEncoder().encode(
                            scope(binding, deadline),
                        ),
                    },
                    encryptionKey,
                    raw,
                );
                assertBinding(binding);
                if (version !== generation) return false;
                storage().setItem(
                    cacheKey(binding),
                    JSON.stringify({
                        scope: scope(binding, deadline),
                        deadline,
                        salt: encodeBytes(salt),
                        iv: encodeBytes(initializationVector),
                        cipher: encodeBytes(new Uint8Array(cipher)),
                    }),
                );
                return true;
            } catch (error) {
                if (error?.name !== "AbortError")
                    console.info("[keyring] unlock persistence unavailable", {
                        operation: "rememberUnlock",
                        errorName: error?.name,
                    });
                if (
                    last?.binding === binding &&
                    last.key === key &&
                    last.deadline === deadline
                )
                    last = null;
                return false;
            }
        })();
        last = { binding, key, deadline, promise };
        return promise;
    }
    async function restore(binding) {
        const version = generation;
        try {
            assertBinding(binding);
            const record = JSON.parse(
                storage().getItem(cacheKey(binding)) ?? "null",
            );
            if (!record) return null;
            if (
                !Number.isFinite(record.deadline) ||
                record.deadline < 0 ||
                record.scope !== scope(binding, record.deadline) ||
                (record.deadline && record.deadline <= Date.now())
            ) {
                remove(binding);
                return null;
            }
            const encryptionKey = await wrappingKey(
                binding,
                decodeBytes(record.salt),
            );
            const raw = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: decodeBytes(record.iv),
                    additionalData: new TextEncoder().encode(record.scope),
                },
                encryptionKey,
                decodeBytes(record.cipher),
            );
            const key = await crypto.subtle.importKey(
                "raw",
                raw,
                "AES-GCM",
                true,
                ["encrypt", "decrypt"],
            );
            assertBinding(binding);
            return version === generation
                ? { key, deadline: record.deadline }
                : null;
        } catch (error) {
            if (error?.name !== "AbortError") {
                console.info("[keyring] cached unlock unavailable", {
                    operation: "restoreUnlock",
                    errorName: error?.name,
                });
                if (version === generation) remove(binding);
            }
            return null;
        }
    }
    function clearActor(actor) {
        generation++;
        last = null;
        if (!actor) return;
        try {
            const target = storage();
            for (let index = target.length - 1; index >= 0; index--) {
                const id = target.key(index);
                if (!id?.startsWith("cognis_keyring_unlock:")) continue;
                const record = JSON.parse(target.getItem(id));
                const owner = JSON.parse(record.scope);
                if (owner[0] === actor.origin && owner[1] === actor.accountId)
                    target.removeItem(id);
            }
        } catch (error) {
            console.info("[keyring] unlock cleanup unavailable", {
                operation: "clearActorUnlocks",
                errorName: error?.name,
            });
        }
    }
    return { remember, restore, remove, clearActor };
}
