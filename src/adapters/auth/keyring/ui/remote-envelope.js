/** Load authoritative vault metadata once per current actor while a read is pending. */
export function createEnvelopeLoader({
    apiFetch,
    identityGuard,
    apiPath,
    temporaryAccount,
    defaultIterations,
    onRead,
}) {
    const pending = new WeakMap();
    async function read(actor) {
        try {
            let data;
            if (temporaryAccount()) {
                data = {
                    accountId: actor.accountId,
                    accountInstanceId: `temporary:${actor.accountId}`,
                };
            } else {
                const response = await apiFetch(apiPath, {
                    accessToken: actor.token,
                    signal: actor.controller.signal,
                });
                identityGuard.assertCurrent(actor);
                if (response.status === 401 || response.status === 403) {
                    identityGuard.reject(actor);
                    return { resolved: false, envelope: null };
                }
                if (!response.ok)
                    throw new Error("keyring_metadata_unavailable");
                data = (await response.json())?.data;
            }
            identityGuard.assertCurrent(actor);
            if (
                data?.accountId !== actor.accountId ||
                !data?.accountInstanceId
            ) {
                identityGuard.reject(actor);
                return { resolved: false, envelope: null };
            }
            const binding = await identityGuard.verify(
                actor,
                data.accountInstanceId,
            );
            onRead(true);
            return {
                resolved: true,
                binding,
                envelope: data.vault ?? null,
                accountInstanceId: binding.accountInstanceId,
                derivationIterations: Number(
                    data.policy?.derivationIterations ?? defaultIterations,
                ),
            };
        } catch (error) {
            if (error?.name === "AbortError") throw error;
            identityGuard.assertCurrent(actor);
            console.error("[keyring] metadata read failed", {
                component: "auth-keyring",
                operation: "loadEnvelope",
                errorName: error?.name,
            });
            const binding = identityGuard.currentBinding();
            onRead(false);
            return {
                resolved: false,
                envelope: null,
                binding,
                accountInstanceId: binding?.accountInstanceId,
            };
        }
    }
    return () => {
        const actor = identityGuard.snapshot();
        if (!actor) {
            onRead(false);
            return Promise.resolve({ resolved: false, envelope: null });
        }
        if (pending.has(actor)) return pending.get(actor);
        const request = read(actor).finally(() => pending.delete(actor));
        pending.set(actor, request);
        return request;
    };
}
