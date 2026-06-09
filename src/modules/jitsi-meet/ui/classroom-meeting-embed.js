import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { resolveUrlHost } from "/static/reuse/value-normalizers.js";
import {
    loadJitsiExternalApi,
    resolveRoomName,
    resolveThemeMode,
} from "./meeting-embed.js";
import { fetchCurrentProfile } from "./jitsi-helpers.js";
import { ensureSessionId } from "./session.js";
import {
    HEARTBEAT_INTERVAL_MS,
    JITSI_TOOLBAR_BUTTONS,
    MEETING_SUBJECT,
    MEETING_TERMINATED_TEXT,
    STATE_REFRESH_INTERVAL_MS,
} from "./constants.js";

/**
 * Creates a self-contained classroom meeting window element with a complete
 * Jitsi lifecycle, matching the lifecycle the Meetings page uses in
 * jitsi-embed.js and jitsi-preflight.js. The Classroom adapter imports and
 * renders the returned element without reimplementing any meeting logic.
 *
 * Exports:
 *   - `createClassroomMeetingEmbed(options)` — factory that returns the
 *     meeting window element and control methods.
 *
 * Usage:
 *   ```js
 *   const embed = createClassroomMeetingEmbed({ i18n });
 *   blackboard.appendChild(embed.element);
 *   await embed.openMeeting(classroomSnapshot);  // teacher-initiated
 *   await embed.tryAutoJoin(classroomId);        // student auto-join
 *   embed.closeMeeting();                        // manual or exit close
 *   ```
 *
 * @param {{
 *   i18n: { t: (key: string) => string },
 *   onVisibilityChange?: (visible: boolean) => void,
 * }} options
 * @param {{ t: (key: string) => string }} options.i18n - i18n helper created by createI18n().
 * @returns {{
 *   element: HTMLElement,
 *   openMeeting: (snapshot: object) => Promise<void>,
 *   openMeetingById: (meetingId: string) => Promise<void>,
 *   tryAutoJoin: (classroomId: string) => Promise<void>,
 *   closeMeeting: () => void,
 * }}
 */
