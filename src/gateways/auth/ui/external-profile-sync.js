import { uiCtx } from "/static/reuse/ui-ctx.js";

const providerSynchronizers = new Map();

function registerExternalProfileSynchronizer({ providerId, synchronize }) {
    const normalizedProviderId = String(providerId ?? "").trim();
    if (!normalizedProviderId || typeof synchronize !== "function") {
        throw new Error("invalid_external_profile_synchronizer");
    }
    if (providerSynchronizers.has(normalizedProviderId)) {
        throw new Error("external_profile_synchronizer_already_registered");
    }
    providerSynchronizers.set(normalizedProviderId, synchronize);
    return () => {
        if (providerSynchronizers.get(normalizedProviderId) === synchronize) {
            providerSynchronizers.delete(normalizedProviderId);
        }
    };
}

const externalProfileSync = Object.freeze({
    supports(providerId) {
        return providerSynchronizers.has(String(providerId ?? "").trim());
    },
    async synchronize({ providerId }) {
        const normalizedProviderId = String(providerId ?? "").trim();
        const synchronize = providerSynchronizers.get(normalizedProviderId);
        if (!synchronize) {
            throw new Error("external_profile_sync_unsupported");
        }
        await synchronize({ providerId: normalizedProviderId });
    },
});

uiCtx.capabilities.contribute(
    "auth:registerExternalProfileSynchronizer",
    registerExternalProfileSynchronizer,
);
uiCtx.capabilities.contribute("auth:externalProfileSync", externalProfileSync);
