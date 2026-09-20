export function createLoginIntegrationLoader() {
    let configLoadPromise = null;

    async function loadConfig() {
        if (!configLoadPromise) {
            configLoadPromise = fetch("/api/v1/auth/login-ui")
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error("login_ui_unavailable");
                    }
                    const payload = await response.json().catch(() => null);
                    const data = payload?.data ?? {};
                    return {
                        methods: Array.isArray(data.methods)
                            ? data.methods
                            : [],
                        integrations: Array.isArray(data.integrations)
                            ? data.integrations
                            : [],
                    };
                })
                .catch((error) => {
                    console.error(error);
                    return { methods: [], integrations: [] };
                });
        }
        return configLoadPromise;
    }

    async function loadClient(integrationId, createClient) {
        const config = await loadConfig();
        const integration = config.integrations.find(
            (candidate) =>
                candidate?.id === integrationId &&
                typeof candidate.scriptUrl === "string" &&
                candidate.scriptUrl.trim().length > 0,
        );
        if (!integration) return null;
        try {
            return createClient(await import(integration.scriptUrl));
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    return { loadConfig, loadClient };
}
