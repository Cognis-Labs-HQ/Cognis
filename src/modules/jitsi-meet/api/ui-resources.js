const JITSI_MODULE_LANGUAGE_BASE_URLS = [
    "/static/modules/jitsi-meet/languages",
];

export function resolveMessagesUiResources(ctx) {
    const uiResourcesCapability = ctx.getCapability?.(
        "social:messages:uiResources",
    );
    return uiResourcesCapability &&
        typeof uiResourcesCapability === "object" &&
        !Array.isArray(uiResourcesCapability)
        ? uiResourcesCapability
        : null;
}

export function resolveSharedMessagesStylesheetUrls(messagesUiResources) {
    return Array.isArray(messagesUiResources?.stylesheetUrls)
        ? messagesUiResources.stylesheetUrls
        : [];
}

export function buildJitsiUiResourcesPayload(messagesUiResources) {
    const extraLanguageUrls = Array.isArray(
        messagesUiResources?.languageBaseUrls,
    )
        ? messagesUiResources.languageBaseUrls
        : [];
    const stylesheetUrls = Array.isArray(messagesUiResources?.stylesheetUrls)
        ? messagesUiResources.stylesheetUrls
        : [];
    return {
        languageBaseUrls: [
            ...JITSI_MODULE_LANGUAGE_BASE_URLS,
            ...extraLanguageUrls,
        ],
        stylesheetUrls,
        reactionHelpersModuleUrl:
            typeof messagesUiResources?.reactionHelpersModuleUrl === "string"
                ? messagesUiResources.reactionHelpersModuleUrl
                : null,
    };
}

export function buildUnavailableJitsiUiResourcesPayload() {
    return {
        languageBaseUrls: JITSI_MODULE_LANGUAGE_BASE_URLS,
        stylesheetUrls: [],
        reactionHelpersModuleUrl: null,
    };
}

export function registerJitsiUiResourcesRoute({
    requireAuth,
    router,
    sendJson,
    messagesUiResources = null,
    unavailable = false,
}) {
    router.get("/api/v1/modules/jitsi-meet/ui-resources", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        sendJson(res, 200, {
            data: unavailable
                ? buildUnavailableJitsiUiResourcesPayload()
                : buildJitsiUiResourcesPayload(messagesUiResources),
        });
    });
}
