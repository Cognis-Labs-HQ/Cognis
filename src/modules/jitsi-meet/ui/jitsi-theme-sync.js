import { resolveJitsiDefaultBackground } from "./meeting-embed.js";

const JITSI_THEME_SURFACES = {
    dark: {
        background: "#030a14",
        border: "#1e2a3a",
        control: "#0f172a",
        controlHover: "#1f2937",
        text: "#f8fafc",
    },
    light: {
        background: "#f4f8ff",
        border: "#cfdaec",
        control: "#eef4ff",
        controlHover: "#dbeafe",
        text: "#1f2937",
    },
};

function resolveThemeSurface(themeMode) {
    return JITSI_THEME_SURFACES[themeMode] ?? JITSI_THEME_SURFACES.light;
}

function buildJitsiThemeCss(themeMode) {
    const surface = resolveThemeSurface(themeMode);
    return `
:root,
body,
#react,
#videoconference_page,
.videocontainer,
.filmstrip,
.filmstrip__videos,
.participants_pane,
.participants-pane,
.participants-pane-content,
.participant-list {
  background: ${surface.background} !important;
  color: ${surface.text} !important;
}
.toolbox-content,
.toolbox-content-items,
.toolbox-button,
.toolbox-button-wth-dialog,
.subject,
.timer,
.remotevideomenu,
.filmstrip__videos .videocontainer,
.filmstrip .videocontainer,
.participant-item,
.participant-tile,
.display-name,
.avatar-container,
.thumbnail {
  background: ${surface.control} !important;
  border-color: ${surface.border} !important;
  color: ${surface.text} !important;
}
.toolbox-button:hover,
.toolbox-button:focus,
.toolbox-button-wth-dialog:hover,
.toolbox-button-wth-dialog:focus,
.participant-item:hover,
.thumbnail:hover {
  background: ${surface.controlHover} !important;
  color: ${surface.text} !important;
}
.toolbox-button svg,
.toolbox-button-wth-dialog svg,
.participant-item svg,
.thumbnail svg {
  color: ${surface.text} !important;
  fill: currentColor !important;
}
`;
}

export function applyJitsiWindowTheme(api, themeMode) {
    const defaultBackground = resolveJitsiDefaultBackground(themeMode);
    const iframe = api?.getIFrame?.();
    if (iframe instanceof HTMLIFrameElement) {
        iframe.style.background = defaultBackground;
        iframe.style.backgroundColor = defaultBackground;
    }
    const apiDocument = iframe?.contentDocument;
    const apiWindow = apiDocument?.defaultView;
    if (!apiDocument || !apiWindow) return defaultBackground;
    apiWindow.interfaceConfig = {
        ...(apiWindow.interfaceConfig ?? {}),
        DEFAULT_BACKGROUND: defaultBackground,
    };
    apiWindow.config = {
        ...(apiWindow.config ?? {}),
        preferredTheme: themeMode,
    };
    apiDocument.documentElement?.style?.setProperty(
        "--cognis-jitsi-background",
        defaultBackground,
    );
    apiDocument.body?.style?.setProperty(
        "background",
        defaultBackground,
        "important",
    );
    apiDocument.body?.style?.setProperty(
        "background-color",
        defaultBackground,
        "important",
    );
    const styleId = "cognis-jitsi-theme-overrides";
    let styleElement = apiDocument.getElementById(styleId);
    if (!(styleElement instanceof apiWindow.HTMLStyleElement)) {
        styleElement = apiDocument.createElement("style");
        styleElement.id = styleId;
        apiDocument.head?.appendChild(styleElement);
    }
    styleElement.textContent = buildJitsiThemeCss(themeMode);
    return defaultBackground;
}
