export function createWhiteboardEnableTest({
    store,
    checkHttpLiveness,
    timeoutMs,
}) {
    return async function runEnableTest() {
        await store.ensureSchema();
        const config = await store.getConfig();
        if (!config.serverUrl || !config.apiKeyConfigured) {
            return {
                ok: false,
                code: "config_required",
                message:
                    "The whiteboard server URL and API key must be configured before the module can be enabled.",
            };
        }
        const liveness = await checkHttpLiveness(config.serverUrl, {
            timeoutMs,
        });
        return {
            ok: Boolean(liveness.alive),
            code: liveness.alive ? "ok" : "liveness_failed",
            message: liveness.alive
                ? "Nextcloud Whiteboard enablement test passed."
                : "The configured Nextcloud Whiteboard server did not respond successfully.",
            data: { ...liveness, serverUrl: config.serverUrl },
        };
    };
}

export function registerWhiteboardEnableTestRoute({
    router,
    runEnableTest,
    sendError,
    sendJson,
}) {
    router.post(
        "/api/v1/modules/nextcloud-whiteboard/admin/enable-test",
        async (_req, res) => {
            const result = await runEnableTest();
            if (!result.ok) {
                sendError(res, 409, result.code, result.message);
                return;
            }
            sendJson(res, 200, { data: result.data });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );
}
