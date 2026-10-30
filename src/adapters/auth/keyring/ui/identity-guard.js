/**
 * Binds keyring work to one authenticated browser actor and verified account instance.
 * @example const guard = createKeyringIdentityGuard({ readActor, onInvalidate });
 */
export function createKeyringIdentityGuard({ readActor, onInvalidate }) {
    let actor = null;
    let binding = null;
    let fingerprint = "";
    let generation = 0;

    function replace(next) {
        const previous = binding;
        const previousActor = actor;
        actor?.controller.abort();
        binding = null;
        generation++;
        actor = next
            ? Object.freeze({
                  ...next,
                  generation,
                  controller: new AbortController(),
              })
            : null;
        onInvalidate(previous, previousActor);
    }

    function snapshot() {
        const next = readActor();
        const valid = next?.origin && next?.accountId && next?.token;
        const key = valid
            ? JSON.stringify([next.origin, next.accountId, next.token])
            : "";
        if (key !== fingerprint) {
            fingerprint = key;
            replace(valid ? next : null);
        }
        return actor;
    }

    function assertCurrent(expected) {
        if (!expected || snapshot() !== expected)
            throw new DOMException("keyring_identity_changed", "AbortError");
    }

    function currentBinding() {
        snapshot();
        return binding;
    }

    async function verify(expected, accountInstanceId) {
        assertCurrent(expected);
        if (!accountInstanceId) throw new Error("keyring_identity_unverified");
        const digest = new Uint8Array(
            await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(expected.token),
            ),
        );
        assertCurrent(expected);
        if (binding && binding.accountInstanceId !== accountInstanceId)
            replace({
                origin: expected.origin,
                accountId: expected.accountId,
                token: expected.token,
            });
        if (!binding)
            binding = Object.freeze({
                origin: actor.origin,
                accountId: actor.accountId,
                accountInstanceId,
                sessionId: Array.from(digest, (byte) =>
                    byte.toString(16).padStart(2, "0"),
                ).join(""),
                actor,
            });
        return binding;
    }

    function assertBinding(expected) {
        if (!expected || currentBinding() !== expected)
            throw new DOMException("keyring_identity_changed", "AbortError");
        assertCurrent(expected.actor);
    }

    function reject(expected) {
        assertCurrent(expected);
        replace({
            origin: expected.origin,
            accountId: expected.accountId,
            token: expected.token,
        });
    }

    return {
        snapshot,
        verify,
        currentBinding,
        assertCurrent,
        assertBinding,
        reject,
    };
}
