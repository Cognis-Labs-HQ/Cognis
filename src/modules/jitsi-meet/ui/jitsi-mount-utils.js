import { ALONE_PROMPT_GRACE_PERIOD_MS } from "./constants.js";

export function createMountUtilities({ root, state }) {
    function isMeetingActive() {
        return Boolean(state.meeting?.id && state.jitsiApi);
    }

    function isMeetingEmbedMissing() {
        if (!state.meeting?.id || !state.jitsiApi) return false;
        const frame = root.querySelector("#jitsi-meeting-frame");
        return !(frame instanceof HTMLElement) || frame.childElementCount === 0;
    }

    function resetParticipantSelection() {
        state.selectedParticipants = [];
        state.availableParticipants = state.allParticipants.map((entry) => ({
            ...entry,
        }));
    }

    function clearTimers() {
        if (state.heartbeatTimer !== null) {
            clearInterval(state.heartbeatTimer);
            state.heartbeatTimer = null;
        }
        if (state.stateRefreshTimer !== null) {
            clearInterval(state.stateRefreshTimer);
            state.stateRefreshTimer = null;
        }
        if (state.chatRefreshTimer !== null) {
            clearInterval(state.chatRefreshTimer);
            state.chatRefreshTimer = null;
        }
    }

    function deferAloneParticipantPrompt(
        delayMs = ALONE_PROMPT_GRACE_PERIOD_MS,
    ) {
        state.alonePromptBlockedUntil = Date.now() + delayMs;
    }

    function selectedUsernames() {
        return state.selectedParticipants.map(
            (participant) => participant.username,
        );
    }

    /**
     * Keeps the share-meeting button disabled until the local participant's
     * Jitsi conference session has actually confirmed as joined
     * (`videoConferenceJoined`), not merely once the embed has been created.
     */
    function syncShareButtonAvailability() {
        const shareButton = root.querySelector("#jitsi-share-meeting-btn");
        if (shareButton instanceof HTMLButtonElement) {
            shareButton.disabled = !state.jitsiConferenceJoined;
        }
    }

    function updatePreflightIndicator() {
        const loadingEl = root.querySelector("#jitsi-loading");
        const indicatorEl = root.querySelector("#jitsi-loading-indicator");
        const loadingTextEl = root.querySelector("#jitsi-loading-text");
        if (
            !(loadingEl instanceof HTMLElement) ||
            !(indicatorEl instanceof HTMLElement) ||
            !(loadingTextEl instanceof HTMLElement)
        ) {
            return;
        }
        const showIndicator = state.preflightStatus !== "idle";
        loadingEl.hidden = !showIndicator;
        indicatorEl.classList.remove(
            "jitsi-spinner",
            "jitsi-tick",
            "jitsi-cross",
        );
        if (state.preflightStatus === "running") {
            indicatorEl.classList.add("jitsi-spinner");
        } else if (state.preflightStatus === "passed") {
            indicatorEl.classList.add("jitsi-tick");
        } else if (state.preflightStatus === "failed") {
            indicatorEl.classList.add("jitsi-cross");
        }
        loadingTextEl.textContent = state.preflightMessage;
    }

    function setPreflightStatus(status, message) {
        state.preflightStatus = status;
        state.preflightPassed = status === "passed";
        state.preflightMessage = message;
        updatePreflightIndicator();
    }

    function updateOverlay({
        message,
        loading = false,
        probed = false,
        canStart = false,
        showAuth = false,
        showReclaim = false,
        showAlonePrompt = false,
        visible = true,
    }) {
        const overlay = root.querySelector("#jitsi-overlay");
        const startButton = root.querySelector("#jitsi-start-btn");
        const authButton = root.querySelector("#jitsi-auth-btn");
        const reclaimButton = root.querySelector("#jitsi-reclaim-btn");
        const leaveAloneButton = root.querySelector("#jitsi-leave-alone-btn");
        const remainAloneButton = root.querySelector("#jitsi-remain-alone-btn");
        const messageEl = root.querySelector("#jitsi-overlay-message");
        const loadingEl = root.querySelector("#jitsi-loading");
        const indicatorEl = root.querySelector("#jitsi-loading-indicator");
        const loadingTextEl = root.querySelector("#jitsi-loading-text");

        if (messageEl instanceof HTMLElement && typeof message === "string") {
            messageEl.textContent = message;
        }
        if (overlay instanceof HTMLElement) {
            overlay.hidden = !visible;
        }
        if (loadingEl instanceof HTMLElement) {
            loadingEl.hidden =
                !loading &&
                state.preflightStatus !== "running" &&
                state.preflightStatus !== "passed" &&
                state.preflightStatus !== "failed";
        }
        if (indicatorEl instanceof HTMLElement) {
            if (state.preflightStatus === "failed") {
                indicatorEl.classList.remove("jitsi-spinner", "jitsi-tick");
                indicatorEl.classList.add("jitsi-cross");
            } else if (state.preflightStatus === "passed" || probed) {
                indicatorEl.classList.remove("jitsi-spinner");
                indicatorEl.classList.remove("jitsi-cross");
                indicatorEl.classList.add("jitsi-tick");
            } else {
                indicatorEl.classList.remove("jitsi-tick");
                indicatorEl.classList.remove("jitsi-cross");
                indicatorEl.classList.add("jitsi-spinner");
            }
        }
        if (
            loadingTextEl instanceof HTMLElement &&
            typeof message === "string"
        ) {
            if (loading || probed) {
                loadingTextEl.textContent = message;
            } else if (state.preflightMessage) {
                loadingTextEl.textContent = state.preflightMessage;
            }
        }
        if (startButton instanceof HTMLButtonElement) {
            startButton.disabled = !canStart;
            startButton.classList.toggle("jitsi-start-ready", canStart);
        }
        if (authButton instanceof HTMLElement) {
            authButton.hidden = !showAuth;
        }
        if (reclaimButton instanceof HTMLElement) {
            reclaimButton.hidden = !showReclaim;
        }
        if (leaveAloneButton instanceof HTMLElement) {
            leaveAloneButton.hidden = !showAlonePrompt;
        }
        if (remainAloneButton instanceof HTMLElement) {
            remainAloneButton.hidden = !showAlonePrompt;
        }
    }

    return {
        clearTimers,
        deferAloneParticipantPrompt,
        isMeetingActive,
        isMeetingEmbedMissing,
        resetParticipantSelection,
        selectedUsernames,
        setPreflightStatus,
        syncShareButtonAvailability,
        updateOverlay,
    };
}
