import { JITSI_TOOLBAR_BUTTONS, MEETING_SUBJECT } from "./constants.js";
import {
    resolveUrlOrigin,
    resolveUrlPathSlug,
} from "/static/reuse/value-normalizers.js";

let jitsiExternalApiLoader = null;

const JITSI_THEME_BACKGROUNDS = {
    dark: "#030a14",
    light: "#f4f8ff",
};

function readThemeCookie() {
    const match = document.cookie.match(/(?:^|; )cognis_theme=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

export function resolveThemeMode(explicitMode) {
    for (const candidate of [
        explicitMode,
        document.querySelector(".app-shell")?.getAttribute("data-theme"),
        document.body.getAttribute("data-theme"),
        document.documentElement.getAttribute("data-theme"),
        localStorage.getItem("cognis_theme"),
        readThemeCookie(),
    ]) {
        const mode = String(candidate ?? "")
            .trim()
            .toLowerCase();
        if (mode === "light" || mode === "dark") return mode;
    }
    return "light";
}

export function resolveJitsiDefaultBackground(explicitMode) {
    return JITSI_THEME_BACKGROUNDS[resolveThemeMode(explicitMode)];
}

export function resolveRoomName(meeting) {
    if (typeof meeting?.roomSlug === "string" && meeting.roomSlug.trim()) {
        return meeting.roomSlug.trim();
    }
    return resolveUrlPathSlug(meeting?.meetingUrl ?? "");
}

export function buildMeetingJoinUrl(meetingUrl, profile) {
    try {
        const parsed = new URL(meetingUrl);
        const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        hashParams.set("config.prejoinConfig.enabled", "false");
        hashParams.set("config.requireDisplayName", "false");
        hashParams.set("config.disableDeepLinking", "true");
        hashParams.set("config.subject", MEETING_SUBJECT);
        const themeMode = resolveThemeMode();
        hashParams.set("config.preferredTheme", themeMode);
        hashParams.set(
            "interfaceConfig.DEFAULT_BACKGROUND",
            resolveJitsiDefaultBackground(themeMode),
        );
        hashParams.set(
            "config.toolbarButtons",
            JSON.stringify(JITSI_TOOLBAR_BUTTONS),
        );
        if (profile?.displayName)
            hashParams.set("userInfo.displayName", profile.displayName);
        if (profile?.email) hashParams.set("userInfo.email", profile.email);
        if (profile?.avatarUrl)
            hashParams.set("userInfo.avatarUrl", profile.avatarUrl);
        parsed.hash = hashParams.toString();
        return parsed.toString();
    } catch {
        return meetingUrl;
    }
}

export function loadJitsiExternalApi(meetingUrl) {
    const meetingOrigin = resolveUrlOrigin(meetingUrl);
    if (!meetingOrigin) {
        return Promise.reject(new Error("Missing Jitsi meeting origin."));
    }
    if (jitsiExternalApiLoader?.origin === meetingOrigin) {
        return jitsiExternalApiLoader.promise;
    }
    jitsiExternalApiLoader = {
        origin: meetingOrigin,
        promise: new Promise((resolve, reject) => {
            const existingScript = document.querySelector(
                `script[data-jitsi-origin="${meetingOrigin}"]`,
            );
            if (existingScript) {
                existingScript.addEventListener("load", () => resolve(), {
                    once: true,
                });
                existingScript.addEventListener(
                    "error",
                    () => reject(new Error("Failed to load Jitsi API script.")),
                    { once: true },
                );
                if (typeof window.JitsiMeetExternalAPI === "function")
                    resolve();
                return;
            }

            const scriptElement = document.createElement("script");
            scriptElement.src = `${meetingOrigin}/external_api.js`;
            scriptElement.async = true;
            scriptElement.dataset.jitsiOrigin = meetingOrigin;
            scriptElement.addEventListener("load", () => resolve(), {
                once: true,
            });
            scriptElement.addEventListener(
                "error",
                () => reject(new Error("Failed to load Jitsi API script.")),
                { once: true },
            );
            document.head.appendChild(scriptElement);
        }),
    };
    return jitsiExternalApiLoader.promise;
}
