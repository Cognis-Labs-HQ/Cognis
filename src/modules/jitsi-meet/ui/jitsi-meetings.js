import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { normalizeUsername } from "/static/reuse/value-normalizers.js";
import { ACTIVE_MEETINGS_REFRESH_INTERVAL_MS } from "./constants.js";
import { normalizeMeetingId } from "./jitsi-helpers.js";

export function createMeetingHandlers({
    root,
    state,
    i18n,
    apiFetch,
    callbacks,
    utils,
}) {
    function renderActiveMeetings({ loading = false } = {}) {
        const activeMeetingsEl = root.querySelector("#jitsi-active-meetings");
        if (!(activeMeetingsEl instanceof HTMLElement)) {
            return;
        }
        if (
            !Array.isArray(state.activeMeetings) ||
            state.activeMeetings.length === 0
        ) {
            const emptyMessage = loading
                ? i18n.t("module.jitsi_meet.participants.active_loading")
                : i18n.t("module.jitsi_meet.participants.active_none");
            activeMeetingsEl.innerHTML = `<p class="jitsi-active-meetings-empty">${escapeHtml(emptyMessage)}</p>`;
            return;
        }
        activeMeetingsEl.replaceChildren(
            ...state.activeMeetings.map((meeting) => {
                const meetingId = normalizeMeetingId(meeting?.id);
                const startedByDisplayName = String(
                    meeting?.startedBy?.displayName ??
                        meeting?.startedBy?.username ??
                        "",
                ).trim();
                const fallbackLabel = String(
                    meeting?.meetingName ?? i18n.t("ui.reuse.meeting"),
                ).trim();
                const badgeLabel = startedByDisplayName || fallbackLabel;
                const badgeColor = pickInitialsColor(meetingId || badgeLabel);
                const badgeInitials = getInitialsText(badgeLabel);
                const button = document.createElement("button");
                button.type = "button";
                button.className = "jitsi-active-meeting-item";
                if (
                    state.requestedMeetingId &&
                    state.requestedMeetingId === meetingId
                ) {
                    button.classList.add("jitsi-active-meeting-item-selected");
                }
                button.dataset.meetingId = meetingId;
                button.dataset.searchCategory = "Meetings";
                button.dataset.searchLabel = fallbackLabel;
                button.dataset.searchDescription = [
                    meeting?.scheduledAt ?? meeting?.createdAt,
                    startedByDisplayName,
                ]
                    .filter(Boolean)
                    .join(" · ");
                button.dataset.searchText = [
                    fallbackLabel,
                    startedByDisplayName,
                    meeting?.scheduledAt ?? meeting?.createdAt,
                    meeting?.meetingUrl,
                ]
                    .filter(Boolean)
                    .join(" ");
                button.setAttribute("role", "gridcell");
                button.innerHTML = `
          <span class="jitsi-active-meeting-avatar" style="--initials-bg: ${escapeHtml(badgeColor)}">${escapeHtml(badgeInitials)}</span>
          <span class="jitsi-active-meeting-meta">
            <span class="jitsi-active-meeting-title">${escapeHtml(fallbackLabel)}</span>
            <span class="jitsi-active-meeting-owner">${escapeHtml(startedByDisplayName || i18n.t("ui.reuse.system"))}</span>
          </span>
        `;
                return button;
            }),
        );
    }

    async function switchAwayFromActiveMeeting() {
        if (!utils.isMeetingActive()) return;
        await callbacks.keepPresenceAlive(false).catch(() => undefined);
        utils.clearTimers();
        closeMeetingEmbed();
        state.alonePromptMeetingId = "";
        state.alonePromptDismissedMeetingId = "";
        state.alonePromptBlockedUntil = 0;
        state.meeting = null;
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        state.lastMeetingParticipants = [];
        callbacks.stopNativeChatPolling();
        await callbacks.updateNativeChat();
    }

    function clearRequestedMeetingParameters() {
        const url = new URL(window.location.href);
        url.searchParams.delete("meetingId");
        url.searchParams.delete("start");
        window.history.replaceState(null, "", url);
    }

    async function joinMeetingById(meetingId, { autoStart = true } = {}) {
        const normalizedMeetingId = normalizeMeetingId(meetingId);
        if (!normalizedMeetingId) return;
        if (
            utils.isMeetingActive() &&
            state.meeting?.id === normalizedMeetingId
        ) {
            return;
        }
        utils.updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.joining"),
            loading: false,
            canStart: false,
            showAuth: false,
            showReclaim: false,
            visible: true,
        });
        const getResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/get",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    meetingId: normalizedMeetingId,
                }),
                accessToken: state.shareAccessToken || undefined,
                suppressAccessDeniedEvent: true,
            },
        );
        if (!getResponse.ok) {
            state.meeting = null;
            const errorPayload = await getResponse
                .json()
                .catch(() => ({ error: null }));
            utils.updateOverlay({
                message: i18n.t(
                    getResponse.status === 404 ||
                        errorPayload?.error?.code === "meeting_closed"
                        ? "module.jitsi_meet.overlay.meeting_closed"
                        : "module.jitsi_meet.overlay.join_failed",
                ),
                canStart: false,
                showAuth: false,
                showReclaim: false,
                visible: true,
            });
            if (
                getResponse.status === 404 ||
                errorPayload?.error?.code === "not_found"
            ) {
                clearRequestedMeetingParameters();
                showToast(i18n.t("module.jitsi_meet.meeting_not_found"), {
                    variant: "warning",
                });
            }
            return;
        }
        const meetingPayload = await getResponse
            .json()
            .catch(() => ({ data: null }));
        if (
            !meetingPayload?.data?.id ||
            (autoStart && meetingPayload?.data?.state?.endedAt)
        ) {
            state.meeting = null;
            utils.updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.meeting_closed"),
                canStart: false,
                showAuth: false,
                showReclaim: false,
                visible: true,
            });
            return;
        }
        if (
            utils.isMeetingActive() &&
            state.meeting?.id !== normalizedMeetingId
        ) {
            await switchAwayFromActiveMeeting();
        }
        if (state.meeting?.id !== meetingPayload.data.id) {
            state.alonePromptMeetingId = "";
            state.alonePromptDismissedMeetingId = "";
            state.alonePromptBlockedUntil = 0;
        }
        state.meeting = meetingPayload.data;
        const currentUsername = normalizeUsername(
            state.currentProfile?.handle ?? state.currentProfile?.username,
        );
        const meetingParticipantNames = Array.isArray(
            meetingPayload.data.participants,
        )
            ? meetingPayload.data.participants
            : [];
        state.selectedParticipants = meetingParticipantNames
            .map((participant) => {
                const username = normalizeUsername(
                    typeof participant === "string"
                        ? participant
                        : (participant?.username ?? participant?.handle),
                );
                if (!username || username === currentUsername) return null;
                return (
                    state.allParticipants.find(
                        (candidate) => candidate.username === username,
                    ) ?? {
                        username,
                        displayName: String(
                            participant?.displayName ?? username,
                        ),
                        avatarKey: participant?.avatarKey ?? null,
                    }
                );
            })
            .filter(Boolean);
        state.availableParticipants = state.allParticipants.filter(
            (candidate) =>
                !state.selectedParticipants.some(
                    (participant) =>
                        participant.username === candidate.username,
                ),
        );
        if (!autoStart) {
            state.meeting = null;
            callbacks.renderParticipants();
            return;
        }
        callbacks.renderParticipants();
        if (state.selectedParticipants.length === 0) {
            return;
        }
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        await callbacks.updateNativeChat();
        const joinState = await callbacks.joinMeeting();
        if (joinState?.trackingAllowed) {
            callbacks.ensureMeetingTracking();
        }
    }

    async function loadActiveMeetings({ resolveRequested = true } = {}) {
        renderActiveMeetings({ loading: true });
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/active",
        );
        if (!response.ok) {
            state.activeMeetings = [];
            renderActiveMeetings();
            return;
        }
        const payload = await response.json().catch(() => ({ data: [] }));
        state.activeMeetings = Array.isArray(payload?.data) ? payload.data : [];
        renderActiveMeetings();
        const requestedMeetingId = resolveRequested
            ? normalizeMeetingId(state.requestedMeetingId)
            : "";
        if (!requestedMeetingId) return;
        state.requestedMeetingId = "";
        const requestedMeeting = state.activeMeetings.find(
            (meeting) => normalizeMeetingId(meeting?.id) === requestedMeetingId,
        );
        if (!requestedMeeting) {
            utils.updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.meeting_closed"),
                canStart: false,
                showAuth: false,
                showReclaim: false,
                visible: true,
            });
            return;
        }
        await joinMeetingById(requestedMeeting.id);
    }

    function stopActiveMeetingsPolling() {
        if (state.activeMeetingsRefreshTimer === null) return;
        clearInterval(state.activeMeetingsRefreshTimer);
        state.activeMeetingsRefreshTimer = null;
    }

    function startActiveMeetingsPolling() {
        if (state.activeMeetingsRefreshTimer !== null) return;
        state.activeMeetingsRefreshTimer = setInterval(() => {
            void loadActiveMeetings({ resolveRequested: false });
        }, ACTIVE_MEETINGS_REFRESH_INTERVAL_MS);
    }

    function closeMeetingEmbed() {
        if (state.jitsiApi) {
            const activeApi = state.jitsiApi;
            state.jitsiApi = null;
            state.jitsiParticipantId = "";
            state.jitsiConferenceJoined = false;
            state.jitsiModerator = false;
            activeApi.dispose();
        }
        utils.syncShareButtonAvailability();
        const frame = root.querySelector("#jitsi-meeting-frame");
        if (!(frame instanceof HTMLElement)) return;
        frame.hidden = true;
        frame.replaceChildren();
    }

    async function resetMeetingState({
        overlayMessageKey = null,
        toastMessageKey = null,
        toastVariant = "info",
        skipPresenceUpdate = false,
    } = {}) {
        if (!skipPresenceUpdate) {
            await callbacks.keepPresenceAlive(false).catch(() => undefined);
        }
        utils.clearTimers();
        closeMeetingEmbed();
        state.alonePromptMeetingId = "";
        state.alonePromptDismissedMeetingId = "";
        state.alonePromptBlockedUntil = 0;
        state.meeting = null;
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        state.lastMeetingParticipants = [];
        callbacks.stopNativeChatPolling();
        utils.resetParticipantSelection();
        callbacks.renderParticipants();
        await callbacks.updateNativeChat();
        void loadActiveMeetings({ resolveRequested: false });
        if (overlayMessageKey) {
            utils.updateOverlay({
                message: i18n.t(overlayMessageKey),
                canStart: false,
                showAuth: false,
                showReclaim: false,
                visible: true,
            });
        }
        if (toastMessageKey) {
            showToast(i18n.t(toastMessageKey), {
                variant: toastVariant,
            });
        }
    }

    async function handleMeetingExit({
        fallbackOverlayMessageKey,
        forceClosedOverlay = false,
        honorMeetingClosed = true,
        reportTerminated = false,
    }) {
        const leaveState = await callbacks
            .keepPresenceAlive(false, {
                terminated: reportTerminated,
            })
            .catch(() => null);
        const overlayMessageKey =
            forceClosedOverlay ||
            (honorMeetingClosed && leaveState?.meetingClosed)
                ? "module.jitsi_meet.overlay.meeting_closed"
                : fallbackOverlayMessageKey;
        await resetMeetingState({
            overlayMessageKey,
            skipPresenceUpdate: true,
        });
    }

    function shouldPromptLocalUserAlone(activeParticipants) {
        if (
            !utils.isMeetingActive() ||
            !state.meeting?.id ||
            state.alonePromptDismissedMeetingId === state.meeting.id ||
            Date.now() < state.alonePromptBlockedUntil
        ) {
            return false;
        }
        const localUsername = normalizeUsername(
            state.currentProfile?.handle ?? "",
        );
        if (!localUsername) return false;
        const uniqueActiveParticipants = Array.from(
            new Set(
                (Array.isArray(activeParticipants) ? activeParticipants : [])
                    .map((entry) => normalizeUsername(entry))
                    .filter(Boolean),
            ),
        );
        const invitedParticipants = Array.isArray(state.meeting?.participants)
            ? state.meeting.participants
                  .map((entry) => normalizeUsername(entry))
                  .filter(Boolean)
            : [];
        return (
            invitedParticipants.length > 1 &&
            uniqueActiveParticipants.length === 1 &&
            uniqueActiveParticipants[0] === localUsername
        );
    }

    function updateAloneParticipantPrompt(activeParticipants) {
        if (!state.meeting?.id) return false;
        if (!shouldPromptLocalUserAlone(activeParticipants)) {
            if (state.alonePromptMeetingId === state.meeting.id) {
                state.alonePromptMeetingId = "";
                utils.updateOverlay({
                    message: i18n.t("module.jitsi_meet.overlay.in_meeting"),
                    canStart: false,
                    showAuth: false,
                    showReclaim: false,
                    showAlonePrompt: false,
                    visible: false,
                });
            }
            const uniqueActiveParticipants = new Set(
                (Array.isArray(activeParticipants) ? activeParticipants : [])
                    .map((entry) => normalizeUsername(entry))
                    .filter(Boolean),
            );
            if (uniqueActiveParticipants.size > 1) {
                state.alonePromptDismissedMeetingId = "";
            }
            return false;
        }
        state.alonePromptMeetingId = state.meeting.id;
        utils.updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.alone_prompt"),
            canStart: false,
            showAuth: false,
            showReclaim: false,
            showAlonePrompt: true,
            visible: true,
        });
        return true;
    }

    function lobbyMessageKey(participantCount) {
        if (state.preflightStatus === "running") {
            return "module.jitsi_meet.overlay.preflight_running";
        }
        if (state.preflightStatus === "failed") {
            if (state.preflightNeedsConfig) {
                return "module.jitsi_meet.overlay.config_required";
            }
            return "module.jitsi_meet.overlay.preflight_required";
        }
        if (participantCount > 0) {
            return "module.jitsi_meet.overlay.ready_to_start";
        }
        return "module.jitsi_meet.overlay.select_participants";
    }

    return {
        closeMeetingEmbed,
        handleMeetingExit,
        joinMeetingById,
        loadActiveMeetings,
        lobbyMessageKey,
        renderActiveMeetings,
        resetMeetingState,
        shouldPromptLocalUserAlone,
        startActiveMeetingsPolling,
        stopActiveMeetingsPolling,
        switchAwayFromActiveMeeting,
        updateAloneParticipantPrompt,
    };
}
