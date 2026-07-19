import { resolveJitsiDefaultBackground } from "./meeting-embed.js";

export function applyJitsiWindowTheme(api, themeMode) {
    const defaultBackground = resolveJitsiDefaultBackground(themeMode);
    const iframe = api?.getIFrame?.();
    if (iframe instanceof HTMLIFrameElement) {
        iframe.style.background = defaultBackground;
        iframe.style.backgroundColor = defaultBackground;
    }
    const apiWindow = iframe?.contentWindow;
    if (!apiWindow) return defaultBackground;
    try {
        apiWindow.interfaceConfig = {
            ...(apiWindow.interfaceConfig ?? {}),
            DEFAULT_BACKGROUND: defaultBackground,
        };
        apiWindow.config = {
            ...(apiWindow.config ?? {}),
            preferredTheme: themeMode,
        };
        const apiDocument = apiWindow.document;
        apiDocument?.documentElement?.style?.setProperty(
            "--cognis-jitsi-background",
            defaultBackground,
        );
        apiDocument?.body?.style?.setProperty(
            "background",
            defaultBackground,
            "important",
        );
        apiDocument?.body?.style?.setProperty(
            "background-color",
            defaultBackground,
            "important",
        );
    } catch {
        // Cross-origin Jitsi deployments cannot expose their document, but the
        // iframe API can still receive the config overwrite from the caller.
    }
    return defaultBackground;
}
