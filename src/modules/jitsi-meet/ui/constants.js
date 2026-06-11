export const HEARTBEAT_INTERVAL_MS = 10_000;
export const ACTIVE_MEETINGS_REFRESH_INTERVAL_MS = 10_000;
export const PROBE_SUCCESS_DISPLAY_MS = 600;
export const STATE_REFRESH_INTERVAL_MS = 5_000;
export const CHAT_REFRESH_INTERVAL_MS = 2_500;
export const ALONE_PROMPT_GRACE_PERIOD_MS = 60_000;
export const SESSION_ID_STORAGE_KEY = "jitsi-meet:session-id";
export const TEXT_ENCODER = new TextEncoder();
export const MEETING_SUBJECT = "Cognis Classroom";
export const MEETING_TERMINATED_TEXT = "meeting terminated";
export const JITSI_IFRAME_SANDBOX =
    "allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation";
export const JITSI_TOOLBAR_BUTTONS = [
    "microphone",
    "camera",
    "desktop",
    "hangup",
    "participants-pane",
    "tileview",
    "raisehand",
];
