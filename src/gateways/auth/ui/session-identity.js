/**
 * Auth-owned, token-bound browser identity verification.
 * createSessionIdentityClient(apiFetch, getToken) exposes verify/get/clear.
 * Call verify inside authentication flows before interpreting an identity.
 */
export function createSessionIdentityClient(apiFetch, getToken) {
    const identities = new Map();
    const pending = new Map();
    let generation = 0;

    function get() {
        return identities.get(getToken()) ?? null;
    }

    function clear() {
        generation++;
        identities.clear();
        pending.clear();
    }

    async function verify(token = getToken()) {
        if (!token) return null;
        if (pending.has(token)) return pending.get(token);
        const started = generation;
        const request = (async () => {
            await Promise.resolve();
            try {
                const response = await apiFetch(
                    "/api/v1/auth/session-identity",
                    {
                        accessToken: token,
                        suppressAccessDeniedEvent: true,
                    },
                );
                const identity = response.ok
                    ? (await response.json())?.data
                    : null;
                if (started !== generation) return null;
                if (
                    !identity ||
                    !["session", "share"].includes(identity.purpose) ||
                    typeof identity.sub !== "string" ||
                    !identity.sub ||
                    typeof identity.role !== "string"
                ) {
                    identities.delete(token);
                    return null;
                }
                identities.delete(token);
                identities.set(token, Object.freeze({ ...identity }));
                while (identities.size > 2)
                    identities.delete(identities.keys().next().value);
                return identities.get(token);
            } catch (error) {
                if (started === generation) identities.delete(token);
                throw error;
            } finally {
                if (pending.get(token) === request) pending.delete(token);
            }
        })();
        pending.set(token, request);
        return request;
    }

    return { verify, get, clear };
}
