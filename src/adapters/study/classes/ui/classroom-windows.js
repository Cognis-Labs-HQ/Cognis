import { escapeHtml } from "/static/reuse/escape-html.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import {
    loadJitsiExternalApi,
    resolveRoomName,
    resolveThemeMode,
} from "/static/modules/jitsi-meet/meeting-embed.js";
import { resolveUrlHost } from "/static/reuse/value-normalizers.js";

/**
 * Creates and manages the persistent meeting overlay and class chat panel
 * that live as siblings of .classes-classroom-content (never re-rendered by
 * refreshDom).
 */
export function createClassroomWindows({ root, i18n }) {
    // ── Meeting overlay ─────────────────────────────────────────────────────

    const meetingWindow = document.createElement("div");
    meetingWindow.className = "classes-meeting-window";
    meetingWindow.hidden = true;
    meetingWindow.setAttribute(
        "aria-label",
        i18n.t("module.study.classes.open_meeting"),
    );
    meetingWindow.innerHTML = `
        <div class="classes-meeting-window-header">
            <span class="classes-meeting-window-title">${escapeHtml(i18n.t("module.study.classes.open_meeting"))}</span>
            <button type="button" class="classes-meeting-close-btn classes-window-close-btn">
                ${escapeHtml(i18n.t("ui.reuse.close"))}
            </button>
        </div>
        <div class="classes-meeting-frame" id="classroom-jitsi-frame"></div>
    `;
    root.appendChild(meetingWindow);

    function closeMeeting() {
        const frame = meetingWindow.querySelector("#classroom-jitsi-frame");
        if (frame instanceof HTMLElement) {
            frame.innerHTML = "";
        }
        meetingWindow.hidden = true;
    }

    async function openMeeting(snapshot) {
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/create",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ classroomId: snapshot.id }),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }
        const payload = await response.json();
        const meeting = payload?.data;
        if (!meeting?.meetingUrl) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }

        const frame = meetingWindow.querySelector("#classroom-jitsi-frame");
        if (!(frame instanceof HTMLElement)) return;
        frame.innerHTML = "";

        await loadJitsiExternalApi(meeting.instanceUrl || meeting.meetingUrl);

        const meetingHost = resolveUrlHost(
            meeting.instanceUrl || meeting.meetingUrl,
        );
        const roomName = resolveRoomName(meeting);
        if (
            !meetingHost ||
            !roomName ||
            typeof window.JitsiMeetExternalAPI !== "function"
        ) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }

        new window.JitsiMeetExternalAPI(meetingHost, {
            roomName,
            parentNode: frame,
            configOverwrite: {
                prejoinConfig: { enabled: false },
                requireDisplayName: false,
                disableDeepLinking: true,
                preferredTheme: resolveThemeMode(),
            },
        });

        meetingWindow.hidden = false;
    }

    // ── Class chat panel ────────────────────────────────────────────────────

    const chatPanel = document.createElement("div");
    chatPanel.className = "classes-chat-panel";
    chatPanel.hidden = true;
    chatPanel.setAttribute(
        "aria-label",
        i18n.t("module.study.classes.open_chat"),
    );
    chatPanel.innerHTML = `
        <div class="classes-chat-panel-header">
            <span class="classes-chat-panel-title">${escapeHtml(i18n.t("module.study.classes.open_chat"))}</span>
            <button type="button" class="classes-chat-close-btn classes-window-close-btn">
                ${escapeHtml(i18n.t("ui.reuse.close"))}
            </button>
        </div>
        <iframe class="classes-chat-panel-frame"
                id="classroom-chat-frame"
                src=""
                title="${escapeHtml(i18n.t("module.study.classes.open_chat"))}"></iframe>
    `;
    root.appendChild(chatPanel);

    function closeChat() {
        const frame = chatPanel.querySelector("#classroom-chat-frame");
        if (frame instanceof HTMLIFrameElement) {
            frame.src = "";
        }
        chatPanel.hidden = true;
    }

    function openChat(chatUrl) {
        if (!chatUrl) return;
        const frame = chatPanel.querySelector("#classroom-chat-frame");
        if (frame instanceof HTMLIFrameElement) {
            frame.src = chatUrl;
        }
        chatPanel.hidden = false;
    }

    // ── Shared close-button handler ─────────────────────────────────────────

    function handleWindowButtonClick(event) {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest(".classes-meeting-close-btn")) {
            closeMeeting();
            return;
        }
        if (event.target.closest(".classes-chat-close-btn")) {
            closeChat();
        }
    }

    root.addEventListener("click", handleWindowButtonClick);

    return { openMeeting, openChat, closeMeeting, closeChat };
}