export function createClassroomMeetingEmbed({
    i18n,
    onVisibilityChange = () => {},
}) {
    let jitsiApi = null;
    let jitsiParticipantId = "";
    let jitsiModerator = false;
    let heartbeatTimer = null;
    let stateRefreshTimer = null;
    let currentMeetingId = null;
    let currentSessionId = null;

    const element = document.createElement("div");
    element.className = "classes-meeting-window";
    element.hidden = true;
    element.setAttribute(
        "aria-label",
        i18n.t("module.study.classes.open_meeting"),
    );
    element.innerHTML = `
        <div class="classes-meeting-window-header">
            <span class="classes-meeting-window-title">${escapeHtml(i18n.t("module.study.classes.open_meeting"))}</span>
            <button type="button" class="classes-meeting-close-btn classes-window-close-btn">
                ${escapeHtml(i18n.t("ui.reuse.close"))}
            </button>
        </div>
        <div class="classes-meeting-frame" id="classroom-jitsi-frame"></div>
    `;

    async function keepPresenceAlive(active, { terminated = false } = {}) {
        if (!currentMeetingId || !currentSessionId) return null;
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/presence",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    meetingId: currentMeetingId,
                    sessionId: currentSessionId,
                    active,
                    terminated,
                }),
            },
        ).catch(() => null);
        if (!response?.ok) return null;
        const payload = await response.json().catch(() => ({ data: null }));
        return payload?.data ?? null;
    }

    async function checkMeetingState() {
        if (!currentMeetingId || !currentSessionId) return;
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/state",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    meetingId: currentMeetingId,
                    sessionId: currentSessionId,
                }),
            },
        ).catch(() => null);
        if (!response?.ok) return;
        const payload = await response.json().catch(() => ({ data: null }));
        if (payload?.data?.state?.endedAt) {
            closeMeeting();
        }
    }

    function startTracking(meetingId, sessionId) {
        currentMeetingId = meetingId;
        currentSessionId = sessionId;
        if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(
            () => void keepPresenceAlive(true),
            HEARTBEAT_INTERVAL_MS,
        );
        if (stateRefreshTimer !== null) clearInterval(stateRefreshTimer);
        stateRefreshTimer = setInterval(
            () => void checkMeetingState(),
            STATE_REFRESH_INTERVAL_MS,
        );
    }

    function stopTracking() {
        if (heartbeatTimer !== null) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        if (stateRefreshTimer !== null) {
            clearInterval(stateRefreshTimer);
            stateRefreshTimer = null;
        }
    }

    function destroyJitsiApi() {
        if (!jitsiApi) return;
        try {
            jitsiApi.dispose?.();
        } catch (error) {
            console.debug(
                "[classroom-meeting] Jitsi API dispose failed.",
                error,
            );
        }
        jitsiApi = null;
        jitsiParticipantId = "";
        jitsiModerator = false;
        const frame = element.querySelector("#classroom-jitsi-frame");
        if (frame instanceof HTMLElement) {
            frame.replaceChildren();
        }
    }

    function closeMeeting({ terminated = false } = {}) {
        stopTracking();
        void keepPresenceAlive(false, { terminated });
        destroyJitsiApi();
        currentMeetingId = null;
        currentSessionId = null;
        element.hidden = true;
        onVisibilityChange(false);
    }

    function isMeetingTerminatedNotice(event) {
        const message = [
            event?.title,
            event?.description,
            event?.message,
            event?.name,
            event?.notification?.title,
            event?.notification?.description,
            event?.details?.message,
        ]
            .map((value) => String(value ?? "").toLowerCase())
            .join(" ");
        return message.includes(MEETING_TERMINATED_TEXT);
    }

    function getParticipantId(candidate) {
        return String(candidate?.id ?? candidate?.participantId ?? "").trim();
    }

    function getParticipantRole(candidate) {
        return String(candidate?.role ?? "")
            .trim()
            .toLowerCase();
    }

    function executeJitsiCommandIfSupported(apiInstance, command, ...args) {
        if (!apiInstance || typeof apiInstance.executeCommand !== "function") {
            return;
        }
        if (typeof apiInstance.getSupportedCommands === "function") {
            const supported = apiInstance.getSupportedCommands();
            if (Array.isArray(supported) && !supported.includes(command)) {
                return;
            }
        }
        apiInstance.executeCommand(command, ...args);
    }

    async function openMeetingEmbed(meeting, sessionId, currentProfile) {
        stopTracking();
        void keepPresenceAlive(false);
        destroyJitsiApi();

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

        const frame = element.querySelector("#classroom-jitsi-frame");
        if (!(frame instanceof HTMLElement)) return;

        const meetingPassword = String(meeting.meetingPassword ?? "").trim();
        const themeMode = resolveThemeMode();
        const apiInstance = new window.JitsiMeetExternalAPI(meetingHost, {
            roomName,
            parentNode: frame,
            configOverwrite: {
                prejoinConfig: { enabled: false },
                requireDisplayName: false,
                disableDeepLinking: true,
                subject: MEETING_SUBJECT,
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
        jitsiParticipantId = "";
        jitsiModerator = false;

        const applyPrivilegedSettings = () => {
            if (jitsiApi !== apiInstance || !jitsiModerator) return;
            executeJitsiCommandIfSupported(
                apiInstance,
                "subject",
                MEETING_SUBJECT,
            );
            if (meetingPassword) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "password",
                    meetingPassword,
                );
            }
        };

        const applyParticipantProfile = () => {
            if (jitsiApi !== apiInstance) return;
            if (currentProfile?.displayName) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "displayName",
                    currentProfile.displayName,
                );
            }
            if (currentProfile?.email) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "email",
                    currentProfile.email,
                );
            }
            if (currentProfile?.avatarUrl) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "avatarUrl",
                    currentProfile.avatarUrl,
                );
            }
        };

        const handleMeetingLeft = () => {
            if (jitsiApi !== apiInstance) return;
            closeMeeting();
        };

        const handleMeetingTerminated = () => {
            if (jitsiApi !== apiInstance) return;
            closeMeeting({ terminated: true });
        };

        apiInstance.addEventListener("videoConferenceJoined", (event) => {
            jitsiParticipantId = getParticipantId(event);
            const participants = apiInstance.getParticipantsInfo?.() ?? [];
            const localParticipant =
                participants.find(
                    (participant) => participant?.local === true,
                ) ??
                participants.find(
                    (participant) =>
                        getParticipantId(participant) === jitsiParticipantId,
                ) ??
                null;
            jitsiModerator =
                getParticipantRole(localParticipant) === "moderator";
            applyParticipantProfile();
            applyPrivilegedSettings();
        });

        apiInstance.addEventListener("participantRoleChanged", (event) => {
            const participantId = getParticipantId(event);
            if (participantId && participantId !== jitsiParticipantId) return;
            jitsiModerator = getParticipantRole(event) === "moderator";
            applyPrivilegedSettings();
        });

        apiInstance.addEventListener("passwordRequired", () => {
            if (meetingPassword) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "password",
                    meetingPassword,
                );
            }
            applyPrivilegedSettings();
        });

        apiInstance.addEventListener("notificationTriggered", (event) => {
            if (isMeetingTerminatedNotice(event)) handleMeetingTerminated();
        });

        apiInstance.addEventListener("errorOccurred", (event) => {
            if (isMeetingTerminatedNotice(event)) handleMeetingTerminated();
        });

        apiInstance.addEventListener("videoConferenceLeft", handleMeetingLeft);
        apiInstance.addEventListener("readyToClose", handleMeetingLeft);

        startTracking(meeting.id, sessionId);
        element.hidden = false;
        onVisibilityChange(true);
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
        const createPayload = await createResponse
            .json()
            .catch(() => ({ data: null }));
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
            ? ((await joinResponse.json().catch(() => ({ data: null })))
                  ?.data ?? created)
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
        if (!element.hidden && currentMeetingId === normalizedId) return;

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
                body: JSON.stringify({ meetingId: normalizedId, sessionId }),
            },
        );
        const joinedMeeting = joinResponse.ok
            ? ((await joinResponse.json().catch(() => ({ data: null })))
                  ?.data ?? meeting)
            : meeting;

        if (!joinedMeeting?.meetingUrl) return;
        const currentProfile = await fetchCurrentProfile().catch(() => null);
        await openMeetingEmbed(joinedMeeting, sessionId, currentProfile);
    }

    async function tryAutoJoin(classroomId) {
        const id = String(classroomId ?? "").trim();
        if (!id || !element.hidden) return;

        const response = await apiFetch(
            `/api/v1/modules/jitsi-meet/meetings/active?classroomId=${encodeURIComponent(id)}`,
        ).catch(() => null);
        if (!response?.ok) return;
        const payload = await response.json().catch(() => ({ data: [] }));
        const meetings = Array.isArray(payload?.data) ? payload.data : [];
        const match = meetings.find((meeting) => {
            const meetingClassroomId = String(
                meeting?.classroomId ??
                    meeting?.classId ??
                    meeting?.classroom?.id ??
                    "",
            ).trim();
            return meetingClassroomId === id;
        });
        if (!match?.id) return;
        await openMeetingById(match.id);
    }

    return {
        element,
        closeMeeting: () => closeMeeting(),
        openMeeting,
        openMeetingById,
        tryAutoJoin,
    };
}
