import { escapeHtml } from "/static/reuse/escape-html.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import {
    loadJitsiExternalApi,
    resolveRoomName,
    resolveThemeMode,
} from "/static/modules/jitsi-meet/meeting-embed.js";
import { resolveUrlHost } from "/static/reuse/value-normalizers.js";
import { fetchCurrentProfile } from "/static/modules/jitsi-meet/jitsi-helpers.js";
import { ensureSessionId } from "/static/modules/jitsi-meet/session.js";
import {
    HEARTBEAT_INTERVAL_MS,
    JITSI_TOOLBAR_BUTTONS,
} from "/static/modules/jitsi-meet/constants.js";
import { createClassroomNativeChat } from "/static/adapters/study/classes/classroom-chat.js";

/**
 * Creates and manages the persistent meeting overlay and class chat panel
 * that live as siblings of .classes-classroom-content (never re-rendered by
 * refreshDom). Call reattach() after each DOM refresh to move the panels
 * back inside the blackboard.
 */
export function createClassroomWindows({ root, i18n }) {
    let jitsiApi = null;
    let heartbeatTimer = null;
    let currentMeetingId = null;
    let currentSessionId = null;

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

    async function keepPresenceAlive(active) {
        if (!currentMeetingId || !currentSessionId) return;
        await apiFetch("/api/v1/modules/jitsi-meet/meetings/presence", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                meetingId: currentMeetingId,
                sessionId: currentSessionId,
                active,
            }),
        }).catch(() => undefined);
    }

    function startHeartbeat(meetingId, sessionId) {
        currentMeetingId = meetingId;
        currentSessionId = sessionId;
        if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(
            () => void keepPresenceAlive(true),
            HEARTBEAT_INTERVAL_MS,
        );
    }

    function stopHeartbeat() {
        if (heartbeatTimer !== null) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        void keepPresenceAlive(false);
        currentMeetingId = null;
        currentSessionId = null;
    }

    function destroyJitsiApi() {
        if (jitsiApi) {
            try {
                jitsiApi.dispose?.();
            } catch (error) {
                console.debug("[classroom] jitsi API dispose failed.", error);
            }
            jitsiApi = null;
        }
        const frame = meetingWindow.querySelector("#classroom-jitsi-frame");
        if (frame instanceof HTMLElement) {
            frame.innerHTML = "";
        }
    }

    function closeMeeting() {
        stopHeartbeat();
        destroyJitsiApi();
        meetingWindow.hidden = true;
    }

    async function openMeetingEmbed(meeting, sessionId, currentProfile) {
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

        const frame = meetingWindow.querySelector("#classroom-jitsi-frame");
        if (!(frame instanceof HTMLElement)) return;
        destroyJitsiApi();

        const meetingPassword = String(meeting.meetingPassword ?? "").trim();
        const themeMode = resolveThemeMode();
        const apiInstance = new window.JitsiMeetExternalAPI(meetingHost, {
            roomName,
            parentNode: frame,
            configOverwrite: {
                prejoinConfig: { enabled: false },
                requireDisplayName: false,
                disableDeepLinking: true,
                preferredTheme: themeMode,
                toolbarButtons: JITSI_TOOLBAR_BUTTONS,
            },
            userInfo: {
                displayName: currentProfile?.displayName ?? "",
                email: currentProfile?.email ?? "",
                avatarUrl: currentProfile?.avatarUrl ?? "",
            },
        });
        jitsiApi = apiInstance;

        const applyPrivilegedSettings = () => {
            if (jitsiApi !== apiInstance) return;
            const isModerator =
                apiInstance
                    .getParticipantsInfo?.()
                    ?.find?.(
                        (entry) =>
                            entry?.participantId === apiInstance?.myUserId?.(),
                    )?.role === "moderator";
            if (!isModerator) return;
            if (meetingPassword) {
                apiInstance.executeCommand?.("password", meetingPassword);
            }
        };

        apiInstance.addEventListener?.("participantRoleChanged", () => {
            applyPrivilegedSettings();
        });

        if (meetingPassword) {
            apiInstance.addEventListener?.("passwordRequired", () => {
                apiInstance.executeCommand?.("password", meetingPassword);
            });
        }

        const handleLeft = () => {
            if (jitsiApi !== apiInstance) return;
            closeMeeting();
        };
        apiInstance.addEventListener?.("videoConferenceLeft", handleLeft);
        apiInstance.addEventListener?.("readyToClose", handleLeft);

        startHeartbeat(meeting.id, sessionId);
        meetingWindow.hidden = false;
    }

    async function openMeeting(snapshot) {
        const createResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/create",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ classroomId: snapshot.id }),
            },
        );
        if (!createResponse.ok) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }
        const createPayload = await createResponse.json();
        const created = createPayload?.data;
        if (!created?.meetingUrl) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }

        const sessionId = ensureSessionId();
        const joinResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/join",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    meetingId: created.id ?? created.meetingId ?? "",
                    sessionId,
                }),
            },
        );
        const meeting = joinResponse.ok
            ? ((await joinResponse.json())?.data ?? created)
            : created;

        if (!meeting?.meetingUrl) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }

        const currentProfile = await fetchCurrentProfile().catch(() => null);
        await openMeetingEmbed(meeting, sessionId, currentProfile);
    }

    async function openMeetingById(meetingId) {
        const normalizedId = String(meetingId ?? "").trim();
        if (!normalizedId) return;
        if (!meetingWindow.hidden && currentMeetingId === normalizedId) return;

        const getResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/get",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ meetingId: normalizedId }),
            },
        );
        if (!getResponse.ok) return;
        const getPayload = await getResponse
            .json()
            .catch(() => ({ data: null }));
        const meeting = getPayload?.data;
        if (!meeting?.meetingUrl || meeting?.state?.endedAt) return;

        const sessionId = ensureSessionId();
        const joinResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/join",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    meetingId: normalizedId,
                    sessionId,
                }),
            },
        );
        const joinedMeeting = joinResponse.ok
            ? ((await joinResponse.json())?.data ?? meeting)
            : meeting;

        if (!joinedMeeting?.meetingUrl) return;
        const currentProfile = await fetchCurrentProfile().catch(() => null);
        await openMeetingEmbed(joinedMeeting, sessionId, currentProfile);
    }

    async function tryAutoJoin(classroomId) {
        const id = String(classroomId ?? "").trim();
        if (!id) return;
        if (!meetingWindow.hidden) return;

        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/active",
        ).catch(() => null);
        if (!response?.ok) return;
        const payload = await response.json().catch(() => ({ data: [] }));
        const meetings = Array.isArray(payload?.data) ? payload.data : [];
        const match = meetings.find((m) => m?.classroomId === id);
        if (!match?.id) return;
        await openMeetingById(match.id);
    }

    const nativeChat = createClassroomNativeChat({ i18n });

    function handleWindowButtonClick(event) {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest(".classes-meeting-close-btn")) {
            closeMeeting();
            return;
        }
        if (event.target.closest(".classes-chat-close-btn")) {
            nativeChat.closeChat();
        }
    }

    root.addEventListener("click", handleWindowButtonClick);

    function reattach() {
        const blackboard = root.querySelector(".classes-blackboard");
        if (blackboard) {
            blackboard.appendChild(meetingWindow);
            blackboard.appendChild(nativeChat.panel);
        }
    }

    return {
        openMeeting,
        openChat: (chatUrl) => nativeChat.openChat(chatUrl),
        closeMeeting,
        closeChat: () => nativeChat.closeChat(),
        tryAutoJoin,
        reattach,
    };
}
