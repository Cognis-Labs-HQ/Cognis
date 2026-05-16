import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";

const HEARTBEAT_INTERVAL_MS = 10_000;
const PROBE_SUCCESS_DISPLAY_MS = 600;
const STATE_REFRESH_INTERVAL_MS = 5_000;
const SESSION_ID_STORAGE_KEY = "jitsi-meet:session-id";

function ensureSessionId() {
    const existing = localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (existing) return existing;
    let generated = globalThis.crypto?.randomUUID?.() ?? "";
    if (!generated) {
        const randomBytes = new Uint8Array(16);
        if (globalThis.crypto?.getRandomValues) {
            globalThis.crypto.getRandomValues(randomBytes);
            const randomHex = Array.from(randomBytes)
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
            generated = `session-${randomHex}`;
        } else {
            const fallbackEntropy = [
                Date.now(),
                globalThis.performance?.now?.() ?? 0,
                globalThis.navigator?.userAgent ?? "",
                globalThis.location?.href ?? "",
                localStorage.getItem("cognis_account") ?? "",
            ].join("|");
            generated = `session-${btoa(fallbackEntropy)
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 48)}`;
        }
    }
    localStorage.setItem(SESSION_ID_STORAGE_KEY, generated);
    return generated;
}

function normalizeUsername(value) {
    return String(value ?? "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
}

function createParticipantAvatarEl(username, displayName) {
    const wrapper = document.createElement("div");
    wrapper.className = "jitsi-participant-avatar";
    wrapper.setAttribute("draggable", "true");
    wrapper.setAttribute("data-username", username);
    wrapper.setAttribute("role", "listitem");

    const link = document.createElement("a");
    link.href = `/profile/${encodeURIComponent(username)}`;
    link.className = "jitsi-participant-avatar-link";
    link.tabIndex = -1;
    link.setAttribute("aria-label", displayName || username);

    const color = pickInitialsColor(username);
    const initials = getInitialsText(displayName || username);
    const bubble = document.createElement("span");
    bubble.className = "jitsi-participant-avatar-bubble";
    bubble.style.setProperty("--initials-bg", color);
    bubble.textContent = initials;
    link.appendChild(bubble);

    const label = document.createElement("span");
    label.className = "jitsi-participant-avatar-label";
    label.textContent = `@${username}`;

    wrapper.appendChild(link);
    wrapper.appendChild(label);
    return wrapper;
}

function buildStageMarkup(i18n) {
    return `
    <div class="jitsi-meeting-stage card-elevated">
      <div class="jitsi-stage-frame-wrap">
        <iframe id="jitsi-meeting-frame" class="jitsi-stage-frame" title="${escapeHtml(i18n.t("ui.reuse.meeting"))}" allow="camera; microphone; fullscreen; display-capture" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-pointer-lock allow-presentation" hidden></iframe>
        <div id="jitsi-overlay" class="jitsi-overlay">
          <div id="jitsi-staged-participants" class="jitsi-staged-participants" role="list"></div>
          <h3 class="jitsi-overlay-title">${escapeHtml(i18n.t("module.jitsi_meet.overlay.title"))}</h3>
          <p id="jitsi-overlay-message" class="jitsi-overlay-message">${escapeHtml(i18n.t("module.jitsi_meet.overlay.select_participants"))}</p>
          <div class="jitsi-overlay-actions">
            <button id="jitsi-start-btn" class="btn-animated" type="button" disabled>${escapeHtml(i18n.t("module.jitsi_meet.overlay.start_meeting"))}</button>
            <button id="jitsi-auth-btn" class="btn-cancel" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.auth_required"))}</button>
            <button id="jitsi-reclaim-btn" class="btn-cancel" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.reclaim"))}</button>
          </div>
          <div id="jitsi-loading" class="jitsi-loading" hidden>
            <span id="jitsi-loading-indicator" class="jitsi-spinner" aria-hidden="true"></span>
            <span id="jitsi-loading-text">${escapeHtml(i18n.t("module.jitsi_meet.overlay.loading"))}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildChatMarkup(i18n) {
    return `
    <aside class="jitsi-chat-pane card-elevated">
      <h3>${escapeHtml(i18n.t("module.jitsi_meet.chat.heading"))}</h3>
      <p id="jitsi-chat-hint">${escapeHtml(i18n.t("module.jitsi_meet.chat.pending"))}</p>
      <iframe id="jitsi-chat-frame" class="jitsi-chat-frame" title="${escapeHtml(i18n.t("module.jitsi_meet.chat.heading"))}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals" hidden></iframe>
    </aside>
  `;
}

function buildParticipantsMarkup(i18n) {
    return `
    <section class="jitsi-participants-pane card-elevated">
      <header class="jitsi-participants-header">
        <h3>${escapeHtml(i18n.t("module.jitsi_meet.participants.heading"))}</h3>
        <button id="jitsi-find-participants-btn" class="btn-cancel" type="button">
          ${escapeHtml(i18n.t("module.jitsi_meet.participants.search"))}
        </button>
      </header>
      <p class="jitsi-participants-pool-label">${escapeHtml(i18n.t("module.jitsi_meet.participants.available"))}</p>
      <div id="jitsi-available-participants" class="jitsi-avatar-pool" role="list"></div>
    </section>
  `;
}

async function fetchParticipants(query) {
    const response = await apiFetch(
        `/api/v1/modules/jitsi-meet/participants?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return [];
    const payload = await response.json().catch(() => ({ data: [] }));
    return Array.isArray(payload?.data) ? payload.data : [];
}

/**
 * Mounts the Meetings page inside the dashboard shell and wires all runtime
 * interactions (participant selection, meeting lifecycle polling, and chat
 * embed updates). The optional AbortSignal is used by the SPA router to clean
 * up timers and event listeners when users navigate away.
 *
 * @param {HTMLElement} root - Page mount root (usually #app).
 * @param {{ signal?: AbortSignal }} [options] - Router-provided lifecycle options.
 * @returns {Promise<void>}
 */
export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/modules/jitsi-meet/languages"],
    });
    applyDocumentTitle(i18n, "module.jitsi_meet.page_title");

    const state = {
        availableParticipants: [],
        selectedParticipants: [],
        meeting: null,
        heartbeatTimer: null,
        stateRefreshTimer: null,
        sessionId: ensureSessionId(),
        dragUsername: null,
    };

    function clearTimers() {
        if (state.heartbeatTimer !== null) {
            clearInterval(state.heartbeatTimer);
            state.heartbeatTimer = null;
        }
        if (state.stateRefreshTimer !== null) {
            clearInterval(state.stateRefreshTimer);
            state.stateRefreshTimer = null;
        }
    }

    if (signal) {
        signal.addEventListener("abort", () => {
            clearTimers();
        });
    }

    function selectedUsernames() {
        return state.selectedParticipants.map(
            (participant) => participant.username,
        );
    }

    function updateOverlay({
        message,
        loading = false,
        probed = false,
        canStart = false,
        showAuth = false,
        showReclaim = false,
    }) {
        const startButton = root.querySelector("#jitsi-start-btn");
        const authButton = root.querySelector("#jitsi-auth-btn");
        const reclaimButton = root.querySelector("#jitsi-reclaim-btn");
        const messageEl = root.querySelector("#jitsi-overlay-message");
        const loadingEl = root.querySelector("#jitsi-loading");
        const indicatorEl = root.querySelector("#jitsi-loading-indicator");
        const loadingTextEl = root.querySelector("#jitsi-loading-text");

        if (messageEl instanceof HTMLElement && typeof message === "string") {
            messageEl.textContent = message;
        }
        if (loadingEl instanceof HTMLElement) {
            loadingEl.hidden = !loading;
        }
        if (indicatorEl instanceof HTMLElement) {
            if (probed) {
                indicatorEl.classList.remove("jitsi-spinner");
                indicatorEl.classList.add("jitsi-tick");
            } else {
                indicatorEl.classList.remove("jitsi-tick");
                indicatorEl.classList.add("jitsi-spinner");
            }
        }
        if (
            loadingTextEl instanceof HTMLElement &&
            typeof message === "string"
        ) {
            if (loading || probed) {
                loadingTextEl.textContent = message;
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
    }

    async function updateChatEmbed() {
        const chatHint = root.querySelector("#jitsi-chat-hint");
        const chatFrame = root.querySelector("#jitsi-chat-frame");
        if (
            !(chatHint instanceof HTMLElement) ||
            !(chatFrame instanceof HTMLIFrameElement)
        ) {
            return;
        }
        if (!state.meeting?.chatUrl) {
            chatHint.textContent = i18n.t("module.jitsi_meet.chat.pending");
            chatFrame.src = "about:blank";
            chatFrame.hidden = true;
            return;
        }
        chatHint.textContent = i18n.t("module.jitsi_meet.chat.ready");
        chatFrame.src = state.meeting.chatUrl;
        chatFrame.hidden = false;
    }

    function renderParticipants() {
        const availablePool = root.querySelector(
            "#jitsi-available-participants",
        );
        const stagedArea = root.querySelector("#jitsi-staged-participants");
        if (
            !(availablePool instanceof HTMLElement) ||
            !(stagedArea instanceof HTMLElement)
        ) {
            return;
        }

        availablePool.replaceChildren(
            ...state.availableParticipants.map((entry) =>
                createParticipantAvatarEl(entry.username, entry.displayName),
            ),
        );

        stagedArea.replaceChildren(
            ...state.selectedParticipants.map((entry) =>
                createParticipantAvatarEl(entry.username, entry.displayName),
            ),
        );

        const participantCount = state.selectedParticipants.length;
        if (participantCount > 0) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.ready_to_start"),
                canStart: true,
            });
            return;
        }
        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.select_participants"),
            canStart: false,
        });
    }

    function removeParticipant(username) {
        state.selectedParticipants = state.selectedParticipants.filter(
            (entry) => entry.username !== username,
        );
    }

    function addParticipant(entry) {
        if (
            state.selectedParticipants.some(
                (item) => item.username === entry.username,
            )
        ) {
            return;
        }
        state.selectedParticipants.push(entry);
        state.selectedParticipants.sort((a, b) =>
            a.username.localeCompare(b.username),
        );
    }

    function applyDrop(username, targetZone) {
        if (!username) return;
        const normalized = normalizeUsername(username);
        if (!normalized) return;

        const fromAvailable = state.availableParticipants.find(
            (entry) => entry.username === normalized,
        );
        const fromSelected = state.selectedParticipants.find(
            (entry) => entry.username === normalized,
        );

        if (targetZone === "stage" && fromAvailable) {
            state.availableParticipants = state.availableParticipants.filter(
                (entry) => entry.username !== normalized,
            );
            addParticipant(fromAvailable);
        }

        if (targetZone === "available" && fromSelected) {
            removeParticipant(normalized);
            if (
                !state.availableParticipants.some(
                    (entry) => entry.username === normalized,
                )
            ) {
                state.availableParticipants.push(fromSelected);
            }
            state.availableParticipants.sort((a, b) =>
                a.username.localeCompare(b.username),
            );
        }

        renderParticipants();
    }

    async function loadMeetingState() {
        if (!state.meeting?.id) return;
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/state",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    meetingId: state.meeting.id,
                }),
            },
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({ data: null }));
        const latestState = payload?.data?.state;
        if (!latestState) return;
        if (latestState.authRequired && !latestState.authCompletedAt) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.auth_waiting"),
                showAuth: true,
            });
            return;
        }
        if (latestState.authCompletedAt) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.auth_completed"),
                canStart: false,
                showAuth: false,
            });
        }
    }

    async function keepPresenceAlive(active = true) {
        if (!state.meeting?.id) return;
        await apiFetch("/api/v1/modules/jitsi-meet/meetings/presence", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                meetingId: state.meeting.id,
                sessionId: state.sessionId,
                active,
            }),
        });
    }

    async function openMeetingEmbed() {
        if (!state.meeting?.meetingUrl) return;
        const frame = root.querySelector("#jitsi-meeting-frame");
        if (!(frame instanceof HTMLIFrameElement)) return;

        frame.src = state.meeting.meetingUrl;
        frame.hidden = false;
        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.in_meeting"),
            canStart: false,
            showAuth: false,
            showReclaim: false,
        });
        await keepPresenceAlive(true);
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
        await updateChatEmbed();

        if (state.meeting.requiresReclaim) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.reclaim_prompt"),
                showReclaim: true,
            });
            return;
        }

        if (state.meeting.waitingForAuthentication) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.auth_waiting_other"),
            });
            return;
        }

        if (
            state.meeting.state?.authRequired &&
            !state.meeting.state?.authCompletedAt
        ) {
            updateOverlay({
                message: i18n.t(
                    "module.jitsi_meet.overlay.auth_required_description",
                ),
                showAuth: Boolean(state.meeting.canAuthenticate),
            });
            return;
        }

        await openMeetingEmbed();
    }

    async function prepareMeetingStart() {
        const selected = selectedUsernames();
        if (selected.length === 0) return;

        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.creating"),
            loading: true,
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
            updateOverlay({
                message,
                loading: false,
                canStart: true,
            });
            showToast(message, { variant: "error" });
            return;
        }

        const createPayload = await createResponse
            .json()
            .catch(() => ({ data: null }));
        state.meeting = createPayload?.data;
        await updateChatEmbed();

        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.probing"),
            loading: true,
            canStart: false,
        });

        const probeResponse = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/probe",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    meetingId: state.meeting.id,
                }),
            },
        );

        const probePayload = await probeResponse
            .json()
            .catch(() => ({ data: null }));
        if (!probeResponse.ok || probePayload?.data?.alive !== true) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.probe_failed"),
                loading: false,
                canStart: true,
            });
            showToast(i18n.t("module.jitsi_meet.overlay.probe_failed"), {
                variant: "error",
            });
            return;
        }

        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.probe_done"),
            probed: true,
            canStart: false,
        });

        await new Promise((resolve) =>
            setTimeout(resolve, PROBE_SUCCESS_DISPLAY_MS),
        );

        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.joining"),
            loading: false,
            canStart: false,
        });

        await joinMeeting();

        if (state.heartbeatTimer === null) {
            state.heartbeatTimer = setInterval(() => {
                void keepPresenceAlive(true);
            }, HEARTBEAT_INTERVAL_MS);
        }
        if (state.stateRefreshTimer === null) {
            state.stateRefreshTimer = setInterval(() => {
                void loadMeetingState();
            }, STATE_REFRESH_INTERVAL_MS);
        }
    }

    let bindController = null;

    function bindInteractiveHandlers() {
        if (bindController) {
            bindController.abort();
        }
        bindController = new AbortController();
        if (signal) {
            signal.addEventListener(
                "abort",
                () => {
                    bindController?.abort();
                    bindController = null;
                },
                { once: true },
            );
        }
        const bindSignal = bindController.signal;
        const container = root;

        const findButton = container.querySelector(
            "#jitsi-find-participants-btn",
        );
        const startButton = container.querySelector("#jitsi-start-btn");
        const authButton = container.querySelector("#jitsi-auth-btn");
        const reclaimButton = container.querySelector("#jitsi-reclaim-btn");

        if (findButton instanceof HTMLButtonElement) {
            findButton.addEventListener(
                "click",
                () => {
                    openSearchPopup({
                        endpoint: "/api/v1/modules/jitsi-meet/participants",
                        category: "user",
                        ariaLabel: i18n.t(
                            "module.jitsi_meet.participants.search",
                        ),
                        noResultsText: i18n.t(
                            "module.jitsi_meet.participants.none",
                        ),
                        confirmLabel: i18n.t(
                            "module.jitsi_meet.participants.add_selected",
                        ),
                        multiSelect: true,
                        onSelectMultiple: (results) => {
                            for (const result of results) {
                                const username = normalizeUsername(
                                    result?.handle ?? result?.username ?? "",
                                );
                                const displayName = String(
                                    result?.displayName ?? result?.handle ?? "",
                                );
                                if (!username) continue;
                                if (
                                    state.selectedParticipants.some(
                                        (entry) => entry.username === username,
                                    )
                                ) {
                                    continue;
                                }
                                const participantEntry = {
                                    username,
                                    displayName,
                                };
                                state.availableParticipants =
                                    state.availableParticipants.filter(
                                        (entry) => entry.username !== username,
                                    );
                                addParticipant(participantEntry);
                            }
                            renderParticipants();
                        },
                    });
                },
                { signal: bindSignal },
            );
        }

        container.addEventListener(
            "dragstart",
            (event) => {
                const avatar = event.target.closest(
                    "[draggable][data-username]",
                );
                if (!(avatar instanceof HTMLElement)) return;
                state.dragUsername = avatar.dataset.username ?? null;
                event.dataTransfer?.setData(
                    "text/plain",
                    state.dragUsername ?? "",
                );
            },
            { signal: bindSignal },
        );

        const overlay = container.querySelector("#jitsi-overlay");
        const availablePool = container.querySelector(
            "#jitsi-available-participants",
        );

        if (overlay instanceof HTMLElement) {
            overlay.addEventListener(
                "dragover",
                (event) => {
                    const username =
                        state.dragUsername ??
                        event.dataTransfer?.types?.includes("text/plain");
                    if (!username) return;
                    event.preventDefault();
                    overlay.classList.add("jitsi-drop-active");
                },
                { signal: bindSignal },
            );

            overlay.addEventListener(
                "dragleave",
                (event) => {
                    if (!overlay.contains(event.relatedTarget)) {
                        overlay.classList.remove("jitsi-drop-active");
                    }
                },
                { signal: bindSignal },
            );

            overlay.addEventListener(
                "drop",
                (event) => {
                    overlay.classList.remove("jitsi-drop-active");
                    const username =
                        state.dragUsername ??
                        event.dataTransfer?.getData("text/plain");
                    state.dragUsername = null;
                    event.preventDefault();
                    applyDrop(username, "stage");
                },
                { signal: bindSignal },
            );
        }

        if (availablePool instanceof HTMLElement) {
            availablePool.addEventListener(
                "dragover",
                (event) => {
                    const username =
                        state.dragUsername ??
                        event.dataTransfer?.types?.includes("text/plain");
                    if (!username) return;
                    event.preventDefault();
                },
                { signal: bindSignal },
            );

            availablePool.addEventListener(
                "drop",
                (event) => {
                    const username =
                        state.dragUsername ??
                        event.dataTransfer?.getData("text/plain");
                    state.dragUsername = null;
                    event.preventDefault();
                    applyDrop(username, "available");
                },
                { signal: bindSignal },
            );
        }

        if (startButton instanceof HTMLButtonElement) {
            startButton.addEventListener(
                "click",
                () => {
                    void prepareMeetingStart();
                },
                { signal: bindSignal },
            );
        }

        if (authButton instanceof HTMLButtonElement) {
            authButton.addEventListener(
                "click",
                async () => {
                    if (!state.meeting?.id) return;
                    await apiFetch(
                        "/api/v1/modules/jitsi-meet/meetings/auth-start",
                        {
                            method: "POST",
                            headers: {
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({
                                meetingId: state.meeting.id,
                            }),
                        },
                    );
                    updateOverlay({
                        message: i18n.t(
                            "module.jitsi_meet.overlay.auth_in_progress",
                        ),
                        showAuth: true,
                    });
                    window.open(
                        state.meeting.meetingUrl,
                        "_blank",
                        "noopener,noreferrer",
                    );
                },
                { signal: bindSignal },
            );
        }

        if (reclaimButton instanceof HTMLButtonElement) {
            reclaimButton.addEventListener(
                "click",
                async () => {
                    if (!state.meeting?.id) return;
                    await apiFetch(
                        "/api/v1/modules/jitsi-meet/meetings/reclaim",
                        {
                            method: "POST",
                            headers: {
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({
                                meetingId: state.meeting.id,
                                sessionId: state.sessionId,
                            }),
                        },
                    );
                    updateOverlay({
                        message: i18n.t(
                            "module.jitsi_meet.overlay.reclaim_done",
                        ),
                        showReclaim: false,
                    });
                    await openMeetingEmbed();
                },
                { signal: bindSignal },
            );
        }

        renderParticipants();
        void updateChatEmbed();
    }

    const elements = [
        {
            id: "jitsi-participants",
            label: i18n.t("module.jitsi_meet.participants.heading"),
            pinned: true,
            gridSize: {
                default: [12, 2],
                min: [8, 2],
                max: "full",
            },
            render: () => buildParticipantsMarkup(i18n),
        },
        {
            id: "jitsi-stage",
            label: i18n.t("module.jitsi_meet.overlay.title"),
            pinned: true,
            gridSize: {
                default: [6, 5],
                min: [4, 4],
                // 'half' is the composer magic string for halfGrid(gridCols):
                // each panel fills exactly 50% of the available grid width.
                max: "half",
            },
            render: () => buildStageMarkup(i18n),
        },
        {
            id: "jitsi-chat",
            label: i18n.t("module.jitsi_meet.chat.heading"),
            pinned: true,
            gridSize: {
                default: [6, 5],
                min: [4, 4],
                // 'half' — same composer convention as jitsi-stage above.
                max: "half",
            },
            render: () => buildChatMarkup(i18n),
        },
    ];

    const allParticipants = await fetchParticipants("");
    state.availableParticipants = allParticipants
        .map((entry) => ({
            username: normalizeUsername(entry?.handle ?? entry?.username ?? ""),
            displayName: String(entry?.displayName ?? entry?.handle ?? ""),
        }))
        .filter((entry) => Boolean(entry.username))
        .sort((a, b) => a.username.localeCompare(b.username));

    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements,
        i18n,
        pageContext: {
            title: i18n.t("ui.reuse.meetings"),
            subtitle: i18n.t("module.jitsi_meet.page.subtitle"),
        },
        persistLayoutPreferences: true,
        onRender: bindInteractiveHandlers,
    });

    await composer.init();
}

// When the SPA router imports this module it sets __spaRouter=true to prevent
// direct-load auto-mount side effects; keep direct URL loads working otherwise.
if (!globalThis.__spaRouter) {
    try {
        const mountController = new AbortController();
        await mount(document.querySelector("#app"), {
            signal: mountController.signal,
        });
    } catch (error) {
        console.error(error);
    }
}
