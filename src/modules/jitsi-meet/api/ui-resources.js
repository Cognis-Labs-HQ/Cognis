const JITSI_MODULE_LANGUAGE_BASE_URLS = [
    "/static/modules/jitsi-meet/languages",
];

export function resolveMessagesUiResources(ctx) {
    const uiResourcesCapability = ctx.getCapability?.(
        "social:messages:uiResources",
    );
    const messagesUiResources =
        uiResourcesCapability &&
        typeof uiResourcesCapability === "object" &&
        !Array.isArray(uiResourcesCapability)
            ? uiResourcesCapability
            : null;
    const profileFileResources = ctx.getCapability?.(
        "social:profile:fileResources",
    );
    const profileFileNamespace =
        profileFileResources &&
        typeof profileFileResources === "object" &&
        !Array.isArray(profileFileResources) &&
        typeof profileFileResources.namespaceId === "string"
            ? profileFileResources.namespaceId
            : null;
    return {
        ...(messagesUiResources ?? {}),
        profileFileNamespace,
    };
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
        profileFileNamespace:
            typeof messagesUiResources?.profileFileNamespace === "string"
                ? messagesUiResources.profileFileNamespace
                : null,
    };
}

export function buildUnavailableJitsiUiResourcesPayload() {
    return {
        languageBaseUrls: JITSI_MODULE_LANGUAGE_BASE_URLS,
        stylesheetUrls: [],
        reactionHelpersModuleUrl: null,
        profileFileNamespace: null,
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
        try {
            sendJson(res, 200, {
                data: unavailable
                    ? buildUnavailableJitsiUiResourcesPayload()
                    : buildJitsiUiResourcesPayload(messagesUiResources),
            });
        } catch {
            console.error(
                "[jitsi-meet-module] failed to build UI resources payload",
                {
                    operation: "build_ui_resources_payload",
                },
            );
            sendJson(res, 500, {
                error: {
                    code: "ui_resources_unavailable",
                    message: "Failed to build UI resources payload.",
                },
            });
        }
    });
}
