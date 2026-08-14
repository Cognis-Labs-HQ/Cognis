import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { resolveUrlHost } from "/static/reuse/value-normalizers.js";
import {
    loadJitsiExternalApi,
    resolveJitsiDefaultBackground,
    resolveRoomName,
    resolveThemeMode,
} from "./meeting-embed.js";
import { JITSI_TOOLBAR_BUTTONS, MEETING_SUBJECT } from "./constants.js";

export function createEmbedHandlers({
    root,
    state,
    i18n,
    apiFetch,
    callbacks,
    utils,
}) {
    async function openMeetingEmbed() {
        if (!state.meeting?.meetingUrl) return;
        const frame = root.querySelector("#jitsi-meeting-frame");
        if (!(frame instanceof HTMLElement)) return;

        callbacks.closeMeetingEmbed();
        await loadJitsiExternalApi(
            state.meeting.instanceUrl || state.meeting.meetingUrl,
        );

        const meetingHost = resolveUrlHost(
            state.meeting.instanceUrl || state.meeting.meetingUrl,
        );
        const roomName = resolveRoomName(state.meeting);
        if (!meetingHost || !roomName) {
            showToast(i18n.t("module.jitsi_meet.overlay.join_failed"), {
                variant: "error",
            });
            return;
        }
        if (typeof window.JitsiMeetExternalAPI !== "function") {
            showToast(i18n.t("module.jitsi_meet.overlay.join_failed"), {
                variant: "error",
            });
            return;
        }

        const createKeyringScope = uiCtx.capabilities.get(
            "keyring:forComponent",
        );
        const meetingKeyring = createKeyringScope?.(
            i18n.t("ui.reuse.meetings"),
        );
        const meetingKeyringId = `meeting:${state.meeting.id}:password`;
        const meetingProcess = i18n
            .t("module.jitsi_meet.keyring_request_process")
            .replace(
                "{{meeting}}",
                state.meeting.meetingName || state.meeting.id,
            );
        const suppliedMeetingPassword = String(
            state.meeting.meetingPassword ?? "",
        ).trim();
        let meetingPassword = String(
            (await meetingKeyring?.resolve(meetingKeyringId, {
                fallback: () => suppliedMeetingPassword || null,
                request: {
                    action: i18n.t("ui.reuse.join"),
                    process: meetingProcess,
                },
                metadata: {
                    label:
                        state.meeting.meetingName || i18n.t("ui.reuse.meeting"),
                },
            })) || suppliedMeetingPassword,
        ).trim();
        if (meetingKeyring && suppliedMeetingPassword && meetingPassword) {
            const acknowledgeResponse = await apiFetch(
                "/api/v1/modules/jitsi-meet/meetings/password/acknowledge",
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ meetingId: state.meeting.id }),
                },
            );
            if (!acknowledgeResponse.ok) {
                showToast(i18n.t("module.jitsi_meet.overlay.join_failed"), {
                    variant: "error",
                });
                return;
            }
        }
        let submittedStoredPassword = false;
        const themeMode = resolveThemeMode();
        const defaultBackground = resolveJitsiDefaultBackground(themeMode);
        const apiInstance = new window.JitsiMeetExternalAPI(meetingHost, {
            roomName,
            parentNode: frame,
            configOverwrite: {
                prejoinConfig: {
                    enabled: false,
                },
                requireDisplayName: false,
                disableDeepLinking: true,
                subject: MEETING_SUBJECT,
                preferredTheme: themeMode,
                toolbarButtons: JITSI_TOOLBAR_BUTTONS,
            },
            interfaceConfigOverwrite: {
                DEFAULT_BACKGROUND: defaultBackground,
            },
            userInfo: {
                displayName: state.currentProfile?.displayName ?? "",
                email: state.currentProfile?.email ?? "",
                avatarUrl: state.currentProfile?.avatarUrl ?? "",
            },
        });
        state.jitsiApi = apiInstance;
        state.jitsiParticipantId = "";
        state.jitsiConferenceJoined = false;
        state.jitsiModerator = false;
        state.jitsiThemeMode = themeMode;
        utils.syncShareButtonAvailability();
        const applyPrivilegedMeetingSettings = () => {
            if (state.jitsiApi !== apiInstance) return;
            if (!callbacks.currentUserIsJitsiModerator(apiInstance)) return;
            callbacks.executeJitsiCommandIfSupported(
                apiInstance,
                "subject",
                MEETING_SUBJECT,
            );
            if (meetingPassword) {
                callbacks.executeJitsiCommandIfSupported(
                    apiInstance,
                    "password",
                    meetingPassword,
                );
            }
        };
        const submitMeetingPassword = () => {
            if (state.jitsiApi !== apiInstance || !meetingPassword) return;
            callbacks.executeJitsiCommandIfSupported(
                apiInstance,
                "password",
                meetingPassword,
            );
            submittedStoredPassword = true;
        };
        const promptForCurrentMeetingPassword = async ({ invalid }) => {
            let passwordInput = null;
            const result = await openPopup({
                title: i18n.t("module.jitsi_meet.keyring_prompt_title"),
                body: `<label class="stack"><span>${escapeHtml(i18n.t(invalid ? "module.jitsi_meet.keyring_invalid" : "module.jitsi_meet.keyring_prompt"))}</span><input id="jitsi-keyring-password" type="password" autocomplete="off" required></label>`,
                actions: [
                    {
                        id: "save",
                        label: i18n.t("ui.reuse.save"),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                ],
                onOpen: (overlay) => {
                    passwordInput = overlay.querySelector(
                        "#jitsi-keyring-password",
                    );
                    passwordInput?.focus();
                },
                onAction: (actionId) =>
                    actionId !== "save" || Boolean(passwordInput?.value),
            });
            return result === "save" ? (passwordInput?.value ?? null) : null;
        };
        const applyParticipantProfile = () => {
            if (state.jitsiApi !== apiInstance) return;
            if (state.currentProfile?.displayName) {
                callbacks.executeJitsiCommandIfSupported(
                    apiInstance,
                    "displayName",
                    state.currentProfile.displayName,
                );
            }
            if (state.currentProfile?.email) {
                callbacks.executeJitsiCommandIfSupported(
                    apiInstance,
                    "email",
                    state.currentProfile.email,
                );
            }
            if (state.currentProfile?.avatarUrl) {
                callbacks.executeJitsiCommandIfSupported(
                    apiInstance,
                    "avatarUrl",
                    state.currentProfile.avatarUrl,
                );
            }
        };
        const handleMeetingLeft = () => {
            if (state.jitsiApi !== apiInstance) return;
            void callbacks.handleMeetingExit({
                fallbackOverlayMessageKey:
                    "module.jitsi_meet.overlay.meeting_left",
                honorMeetingClosed: false,
            });
        };
        const handleMeetingTerminated = () => {
            if (state.jitsiApi !== apiInstance) return;
            void callbacks.handleMeetingExit({
                fallbackOverlayMessageKey:
                    "module.jitsi_meet.overlay.meeting_closed",
                forceClosedOverlay: true,
                reportTerminated: true,
            });
        };
        apiInstance.addEventListener("videoConferenceJoined", (event) => {
            if (state.jitsiApi !== apiInstance) return;
            state.jitsiParticipantId = callbacks.getParticipantId(event);
            state.jitsiConferenceJoined = true;
            state.jitsiModerator =
                callbacks.currentUserIsJitsiModerator(apiInstance);
            applyParticipantProfile();
            applyPrivilegedMeetingSettings();
            utils.syncShareButtonAvailability();
            void callbacks.keepPresenceAlive(true);
            if (state.promptShareOnJoin) {
                state.promptShareOnJoin = false;
                void callbacks.openMeetingSharePopup?.();
            }
        });
        apiInstance.addEventListener("participantRoleChanged", (event) => {
            const participantId = callbacks.getParticipantId(event);
            if (participantId && participantId !== state.jitsiParticipantId) {
                return;
            }
            state.jitsiModerator =
                callbacks.getParticipantRole(event) === "moderator";
            applyPrivilegedMeetingSettings();
        });
        apiInstance.addEventListener("passwordRequired", async () => {
            utils.deferAloneParticipantPrompt();
            if (submittedStoredPassword) {
                const replacement = await meetingKeyring.resolve(
                    meetingKeyringId,
                    {
                        validate: () => false,
                        prompt: promptForCurrentMeetingPassword,
                        request: {
                            action: i18n.t(
                                "module.jitsi_meet.keyring_request_action_update",
                            ),
                            process: meetingProcess,
                        },
                        metadata: {
                            label:
                                state.meeting.meetingName ||
                                i18n.t("ui.reuse.meeting"),
                        },
                    },
                );
                if (!replacement) return;
                meetingPassword = replacement;
                submittedStoredPassword = false;
            }
            submitMeetingPassword();
            applyPrivilegedMeetingSettings();
        });
        apiInstance.addEventListener("notificationTriggered", (event) => {
            if (!callbacks.isMeetingTerminatedNotice(event)) return;
            handleMeetingTerminated();
        });
        apiInstance.addEventListener("errorOccurred", (event) => {
            if (!callbacks.isMeetingTerminatedNotice(event)) return;
            handleMeetingTerminated();
        });
        apiInstance.addEventListener("videoConferenceLeft", handleMeetingLeft);
        apiInstance.addEventListener("readyToClose", handleMeetingLeft);
        callbacks.renderParticipants();

        frame.hidden = false;
        utils.updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.in_meeting"),
            canStart: false,
            showAuth: false,
            showReclaim: false,
            visible: false,
        });
    }

    async function joinMeeting() {
        if (!state.meeting?.id) return;
        const joinResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/join",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    meetingId: state.meeting.id,
                    sessionId: state.sessionId,
                }),
                accessToken: state.shareAccessToken || undefined,
                suppressAccessDeniedEvent: true,
            },
        );
        if (!joinResponse.ok) {
            showToast(i18n.t("module.jitsi_meet.overlay.join_failed"), {
                variant: "error",
            });
            return;
        }

        const joinPayload = await joinResponse.json();
        state.meeting = joinPayload?.data ?? state.meeting;
        utils.deferAloneParticipantPrompt();
        await callbacks.updateNativeChat();

        if (state.meeting.requiresReclaim) {
            utils.updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.reclaim_prompt"),
                showReclaim: true,
                visible: true,
            });
            return { trackingAllowed: false };
        }

        if (state.meeting.waitingForAuthentication) {
            utils.updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.auth_waiting_other"),
                visible: true,
            });
            return { trackingAllowed: false };
        }

        if (
            state.meeting.state?.authRequired &&
            !state.meeting.state?.authCompletedAt
        ) {
            utils.updateOverlay({
                message: i18n.t(
                    "module.jitsi_meet.overlay.auth_required_description",
                ),
                showAuth: Boolean(state.meeting.canAuthenticate),
                visible: true,
            });
            return { trackingAllowed: false };
        }

        await openMeetingEmbed();
        return { trackingAllowed: true };
    }

    async function prepareMeetingStart() {
        if (!state.preflightPassed) {
            const passed = await callbacks.runPreflightCheck({
                showErrors: true,
            });
            if (!passed) return;
        }

        const selected = utils.selectedUsernames();

        utils.updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.creating"),
            loading: true,
            visible: true,
        });

        const createResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/create",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    participants: selected,
                }),
            },
        );

        if (!createResponse.ok) {
            const message =
                createResponse.status === 409
                    ? i18n.t("module.jitsi_meet.overlay.config_required")
                    : i18n.t("module.jitsi_meet.overlay.create_failed");
            utils.updateOverlay({
                message,
                loading: false,
                canStart: state.preflightPassed,
                visible: true,
            });
            showToast(message, { variant: "error" });
            return;
        }

        const createPayload = await createResponse
            .json()
            .catch(() => ({ data: null }));
        state.meeting = createPayload?.data;
        state.promptShareOnJoin = Boolean(state.meeting?.id);
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        await callbacks.updateNativeChat();

        utils.updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.joining"),
            loading: false,
            canStart: false,
            visible: true,
        });

        const joinState = await joinMeeting();
        if (joinState?.trackingAllowed) {
            callbacks.ensureMeetingTracking();
        }
        void callbacks.loadActiveMeetings({ resolveRequested: false });
    }

    return {
        joinMeeting,
        openMeetingEmbed,
        prepareMeetingStart,
    };
}
