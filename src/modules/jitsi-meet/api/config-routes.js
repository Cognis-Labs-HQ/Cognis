export function registerMeetingConfigRoutes({
    router,
    store,
    requireAuth,
    readJson,
    sendJson,
    sendError,
    normalizeHttpUrl,
    normalizeMeetingPrefix,
    registerConfiguredJitsiOrigin,
    registerScriptOrigins,
    log,
}) {
    router.get(
        "/api/v1/modules/jitsi-meet/ping",
        async (_req, res) => {
            await store.ensureSchema();
            const config = await store.getConfig();
            sendJson(res, 200, {
                data: {
                    ready: true,
                    configComplete: Boolean(config.instanceUrl),
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/jitsi-meet/config",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            await store.ensureSchema();
            const config = await store.getConfig();
            sendJson(res, 200, { data: config });
        },
        { access: { minRole: "user" }, allowWhenDisabled: true },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/config",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "admin");
            if (!claims) return;
            const body = await readJson(req);
            const instanceUrl = normalizeHttpUrl(body.instanceUrl);
            if (!instanceUrl) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "A valid http(s) Jitsi instance URL is required.",
                    { fieldId: "jitsi-instance-url" },
                );
                return;
            }
            const meetingPrefix = normalizeMeetingPrefix(
                body.meetingPrefix ?? "",
            );
            const saved = await store.saveConfig({
                instanceUrl,
                meetingPrefix,
            });
            registerConfiguredJitsiOrigin(registerScriptOrigins, saved);
            log?.("info", "Jitsi Meet configuration updated.", {
                component: "jitsi-meet-module",
                operation: "save_config",
                hasInstanceUrl: Boolean(saved.instanceUrl),
                hasMeetingPrefix: Boolean(saved.meetingPrefix),
            });
            sendJson(res, 200, {
                data: saved,
            });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );
}
