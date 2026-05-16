import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    bytesToHex,
    hexToBytes,
    importRoomKey,
} from "/static/reuse/crypto-utils.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";

const HEARTBEAT_INTERVAL_MS = 10_000;
const PROBE_SUCCESS_DISPLAY_MS = 600;
const STATE_REFRESH_INTERVAL_MS = 5_000;
const CHAT_REFRESH_INTERVAL_MS = 2_500;
const SESSION_ID_STORAGE_KEY = "jitsi-meet:session-id";
const TEXT_ENCODER = new TextEncoder();
const MEETING_SUBJECT = "Cognis Classroom";
const JITSI_TOOLBAR_BUTTONS = [
    "microphone",
    "camera",
    "desktop",
    "fullscreen",
    "hangup",
    "participants-pane",
    "tileview",
    "select-background",
    "videoquality",
    "raisehand",
    "fodeviceselection",
];

let jitsiExternalApiLoader = null;

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

function normalizeChatRoomId(value) {
    const asString = String(value ?? "").trim();
    if (!asString) return "";
    return asString.replace(/^\/+|\/+$/g, "");
}

function resolveMeetingChatRoomId(meeting) {
    const directRoomId = normalizeChatRoomId(meeting?.chatRoomId);
    if (directRoomId) return directRoomId;
    const rawChatUrl = String(meeting?.chatUrl ?? "").trim();
    if (!rawChatUrl) return "";
    const match = rawChatUrl.match(/\/messages\/([^/?#]+)/);
    return match ? normalizeChatRoomId(decodeURIComponent(match[1])) : "";
}

async function fetchCurrentProfile() {
    const response = await apiFetch("/api/v1/profile");
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({ data: null }));
    const profile = payload?.data;
    if (!profile) return null;
    const handle = normalizeUsername(profile.handle ?? "");
    const displayName = String(
        profile.displayName ?? profile.handle ?? "",
    ).trim();
    const email = typeof profile.email === "string" ? profile.email.trim() : "";
    return {
        handle,
        displayName: displayName || handle || "Cognis User",
        email,
    };
}

function buildMeetingJoinUrl(meetingUrl, profile) {
    try {
        const parsed = new URL(meetingUrl);
        const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        const themeMode = resolveThemeMode();
        hashParams.set("config.prejoinConfig.enabled", "false");
        hashParams.set("config.requireDisplayName", "false");
        hashParams.set("config.subject", MEETING_SUBJECT);
        hashParams.set("config.preferredTheme", themeMode);
        hashParams.set(
            "config.toolbarButtons",
            JSON.stringify(JITSI_TOOLBAR_BUTTONS),
        );
        if (profile?.displayName) {
            hashParams.set("userInfo.displayName", profile.displayName);
        }
        if (profile?.email) {
            hashParams.set("userInfo.email", profile.email);
        }
        parsed.hash = hashParams.toString();
        return parsed.toString();
    } catch {
        return meetingUrl;
    }
}

function resolveThemeMode() {
    const storedMode = localStorage.getItem("cognis_theme");
    if (storedMode === "light" || storedMode === "dark") {
        return storedMode;
    }
    const documentMode = document.body.getAttribute("data-theme");
    if (documentMode === "light" || documentMode === "dark") {
        return documentMode;
    }
    return "dark";
}

function resolveMeetingHost(meetingUrl) {
    try {
        return new URL(meetingUrl).host;
    } catch {
        return "";
    }
}

function resolveMeetingOrigin(meetingUrl) {
    try {
        return new URL(meetingUrl).origin;
    } catch {
        return "";
    }
}

function resolveRoomName(meeting) {
    if (typeof meeting?.roomSlug === "string" && meeting.roomSlug.trim()) {
        return meeting.roomSlug.trim();
    }
    try {
        const parsedUrl = new URL(meeting?.meetingUrl ?? "");
        return parsedUrl.pathname.replace(/^\/+|\/+$/g, "");
    } catch {
        return "";
    }
}

function loadJitsiExternalApi(meetingUrl) {
    const meetingOrigin = resolveMeetingOrigin(meetingUrl);
    if (!meetingOrigin) {
        return Promise.reject(new Error("Missing Jitsi meeting origin."));
    }
    if (
        jitsiExternalApiLoader &&
        jitsiExternalApiLoader.origin === meetingOrigin
    ) {
        return jitsiExternalApiLoader.promise;
    }
    const externalApiScriptUrl = `${meetingOrigin}/external_api.js`;
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
                    {
                        once: true,
                    },
                );
                if (typeof window.JitsiMeetExternalAPI === "function") {
                    resolve();
                }
                return;
            }

            const scriptElement = document.createElement("script");
            scriptElement.src = externalApiScriptUrl;
            scriptElement.async = true;
            scriptElement.dataset.jitsiOrigin = meetingOrigin;
            scriptElement.addEventListener("load", () => resolve(), {
                once: true,
            });
            scriptElement.addEventListener(
                "error",
                () => reject(new Error("Failed to load Jitsi API script.")),
                {
                    once: true,
                },
            );
            document.head.appendChild(scriptElement);
        }),
    };
    return jitsiExternalApiLoader.promise;
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
        <div id="jitsi-meeting-frame" class="jitsi-stage-frame" title="${escapeHtml(i18n.t("ui.reuse.meeting"))}" hidden></div>
        <div id="jitsi-overlay" class="jitsi-overlay">
          <div id="jitsi-staged-participants" class="jitsi-staged-participants" role="list"></div>
          <h3 class="jitsi-overlay-title">${escapeHtml(i18n.t("module.jitsi_meet.overlay.title"))}</h3>
          <p id="jitsi-overlay-message" class="jitsi-overlay-message">${escapeHtml(i18n.t("module.jitsi_meet.overlay.select_participants"))}</p>
          <div class="jitsi-overlay-actions">
            <button id="jitsi-start-btn" class="btn-animated" type="button" disabled>${escapeHtml(i18n.t("module.jitsi_meet.overlay.start_meeting"))}</button>
            <button id="jitsi-auth-btn" class="btn-cancel" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.auth_required"))}</button>
            <button id="jitsi-reclaim-btn" class="btn-confirm" type="button" hidden>${escapeHtml(i18n.t("module.jitsi_meet.overlay.reclaim"))}</button>
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
      <div id="jitsi-chat-thread" class="jitsi-chat-thread" aria-live="polite"></div>
      <form id="jitsi-chat-form" class="jitsi-chat-form" hidden>
        <textarea id="jitsi-chat-input" class="jitsi-chat-input" rows="3" placeholder="${escapeHtml(i18n.t("module.jitsi_meet.chat.placeholder"))}"></textarea>
      </form>
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
        allParticipants: [],
        availableParticipants: [],
        selectedParticipants: [],
        meeting: null,
        heartbeatTimer: null,
        stateRefreshTimer: null,
        chatRefreshTimer: null,
        chatRoomId: "",
        chatRoomKey: null,
        currentProfile: null,
        preflightStatus: "idle",
        preflightPassed: false,
        preflightMessage: "",
        preflightNeedsConfig: false,
        sessionId: ensureSessionId(),
        dragUsername: null,
        jitsiApi: null,
    };

    function isMeetingActive() {
        return Boolean(state.meeting?.id && state.jitsiApi);
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

    if (signal) {
        signal.addEventListener("abort", () => {
            clearTimers();
            closeMeetingEmbed();
        });
    }

    function selectedUsernames() {
        return state.selectedParticipants.map(
            (participant) => participant.username,
        );
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
        visible = true,
    }) {
        const overlay = root.querySelector("#jitsi-overlay");
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
    }

    async function getChatRoomKey(roomId) {
        if (!roomId) return null;
        if (state.chatRoomKey && state.chatRoomId === roomId) {
            return state.chatRoomKey;
        }
        const response = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/key`,
        );
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({ data: null }));
        const keyHex = String(payload?.data?.key ?? "").trim();
        if (!keyHex) return null;
        const imported = await importRoomKey(keyHex);
        state.chatRoomKey = imported;
        return imported;
    }

    async function decryptChatMessage(message, key) {
        if (!key) return null;
        const ivHex = String(message?.iv ?? "").trim();
        const cipherHex = String(message?.ciphertext ?? "").trim();
        const authTag = String(message?.authTag ?? "").trim();
        if (!ivHex || !cipherHex) return null;
        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: hexToBytes(ivHex) },
                key,
                hexToBytes(`${cipherHex}${authTag}`),
            );
            return new TextDecoder().decode(decrypted);
        } catch {
            return null;
        }
    }

    async function encryptChatMessage(text, key) {
        const initVector = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: initVector },
            key,
            TEXT_ENCODER.encode(text),
        );
        return {
            iv: bytesToHex(initVector),
            ciphertext: bytesToHex(new Uint8Array(encrypted)),
        };
    }

    function renderChatMessages(messages) {
        const chatThread = root.querySelector("#jitsi-chat-thread");
        if (!(chatThread instanceof HTMLElement)) return;
        if (!Array.isArray(messages) || messages.length === 0) {
            chatThread.innerHTML = `<p class="jitsi-chat-empty">${escapeHtml(i18n.t("module.jitsi_meet.chat.empty"))}</p>`;
            return;
        }
        chatThread.innerHTML = messages
            .map((message) => {
                const isOwn =
                    String(message?.senderId ?? "") ===
                    String(localStorage.getItem("cognis_account") ?? "");
                const messageClass = isOwn
                    ? "jitsi-chat-message jitsi-chat-message-own"
                    : "jitsi-chat-message";
                const sender =
                    String(message?.senderDisplayName ?? "").trim() ||
                    String(message?.senderHandle ?? "").trim() ||
                    String(message?.senderId ?? "").trim() ||
                    "Unknown";
                const createdAt = String(message?.createdAt ?? "").trim();
                const safeTime = createdAt
                    ? new Date(createdAt).toLocaleTimeString()
                    : "";
                const body = escapeHtml(
                    String(message?.text ?? i18n.t("ui.reuse.unknown")),
                ).replace(/\n/g, "<br>");
                return `<article class="${messageClass}">
              <header class="jitsi-chat-message-head">
                <strong>${escapeHtml(sender)}</strong>
                <time>${escapeHtml(safeTime)}</time>
              </header>
              <p class="jitsi-chat-message-body">${body}</p>
            </article>`;
            })
            .join("");
    }

    async function refreshNativeChat() {
        const chatHint = root.querySelector("#jitsi-chat-hint");
        const chatForm = root.querySelector("#jitsi-chat-form");
        if (
            !(chatHint instanceof HTMLElement) ||
            !(chatForm instanceof HTMLFormElement)
        ) {
            return;
        }
        const roomId = state.chatRoomId;
        if (!roomId) {
            chatHint.textContent = i18n.t("module.jitsi_meet.chat.pending");
            chatHint.hidden = false;
            chatForm.hidden = true;
            renderChatMessages([]);
            return;
        }
        const roomKey = await getChatRoomKey(roomId);
        if (!roomKey) {
            chatHint.textContent = i18n.t("module.jitsi_meet.chat.unavailable");
            chatHint.hidden = false;
            chatForm.hidden = true;
            renderChatMessages([]);
            return;
        }
        const response = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=50`,
        );
        if (!response.ok) {
            chatHint.textContent = i18n.t("module.jitsi_meet.chat.unavailable");
            chatHint.hidden = false;
            chatForm.hidden = true;
            renderChatMessages([]);
            return;
        }
        const payload = await response.json().catch(() => ({ data: [] }));
        const ordered = Array.isArray(payload?.data)
            ? payload.data
                  .slice()
                  .reverse()
                  .filter(
                      (message) =>
                          message?.contentType !==
                          "application/vnd.cognis.room-event+json",
                  )
            : [];
        const decoded = await Promise.all(
            ordered.map(async (message) => ({
                ...message,
                text: await decryptChatMessage(message, roomKey),
            })),
        );
        renderChatMessages(decoded);
        chatHint.textContent = "";
        chatHint.hidden = true;
        chatForm.hidden = false;
    }

    function stopNativeChatPolling() {
        if (state.chatRefreshTimer === null) return;
        clearInterval(state.chatRefreshTimer);
        state.chatRefreshTimer = null;
    }

    function startNativeChatPolling() {
        if (!state.chatRoomId || state.chatRefreshTimer !== null) return;
        state.chatRefreshTimer = setInterval(() => {
            void refreshNativeChat();
        }, CHAT_REFRESH_INTERVAL_MS);
    }

    async function updateNativeChat() {
        const chatHint = root.querySelector("#jitsi-chat-hint");
        if (!(chatHint instanceof HTMLElement)) {
            return;
        }
        state.chatRoomId = resolveMeetingChatRoomId(state.meeting);
        if (!state.chatRoomId) {
            state.chatRoomKey = null;
            stopNativeChatPolling();
            chatHint.textContent = i18n.t("module.jitsi_meet.chat.pending");
            chatHint.hidden = false;
            await refreshNativeChat();
            return;
        }
        await refreshNativeChat();
        startNativeChatPolling();
    }

    function closeMeetingEmbed() {
        if (state.jitsiApi) {
            const activeApi = state.jitsiApi;
            state.jitsiApi = null;
            activeApi.dispose();
        }
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
            await keepPresenceAlive(false).catch(() => undefined);
        }
        clearTimers();
        closeMeetingEmbed();
        state.meeting = null;
        state.chatRoomId = "";
        state.chatRoomKey = null;
        stopNativeChatPolling();
        resetParticipantSelection();
        renderParticipants();
        await updateNativeChat();
        if (overlayMessageKey) {
            updateOverlay({
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
    }) {
        const leaveState = await keepPresenceAlive(false).catch(() => null);
        const overlayMessageKey =
            forceClosedOverlay || leaveState?.meetingClosed
                ? "module.jitsi_meet.overlay.meeting_closed"
                : fallbackOverlayMessageKey;
        await resetMeetingState({
            overlayMessageKey,
            skipPresenceUpdate: true,
        });
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

    async function runPreflightCheck({ showErrors = false } = {}) {
        if (state.preflightStatus === "running") {
            return false;
        }
        setPreflightStatus(
            "running",
            i18n.t("module.jitsi_meet.overlay.loading"),
        );
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/preflight",
            {
                method: "POST",
            },
        );
        if (!response.ok) {
            state.preflightNeedsConfig = response.status === 409;
            const message =
                response.status === 409
                    ? i18n.t("module.jitsi_meet.overlay.config_required")
                    : i18n.t("module.jitsi_meet.overlay.probe_failed");
            setPreflightStatus("failed", message);
            renderParticipants();
            if (showErrors) {
                showToast(message, { variant: "error" });
            }
            return false;
        }
        const payload = await response.json().catch(() => ({ data: null }));
        state.preflightNeedsConfig = false;
        const isAlive = payload?.data?.alive === true;
        if (!isAlive) {
            const message = i18n.t("module.jitsi_meet.overlay.probe_failed");
            setPreflightStatus("failed", message);
            renderParticipants();
            if (showErrors) {
                showToast(message, { variant: "error" });
            }
            return false;
        }
        setPreflightStatus(
            "passed",
            i18n.t("module.jitsi_meet.overlay.probe_done"),
        );
        renderParticipants();
        return true;
    }

    function renderParticipants() {
        const availablePool = root.querySelector(
            "#jitsi-available-participants",
        );
        const stagedArea = root.querySelector("#jitsi-staged-participants");
        const participantsPane = root.querySelector(".jitsi-participants-pane");
        const findButton = root.querySelector("#jitsi-find-participants-btn");
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

        const participantSelectionLocked = isMeetingActive();
        if (participantsPane instanceof HTMLElement) {
            participantsPane.classList.toggle(
                "jitsi-participants-disabled",
                participantSelectionLocked,
            );
        }
        if (findButton instanceof HTMLButtonElement) {
            findButton.disabled = participantSelectionLocked;
        }

        const participantCount = state.selectedParticipants.length;
        if (!participantSelectionLocked) {
            updateOverlay({
                message: i18n.t(lobbyMessageKey(participantCount)),
                canStart:
                    participantCount > 0 &&
                    state.preflightPassed &&
                    !state.meeting?.id,
            });
        }
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
        if (isMeetingActive()) return;
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
                    sessionId: state.sessionId,
                }),
            },
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({ data: null }));
        const latestState = payload?.data?.state;
        if (!latestState) return;
        if (latestState.endedAt) {
            await resetMeetingState({
                overlayMessageKey: "module.jitsi_meet.overlay.meeting_closed",
            });
            return;
        }
        if (payload?.data?.sessionActive === false) {
            await resetMeetingState({
                overlayMessageKey:
                    "module.jitsi_meet.overlay.reclaimed_elsewhere",
                toastMessageKey:
                    "module.jitsi_meet.overlay.reclaimed_elsewhere",
                toastVariant: "warning",
            });
            return;
        }
        if (latestState.authRequired && !latestState.authCompletedAt) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.auth_waiting"),
                showAuth: true,
                visible: true,
            });
            return;
        }
        if (latestState.authCompletedAt) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.auth_completed"),
                canStart: false,
                showAuth: false,
                visible: true,
            });
        }
    }

    async function keepPresenceAlive(active = true) {
        if (!state.meeting?.id) return null;
        const response = await apiFetch("/api/v1/modules/jitsi-meet/meetings/presence", {
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
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({ data: null }));
        return payload?.data ?? null;
    }

    function ensureMeetingTracking() {
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

    async function openMeetingEmbed() {
        if (!state.meeting?.meetingUrl) return;
        const frame = root.querySelector("#jitsi-meeting-frame");
        if (!(frame instanceof HTMLElement)) return;

        closeMeetingEmbed();
        await loadJitsiExternalApi(state.meeting.meetingUrl);

        const meetingHost = resolveMeetingHost(state.meeting.meetingUrl);
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

        const meetingPassword = String(
            state.meeting.meetingPassword ?? "",
        ).trim();
        const themeMode = resolveThemeMode();
        const apiInstance = new window.JitsiMeetExternalAPI(meetingHost, {
            roomName,
            parentNode: frame,
            configOverwrite: {
                prejoinConfig: {
                    enabled: false,
                },
                requireDisplayName: false,
                subject: MEETING_SUBJECT,
                preferredTheme: themeMode,
                toolbarButtons: JITSI_TOOLBAR_BUTTONS,
            },
            userInfo: {
                displayName: state.currentProfile?.displayName ?? "",
                email: state.currentProfile?.email ?? "",
            },
        });
        state.jitsiApi = apiInstance;
        const applyMeetingPassword = () => {
            if (!meetingPassword || state.jitsiApi !== apiInstance) return;
            apiInstance.executeCommand("password", meetingPassword);
        };
        const applyMeetingSubject = () => {
            if (state.jitsiApi !== apiInstance) return;
            apiInstance.executeCommand("subject", MEETING_SUBJECT);
        };
        const handleMeetingLeft = () => {
            if (state.jitsiApi !== apiInstance) return;
            void handleMeetingExit({
                fallbackOverlayMessageKey:
                    "module.jitsi_meet.overlay.meeting_left",
            });
        };
        const handleMeetingClosed = () => {
            if (state.jitsiApi !== apiInstance) return;
            void handleMeetingExit({
                fallbackOverlayMessageKey:
                    "module.jitsi_meet.overlay.meeting_closed",
                forceClosedOverlay: true,
            });
        };
        apiInstance.addEventListener("videoConferenceJoined", () => {
            applyMeetingSubject();
            applyMeetingPassword();
        });
        apiInstance.addEventListener("participantRoleChanged", (event) => {
            if (event?.role !== "moderator") return;
            applyMeetingSubject();
            applyMeetingPassword();
        });
        apiInstance.addEventListener("passwordRequired", () => {
            applyMeetingPassword();
        });
        apiInstance.addEventListener("videoConferenceLeft", handleMeetingLeft);
        apiInstance.addEventListener("readyToClose", handleMeetingClosed);
        renderParticipants();

        frame.hidden = false;
        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.in_meeting"),
            canStart: false,
            showAuth: false,
            showReclaim: false,
            visible: false,
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
        await updateNativeChat();

        if (state.meeting.requiresReclaim) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.reclaim_prompt"),
                showReclaim: true,
                visible: true,
            });
            return { trackingAllowed: false };
        }

        if (state.meeting.waitingForAuthentication) {
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.auth_waiting_other"),
                visible: true,
            });
            return { trackingAllowed: true };
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
                visible: true,
            });
            return { trackingAllowed: true };
        }

        await openMeetingEmbed();
        return { trackingAllowed: true };
    }

    async function prepareMeetingStart() {
        if (!state.preflightPassed) {
            const passed = await runPreflightCheck({ showErrors: true });
            if (!passed) return;
        }

        const selected = selectedUsernames();
        if (selected.length === 0) {
            renderParticipants();
            return;
        }

        updateOverlay({
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
            updateOverlay({
                message,
                loading: false,
                canStart: state.preflightPassed && selected.length > 0,
                visible: true,
            });
            showToast(message, { variant: "error" });
            return;
        }

        const createPayload = await createResponse
            .json()
            .catch(() => ({ data: null }));
        state.meeting = createPayload?.data;
        await updateNativeChat();

        updateOverlay({
            message: i18n.t("module.jitsi_meet.overlay.joining"),
            loading: false,
            canStart: false,
            visible: true,
        });

        const joinState = await joinMeeting();
        if (joinState?.trackingAllowed) {
            ensureMeetingTracking();
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
        const chatForm = container.querySelector("#jitsi-chat-form");
        const chatInput = container.querySelector("#jitsi-chat-input");

        if (findButton instanceof HTMLButtonElement) {
            findButton.addEventListener(
                "click",
                () => {
                    if (isMeetingActive()) return;
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
                if (isMeetingActive()) {
                    event.preventDefault();
                    return;
                }
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
                    if (isMeetingActive()) return;
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
                    if (isMeetingActive()) return;
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
                    if (isMeetingActive()) return;
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
                    if (isMeetingActive()) return;
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
                    if (isMeetingActive()) return;
                    void prepareMeetingStart();
                },
                { signal: bindSignal },
            );
        }

        window.addEventListener(
            "beforeunload",
            (event) => {
                if (!isMeetingActive()) return;
                event.preventDefault();
                event.returnValue = "";
            },
            { signal: bindSignal },
        );
        window.addEventListener(
            "click",
            (event) => {
                if (!isMeetingActive()) return;
                const target = event.target;
                if (!(target instanceof Element)) return;
                const linkEl = target.closest("a[href]");
                if (!(linkEl instanceof HTMLAnchorElement)) return;
                const href = String(linkEl.getAttribute("href") ?? "");
                if (!href || href.startsWith("#")) return;
                const targetUrl = new URL(linkEl.href, window.location.origin);
                if (targetUrl.origin !== window.location.origin) return;
                const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
                if (currentPath === nextPath) return;
                event.preventDefault();
                event.stopPropagation();
                showToast(i18n.t("module.jitsi_meet.overlay.leave_blocked"), {
                    variant: "warning",
                });
            },
            { capture: true, signal: bindSignal },
        );
        window.addEventListener(
            "popstate",
            () => {
                if (!isMeetingActive()) return;
                history.pushState(history.state, "", window.location.href);
                showToast(i18n.t("module.jitsi_meet.overlay.leave_blocked"), {
                    variant: "warning",
                });
            },
            { signal: bindSignal },
        );

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
                        visible: true,
                    });
                    window.open(
                        buildMeetingJoinUrl(
                            state.meeting.meetingUrl,
                            state.currentProfile,
                        ),
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
                        visible: true,
                    });
                    await openMeetingEmbed();
                    ensureMeetingTracking();
                },
                { signal: bindSignal },
            );
        }

        if (
            chatForm instanceof HTMLFormElement &&
            chatInput instanceof HTMLTextAreaElement
        ) {
            chatInput.addEventListener(
                "keydown",
                (event) => {
                    if (
                        event.key !== "Enter" ||
                        event.shiftKey ||
                        event.isComposing
                    ) {
                        return;
                    }
                    event.preventDefault();
                    chatForm.requestSubmit();
                },
                { signal: bindSignal },
            );
            chatForm.addEventListener(
                "submit",
                async (event) => {
                    event.preventDefault();
                    const roomId = state.chatRoomId;
                    if (!roomId) return;
                    const messageText = chatInput.value.trim();
                    if (!messageText) return;
                    const roomKey = await getChatRoomKey(roomId);
                    if (!roomKey) return;
                    const encrypted = await encryptChatMessage(
                        messageText,
                        roomKey,
                    );
                    const response = await apiFetch(
                        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages`,
                        {
                            method: "POST",
                            headers: {
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({
                                ...encrypted,
                                contentType: "text/plain",
                            }),
                        },
                    );
                    if (!response.ok) {
                        showToast(
                            i18n.t("module.jitsi_meet.chat.send_failed"),
                            {
                                variant: "error",
                            },
                        );
                        return;
                    }
                    chatInput.value = "";
                    await refreshNativeChat();
                },
                { signal: bindSignal },
            );
        }

        renderParticipants();
        void updateNativeChat();
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
            },
            render: () => buildChatMarkup(i18n),
        },
    ];

    const [allParticipants, currentProfile] = await Promise.all([
        fetchParticipants(""),
        fetchCurrentProfile(),
    ]);
    state.currentProfile = currentProfile;
    state.allParticipants = allParticipants
        .map((entry) => ({
            username: normalizeUsername(entry?.handle ?? entry?.username ?? ""),
            displayName: String(entry?.displayName ?? entry?.handle ?? ""),
        }))
        .filter((entry) => Boolean(entry.username))
        .sort((a, b) => a.username.localeCompare(b.username));
    state.availableParticipants = state.allParticipants.map((entry) => ({
        ...entry,
    }));

    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements,
        preferenceKey: "meetings-layout-v2",
        i18n,
        pageContext: {
            title: i18n.t("ui.reuse.meetings"),
            subtitle: i18n.t("module.jitsi_meet.page.subtitle"),
        },
        persistLayoutPreferences: true,
        onRender: bindInteractiveHandlers,
    });

    await composer.init();
    await runPreflightCheck();
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
