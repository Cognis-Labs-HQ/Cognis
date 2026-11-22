export function createAdapter() {
    return {
        id: "discovery-proof",
        name: "Discovery proof",
        defaultEnabled: true,
        getConfigSchema: () => [],
        beginSetup: async () => ({
            pendingPayload: {},
            view: { prompt: "Proof" },
        }),
        verifySetup: async () => ({ verified: true, state: {} }),
        verifyLogin: async ({ payload }) => ({
            verified: payload.code === "123456",
        }),
    };
}
