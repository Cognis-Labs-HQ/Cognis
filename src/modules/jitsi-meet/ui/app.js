import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/init.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import {
    bytesToHex,
    hexToBytes,
    importRoomKey,
} from "/static/reuse/crypto-utils.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import {
    buildProfileAvatarMarkup,
    handleProfileAvatarError,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";
import {
    normalizeUsername,
    resolveUrlHost,
} from "/static/reuse/value-normalizers.js";
import {
    ALONE_PROMPT_GRACE_PERIOD_MS,
    ACTIVE_MEETINGS_REFRESH_INTERVAL_MS,
    CHAT_REFRESH_INTERVAL_MS,
    HEARTBEAT_INTERVAL_MS,
    MEETING_SUBJECT,
    MEETING_TERMINATED_TEXT,
    PROBE_SUCCESS_DISPLAY_MS,
    STATE_REFRESH_INTERVAL_MS,
    TEXT_ENCODER,
    JITSI_TOOLBAR_BUTTONS,
} from "./constants.js";
import { ensureSessionId } from "./session.js";
import {
    buildMeetingJoinUrl,
    loadJitsiExternalApi,
    resolveRoomName,
    resolveThemeMode,
} from "./meeting-embed.js";
import {
    buildChatMarkup,
    buildParticipantsMarkup,
    buildStageMarkup,
} from "./markup.js";

const FALLBACK_MESSAGE_UI_RESOURCES = Object.freeze({
    languageBaseUrls: ["/static/modules/jitsi-meet/languages"],
    stylesheetUrls: [],
    reactionHelpersModuleUrl: null,
});

const NULL_MESSAGE_REACTIONS_CONTROLLER = Object.freeze({
    destroy: () => undefined,
    hideReactionHoverPopup: () => undefined,
    openEmojiPickerPopup: async () => undefined,
    recordEmojiUsage: () => undefined,
    renderReactionRow: () => "",
    repositionReactionHoverPopup: () => undefined,
    showReactionHoverPopup: () => undefined,
    toggleReaction: async () => undefined,
});

async function loadMessageUiResources() {
    try {
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/ui-resources",
        );
        if (!response.ok) {
            console.warn(
                "[jitsi-meet] message UI resources unavailable; using fallback resources",
                {
                    operation: "load_message_ui_resources",
                    status: response.status,
                },
            );
            return FALLBACK_MESSAGE_UI_RESOURCES;
        }
        const payload = await response.json().catch(() => ({ data: null }));
        const responseData = payload?.data ?? {};
        const languageBaseUrls = Array.isArray(responseData.languageBaseUrls)
            ? responseData.languageBaseUrls.filter(
                  (entry) => typeof entry === "string" && entry.length > 0,
              )
            : FALLBACK_MESSAGE_UI_RESOURCES.languageBaseUrls;
        const stylesheetUrls = Array.isArray(responseData.stylesheetUrls)
            ? responseData.stylesheetUrls.filter(
                  (entry) => typeof entry === "string" && entry.length > 0,
              )
            : [];
        const reactionHelpersModuleUrl =
            typeof responseData.reactionHelpersModuleUrl === "string" &&
            responseData.reactionHelpersModuleUrl.length > 0
                ? responseData.reactionHelpersModuleUrl
                : null;
        return {
            languageBaseUrls:
                languageBaseUrls.length > 0
                    ? languageBaseUrls
                    : FALLBACK_MESSAGE_UI_RESOURCES.languageBaseUrls,
            stylesheetUrls,
            reactionHelpersModuleUrl,
        };
    } catch {
        console.warn(
            "[jitsi-meet] failed to load message UI resources; using fallback resources",
            { operation: "load_message_ui_resources" },
        );
        return FALLBACK_MESSAGE_UI_RESOURCES;
    }
}

function ensureStylesheetLoaded(stylesheetUrl) {
    if (!stylesheetUrl) return;
    if (
        document.querySelector(
            `link[rel="stylesheet"][href="${CSS.escape(stylesheetUrl)}"]`,
        )
    ) {
        return;
    }
    const stylesheetLink = document.createElement("link");
    stylesheetLink.rel = "stylesheet";
    stylesheetLink.href = stylesheetUrl;
    document.head.append(stylesheetLink);
}

async function loadMessageReactionsController(
    messageUiResources,
    i18n,
    onReactionUpdated,
) {
    const moduleUrl = messageUiResources?.reactionHelpersModuleUrl;
    if (!moduleUrl) return null;
    try {
        const moduleExports = await import(moduleUrl);
        if (
            typeof moduleExports?.createMessageReactionsController !==
            "function"
        ) {
            return null;
        }
        const reactionsController =
            moduleExports.createMessageReactionsController({
                i18n,
                onReactionUpdated,
            });
        await reactionsController.loadEmojiUsage?.();
        return reactionsController;
    } catch {
        return null;
    }
}

function normalizeChatRoomId(value) {
    const asString = String(value ?? "").trim();
    if (!asString) return "";
    return asString.replace(/^\/+|\/+$/g, "");
}

function normalizeMeetingId(value) {
    return String(value ?? "").trim();
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
    const avatarKey =
        typeof profile.avatarKey === "string" ? profile.avatarKey.trim() : "";
    const avatarUrl = avatarKey
        ? `${window.location.origin}/api/v1/files/${avatarKey
              .split("/")
              .map((part) => encodeURIComponent(part))
              .join("/")}`
        : "";
    return {
        handle,
        displayName: displayName || handle || "Cognis User",
        email,
        avatarKey: avatarKey ?? null,
        avatarUrl,
    };
}

function createParticipantAvatarEl({ username, displayName, avatarKey }) {
    const wrapper = document.createElement("div");
    wrapper.className = "jitsi-participant-avatar";
    wrapper.setAttribute("draggable", "true");
    wrapper.setAttribute("data-username", username);
    wrapper.setAttribute("role", "listitem");
    const labelText = displayName || username;
    wrapper.innerHTML = buildProfileAvatarMarkup({
        avatarKey,
        label: labelText,
        colorSeed: username,
        avatarClass: "jitsi-participant-avatar-link",
        imageClass: "jitsi-participant-avatar-img",
        fallbackClass: "jitsi-participant-avatar-bubble",
        profileHandle: username,
    });

    const label = document.createElement("span");
    label.className = "jitsi-participant-avatar-label";
    label.textContent = `@${username}`;

    wrapper.appendChild(label);
    return wrapper;
}

function createChatParticipantAvatarButton({
    username,
    displayName,
    avatarKey,
    selected,
}) {
    const participantButton = document.createElement("button");
    participantButton.type = "button";
    participantButton.className = "jitsi-chat-participant-item";
    if (selected) {
        participantButton.classList.add("active");
    }
    participantButton.setAttribute("role", "listitem");
    participantButton.dataset.username = username;
    participantButton.setAttribute(
        "aria-label",
        displayName ? `${displayName} (@${username})` : `@${username}`,
    );
    participantButton.title = displayName
        ? `${displayName} (@${username})`
        : `@${username}`;
    participantButton.setAttribute("aria-pressed", selected ? "true" : "false");
    participantButton.innerHTML = buildProfileAvatarMarkup({
        avatarKey,
        label: displayName || username,
        colorSeed: username,
        avatarClass: "jitsi-chat-participant-avatar",
        imageClass: "jitsi-chat-participant-avatar-img",
        fallbackClass: "jitsi-chat-participant-avatar-bubble",
    });
    return participantButton;
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
    const messageUiResources = await loadMessageUiResources();
    for (const stylesheetUrl of messageUiResources.stylesheetUrls) {
        ensureStylesheetLoaded(stylesheetUrl);
    }
    const i18n = await createI18n({
        componentStringBaseUrls: messageUiResources.languageBaseUrls,
    });
    const messageReactions =
        (await loadMessageReactionsController(
            messageUiResources,
            i18n,
            async () => {
                await refreshNativeChat();
            },
        )) ?? NULL_MESSAGE_REACTIONS_CONTROLLER;
    applyDocumentTitle(i18n, "module.jitsi_meet.page_title");
    signal?.addEventListener(
        "abort",
        () => {
            messageReactions.hideReactionHoverPopup();
            messageReactions.destroy();
        },
        { once: true },
    );

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
        chatMode: "meeting",
        privateChatUsername: "",
        lastMeetingChatRoomId: "",
        lastMeetingParticipants: [],
        currentProfile: null,
        preflightStatus: "idle",
        preflightPassed: false,
        preflightMessage: "",
        preflightNeedsConfig: false,
        sessionId: ensureSessionId(),
        requestedMeetingId: normalizeMeetingId(
            new URL(window.location.href).searchParams.get("meetingId"),
        ),
        activeMeetings: [],
        activeMeetingsRefreshTimer: null,
        dragUsername: null,
        jitsiApi: null,
        jitsiParticipantId: "",
        jitsiModerator: false,
        jitsiThemeMode: resolveThemeMode(),
        alonePromptMeetingId: "",
        alonePromptDismissedMeetingId: "",
        alonePromptBlockedUntil: 0,
        recoveringMeetingSession: false,
    };

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

    if (signal) {
        root.addEventListener("error", handleProfileAvatarError, {
            capture: true,
            signal,
        });
        signal.addEventListener("abort", () => {
            clearTimers();
            stopActiveMeetingsPolling();
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
        messageReactions.hideReactionHoverPopup();
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
                const body = renderMarkdown(
                    String(message?.text ?? i18n.t("ui.reuse.unknown")),
                    { softBreaks: true },
                );
                return `<article class="${messageClass}">
              <header class="jitsi-chat-message-head">
                <strong>${escapeHtml(sender)}</strong>
                <time>${escapeHtml(safeTime)}</time>
              </header>
              <div class="jitsi-chat-message-body">${body}</div>
              ${messageReactions.renderReactionRow(message)}
            </article>`;
            })
            .join("");
    }

    async function toggleReaction(roomId, messageId, emoji) {
        await messageReactions.toggleReaction(roomId, messageId, emoji);
    }

    async function openEmojiPickerPopup(roomId, messageId) {
        await messageReactions.openEmojiPickerPopup(roomId, messageId);
    }

    function clearNativeChatThread() {
        const chatThread = root.querySelector("#jitsi-chat-thread");
        if (chatThread instanceof HTMLElement) {
            chatThread.replaceChildren();
        }
    }

    function setNativeChatReady(ready) {
        const chatPane = root.querySelector(".jitsi-chat-pane");
        const chatThread = root.querySelector("#jitsi-chat-thread");
        const chatForm = root.querySelector("#jitsi-chat-form");
        const chatInput = root.querySelector("#jitsi-chat-input");
        if (chatPane instanceof HTMLElement) {
            chatPane.classList.toggle("jitsi-chat-disabled", !ready);
            chatPane.setAttribute("aria-disabled", String(!ready));
        }
        if (chatThread instanceof HTMLElement) {
            chatThread.setAttribute("aria-busy", String(!ready));
        }
        if (chatForm instanceof HTMLFormElement) {
            chatForm.hidden = !ready;
        }
        if (chatInput instanceof HTMLTextAreaElement) {
            chatInput.disabled = !ready;
        }
    }

    function applyActiveChatRoom(roomId) {
        if (state.chatRoomId === roomId) return;
        state.chatRoomId = roomId;
        state.chatRoomKey = null;
        stopNativeChatPolling();
    }

    function resolveParticipantChatEntries() {
        if (!state.meeting?.id) return [];
        const localHandle = normalizeUsername(
            state.currentProfile?.handle ?? "",
        );
        return Array.from(
            new Set(
                state.lastMeetingParticipants
                    .map((entry) => normalizeUsername(entry))
                    .filter(Boolean)
                    .filter((entry) => entry !== localHandle),
            ),
        )
            .map((username) => {
                const participant = state.allParticipants.find(
                    (entry) => normalizeUsername(entry?.username) === username,
                );
                return {
                    username,
                    displayName: participant?.displayName || username,
                    avatarKey: participant?.avatarKey ?? null,
                };
            })
            .sort((left, right) => left.username.localeCompare(right.username));
    }

    function renderChatParticipantStrip() {
        const strip = root.querySelector("#jitsi-chat-participant-strip");
        const returnButton = root.querySelector("#jitsi-chat-return-btn");
        const heading = root.querySelector("#jitsi-chat-heading");
        if (!(strip instanceof HTMLElement)) {
            return;
        }
        const entries = resolveParticipantChatEntries();
        const privateParticipant = entries.find(
            (entry) => entry.username === state.privateChatUsername,
        );
        if (heading instanceof HTMLElement) {
            if (state.chatMode === "private" && privateParticipant) {
                const privateHeadingTemplate = i18n.t(
                    "module.jitsi_meet.chat.heading_private",
                );
                heading.textContent = privateHeadingTemplate.replace(
                    "{{displayName}}",
                    privateParticipant.displayName,
                );
            } else {
                heading.textContent = i18n.t("module.jitsi_meet.chat.heading");
            }
        }
        strip.hidden = entries.length === 0;
        strip.replaceChildren(
            ...entries.map((entry) =>
                createChatParticipantAvatarButton({
                    ...entry,
                    selected:
                        state.chatMode === "private" &&
                        state.privateChatUsername === entry.username,
                }),
            ),
        );
        void hydrateProfileAvatars(strip);
        if (returnButton instanceof HTMLButtonElement) {
            returnButton.hidden =
                state.chatMode !== "private" || !state.lastMeetingChatRoomId;
            returnButton.disabled = !state.lastMeetingChatRoomId;
        }
    }

    async function activateMeetingChat() {
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        applyActiveChatRoom(state.lastMeetingChatRoomId);
        renderChatParticipantStrip();
        await refreshNativeChat();
        startNativeChatPolling();
    }

    async function activatePrivateChatForParticipant(username) {
        const normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername) {
            console.warn(
                "[jitsi-meet] invalid participant username for private chat",
                {
                    operation: "open_private_chat",
                    rawUsername: username,
                },
            );
            showToast(
                i18n.t("module.jitsi_meet.chat.private_open_unavailable"),
                {
                    variant: "warning",
                },
            );
            return;
        }
        const response = await apiFetch("/api/v1/messages/rooms", {
            method: "POST",
            body: JSON.stringify({
                handles: [normalizedUsername],
            }),
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const errorCode = String(payload?.error?.code ?? "").trim();
            const errorMessageKey =
                response.status === 401 ||
                response.status === 403 ||
                errorCode === "forbidden"
                    ? "module.jitsi_meet.chat.private_open_forbidden"
                    : "module.jitsi_meet.chat.private_open_unavailable";
            console.error("[jitsi-meet] failed to open private chat room", {
                operation: "open_private_chat",
                targetUsername: normalizedUsername,
                status: response.status,
                errorCode,
                errorMessage:
                    typeof payload?.error?.message === "string"
                        ? payload.error.message
                        : null,
            });
            showToast(i18n.t(errorMessageKey), {
                variant: "error",
            });
            return;
        }
        const payload = await response.json().catch(() => ({ data: null }));
        const roomId = normalizeChatRoomId(payload?.data?.id);
        if (!roomId) {
            console.error(
                "[jitsi-meet] private chat room response missing room id",
                {
                    operation: "open_private_chat",
                    targetUsername: normalizedUsername,
                    payload,
                },
            );
            showToast(
                i18n.t("module.jitsi_meet.chat.private_open_invalid_response"),
                {
                    variant: "error",
                },
            );
            return;
        }
        state.chatMode = "private";
        state.privateChatUsername = normalizedUsername;
        applyActiveChatRoom(roomId);
        renderChatParticipantStrip();
        await refreshNativeChat();
        startNativeChatPolling();
    }

    async function refreshNativeChat() {
        const roomId = state.chatRoomId;
        if (!roomId) {
            setNativeChatReady(false);
            clearNativeChatThread();
            return;
        }
        const roomKey = await getChatRoomKey(roomId);
        if (!roomKey) {
            setNativeChatReady(false);
            clearNativeChatThread();
            return;
        }
        const response = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=50`,
        );
        if (!response.ok) {
            setNativeChatReady(false);
            clearNativeChatThread();
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
        setNativeChatReady(true);
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
        const meetingChatRoomId = resolveMeetingChatRoomId(state.meeting);
        if (meetingChatRoomId) {
            state.lastMeetingChatRoomId = meetingChatRoomId;
        } else if (state.meeting?.id) {
            state.lastMeetingChatRoomId = "";
        }
        if (Array.isArray(state.meeting?.participants)) {
            state.lastMeetingParticipants = state.meeting.participants.slice();
        }
        if (state.chatMode !== "private") {
            applyActiveChatRoom(state.lastMeetingChatRoomId);
        }
        renderChatParticipantStrip();
        await refreshNativeChat();
        startNativeChatPolling();
    }

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
                button.setAttribute("role", "gridcell");
                button.innerHTML = `
                  <span class="jitsi-active-meeting-avatar" style="--initials-bg: ${escapeHtml(badgeColor)}">${escapeHtml(
                      badgeInitials,
                  )}</span>
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
        if (!isMeetingActive()) return;
        await keepPresenceAlive(false).catch(() => undefined);
        clearTimers();
        closeMeetingEmbed();
        state.alonePromptMeetingId = "";
        state.alonePromptDismissedMeetingId = "";
        state.alonePromptBlockedUntil = 0;
        state.meeting = null;
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        state.lastMeetingParticipants = [];
        stopNativeChatPolling();
        await updateNativeChat();
    }

    async function joinMeetingById(meetingId) {
        const normalizedMeetingId = normalizeMeetingId(meetingId);
        if (!normalizedMeetingId) return;
        if (isMeetingActive() && state.meeting?.id === normalizedMeetingId) {
            return;
        }
        updateOverlay({
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
            },
        );
        if (!getResponse.ok) {
            state.meeting = null;
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.meeting_closed"),
                canStart: false,
                showAuth: false,
                showReclaim: false,
                visible: true,
            });
            return;
        }
        const meetingPayload = await getResponse
            .json()
            .catch(() => ({ data: null }));
        if (!meetingPayload?.data?.id || meetingPayload?.data?.state?.endedAt) {
            state.meeting = null;
            updateOverlay({
                message: i18n.t("module.jitsi_meet.overlay.meeting_closed"),
                canStart: false,
                showAuth: false,
                showReclaim: false,
                visible: true,
            });
            return;
        }
        if (isMeetingActive() && state.meeting?.id !== normalizedMeetingId) {
            await switchAwayFromActiveMeeting();
        }
        if (state.meeting?.id !== meetingPayload.data.id) {
            state.alonePromptMeetingId = "";
            state.alonePromptDismissedMeetingId = "";
            state.alonePromptBlockedUntil = 0;
        }
        state.meeting = meetingPayload.data;
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        await updateNativeChat();
        const joinState = await joinMeeting();
        if (joinState?.trackingAllowed) {
            ensureMeetingTracking();
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
            updateOverlay({
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
            state.jitsiModerator = false;
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
        state.alonePromptMeetingId = "";
        state.alonePromptDismissedMeetingId = "";
        state.alonePromptBlockedUntil = 0;
        state.meeting = null;
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        state.lastMeetingParticipants = [];
        stopNativeChatPolling();
        resetParticipantSelection();
        renderParticipants();
        await updateNativeChat();
        void loadActiveMeetings({ resolveRequested: false });
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
        honorMeetingClosed = true,
        reportTerminated = false,
    }) {
        const leaveState = await keepPresenceAlive(false, {
            terminated: reportTerminated,
        }).catch(() => null);
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
            !isMeetingActive() ||
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
                updateOverlay({
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
        updateOverlay({
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
                createParticipantAvatarEl(entry),
            ),
        );
        void hydrateProfileAvatars(availablePool);

        const stagedEntries = isMeetingActive()
            ? []
            : state.selectedParticipants;
        stagedArea.replaceChildren(
            ...stagedEntries.map((entry) => createParticipantAvatarEl(entry)),
        );
        void hydrateProfileAvatars(stagedArea);

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
        renderActiveMeetings();
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
        state.meeting.state = latestState;
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
        if (updateAloneParticipantPrompt(payload?.data?.activeParticipants)) {
            return;
        }
    }

    async function keepPresenceAlive(
        active = true,
        { terminated = false } = {},
    ) {
        if (!state.meeting?.id) return null;
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/presence",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    meetingId: state.meeting.id,
                    sessionId: state.sessionId,
                    active,
                    terminated,
                }),
            },
        );
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

    function getParticipantId(candidate) {
        return String(candidate?.id ?? candidate?.participantId ?? "").trim();
    }

    function getParticipantRole(candidate) {
        return String(candidate?.role ?? "")
            .trim()
            .toLowerCase();
    }

    function getLocalParticipantInfo(apiInstance) {
        if (
            !apiInstance ||
            typeof apiInstance.getParticipantsInfo !== "function"
        ) {
            return null;
        }
        const participants = apiInstance.getParticipantsInfo();
        if (!Array.isArray(participants)) return null;
        return (
            participants.find((participant) => participant?.local === true) ??
            participants.find(
                (participant) =>
                    state.jitsiParticipantId &&
                    getParticipantId(participant) === state.jitsiParticipantId,
            ) ??
            null
        );
    }

    function executeJitsiCommandIfSupported(apiInstance, command, ...args) {
        if (!apiInstance || typeof apiInstance.executeCommand !== "function") {
            return;
        }
        if (typeof apiInstance.getSupportedCommands === "function") {
            const supportedCommands = apiInstance.getSupportedCommands();
            if (
                Array.isArray(supportedCommands) &&
                !supportedCommands.includes(command)
            ) {
                return;
            }
        }
        apiInstance.executeCommand(command, ...args);
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

    function currentUserIsJitsiModerator(apiInstance) {
        if (state.jitsiModerator) return true;
        if (
            apiInstance &&
            typeof apiInstance.isParticipantModerator === "function"
        ) {
            try {
                return apiInstance.isParticipantModerator() === true;
            } catch (error) {
                console.warn(
                    "[jitsi-meet] failed to check Jitsi moderator status:",
                    error,
                );
                return false;
            }
        }
        return (
            getParticipantRole(getLocalParticipantInfo(apiInstance)) ===
            "moderator"
        );
    }

    function recoverMeetingSessionAfterComposerRender() {
        if (state.recoveringMeetingSession || !isMeetingEmbedMissing()) return;
        const staleApi = state.jitsiApi;
        state.jitsiApi = null;
        state.jitsiParticipantId = "";
        state.jitsiModerator = false;
        try {
            staleApi?.dispose?.();
        } catch (error) {
            console.warn(
                "[jitsi-meet] failed to dispose stale meeting session during recovery:",
                error,
            );
        }
        state.recoveringMeetingSession = true;
        void joinMeeting()
            .catch(() => {
                showToast(i18n.t("module.jitsi_meet.overlay.join_failed"), {
                    variant: "error",
                });
            })
            .finally(() => {
                state.recoveringMeetingSession = false;
                renderParticipants();
            });
    }

    async function openMeetingEmbed() {
        if (!state.meeting?.meetingUrl) return;
        const frame = root.querySelector("#jitsi-meeting-frame");
        if (!(frame instanceof HTMLElement)) return;

        closeMeetingEmbed();
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
                disableDeepLinking: true,
                subject: MEETING_SUBJECT,
                preferredTheme: themeMode,
                toolbarButtons: JITSI_TOOLBAR_BUTTONS,
            },
            userInfo: {
                displayName: state.currentProfile?.displayName ?? "",
                email: state.currentProfile?.email ?? "",
                avatarUrl: state.currentProfile?.avatarUrl ?? "",
            },
        });
        state.jitsiApi = apiInstance;
        state.jitsiParticipantId = "";
        state.jitsiModerator = false;
        state.jitsiThemeMode = themeMode;
        const applyPrivilegedMeetingSettings = () => {
            if (state.jitsiApi !== apiInstance) return;
            if (!currentUserIsJitsiModerator(apiInstance)) return;
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
        const submitMeetingPassword = () => {
            if (state.jitsiApi !== apiInstance || !meetingPassword) return;
            executeJitsiCommandIfSupported(
                apiInstance,
                "password",
                meetingPassword,
            );
        };
        const applyParticipantProfile = () => {
            if (state.jitsiApi !== apiInstance) return;
            if (state.currentProfile?.displayName) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "displayName",
                    state.currentProfile.displayName,
                );
            }
            if (state.currentProfile?.email) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "email",
                    state.currentProfile.email,
                );
            }
            if (state.currentProfile?.avatarUrl) {
                executeJitsiCommandIfSupported(
                    apiInstance,
                    "avatarUrl",
                    state.currentProfile.avatarUrl,
                );
            }
        };
        const handleMeetingLeft = () => {
            if (state.jitsiApi !== apiInstance) return;
            void handleMeetingExit({
                fallbackOverlayMessageKey:
                    "module.jitsi_meet.overlay.meeting_left",
                honorMeetingClosed: false,
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
        const handleMeetingTerminated = () => {
            if (state.jitsiApi !== apiInstance) return;
            void handleMeetingExit({
                fallbackOverlayMessageKey:
                    "module.jitsi_meet.overlay.meeting_closed",
                forceClosedOverlay: true,
                reportTerminated: true,
            });
        };
        apiInstance.addEventListener("videoConferenceJoined", (event) => {
            state.jitsiParticipantId = getParticipantId(event);
            state.jitsiModerator = currentUserIsJitsiModerator(apiInstance);
            applyParticipantProfile();
            applyPrivilegedMeetingSettings();
        });
        apiInstance.addEventListener("participantRoleChanged", (event) => {
            const participantId = getParticipantId(event);
            if (participantId && participantId !== state.jitsiParticipantId)
                return;
            state.jitsiModerator = getParticipantRole(event) === "moderator";
            applyPrivilegedMeetingSettings();
        });
        apiInstance.addEventListener("passwordRequired", () => {
            deferAloneParticipantPrompt();
            submitMeetingPassword();
            applyPrivilegedMeetingSettings();
        });
        apiInstance.addEventListener("notificationTriggered", (event) => {
            if (!isMeetingTerminatedNotice(event)) return;
            handleMeetingTerminated();
        });
        apiInstance.addEventListener("errorOccurred", (event) => {
            if (!isMeetingTerminatedNotice(event)) return;
            handleMeetingTerminated();
        });
        apiInstance.addEventListener("videoConferenceLeft", handleMeetingLeft);
        apiInstance.addEventListener("readyToClose", handleMeetingLeft);
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
        deferAloneParticipantPrompt();
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
        state.chatMode = "meeting";
        state.privateChatUsername = "";
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
        void loadActiveMeetings({ resolveRequested: false });
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
        recoverMeetingSessionAfterComposerRender();
        const container = root;

        const findButton = container.querySelector(
            "#jitsi-find-participants-btn",
        );
        const startButton = container.querySelector("#jitsi-start-btn");
        const authButton = container.querySelector("#jitsi-auth-btn");
        const reclaimButton = container.querySelector("#jitsi-reclaim-btn");
        const chatForm = container.querySelector("#jitsi-chat-form");
        const chatInput = container.querySelector("#jitsi-chat-input");
        const chatThread = container.querySelector("#jitsi-chat-thread");
        const chatParticipantStrip = container.querySelector(
            "#jitsi-chat-participant-strip",
        );
        const chatReturnButton = container.querySelector(
            "#jitsi-chat-return-btn",
        );
        const activeMeetingsEl = container.querySelector(
            "#jitsi-active-meetings",
        );

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
                                    avatarKey:
                                        typeof result?.avatarKey === "string"
                                            ? result.avatarKey
                                            : null,
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

        if (activeMeetingsEl instanceof HTMLElement) {
            activeMeetingsEl.addEventListener(
                "click",
                (event) => {
                    const button = event.target.closest(
                        ".jitsi-active-meeting-item[data-meeting-id]",
                    );
                    if (!(button instanceof HTMLButtonElement)) return;
                    const meetingId = normalizeMeetingId(
                        button.dataset.meetingId,
                    );
                    if (!meetingId) return;
                    void joinMeetingById(meetingId);
                },
                { signal: bindSignal },
            );
        }

        if (chatParticipantStrip instanceof HTMLElement) {
            chatParticipantStrip.addEventListener(
                "click",
                (event) => {
                    const button = event.target.closest(
                        ".jitsi-chat-participant-item[data-username]",
                    );
                    if (!(button instanceof HTMLButtonElement)) return;
                    const username = normalizeUsername(button.dataset.username);
                    if (!username) return;
                    void activatePrivateChatForParticipant(username);
                },
                { signal: bindSignal },
            );
        }

        if (chatReturnButton instanceof HTMLButtonElement) {
            chatReturnButton.addEventListener(
                "click",
                () => {
                    if (!state.lastMeetingChatRoomId) return;
                    void activateMeetingChat();
                },
                { signal: bindSignal },
            );
        }

        if (chatThread instanceof HTMLElement) {
            chatThread.addEventListener(
                "click",
                async (clickEvent) => {
                    messageReactions.hideReactionHoverPopup();
                    const moreButton = clickEvent.target.closest(
                        "[data-reaction-more]",
                    );
                    if (moreButton instanceof HTMLButtonElement) {
                        const messageId =
                            moreButton.getAttribute("data-message-id");
                        const roomId = state.chatRoomId;
                        if (messageId && roomId) {
                            await openEmojiPickerPopup(roomId, messageId);
                        }
                        return;
                    }
                    const reactionButton = clickEvent.target.closest(
                        "[data-message-id][data-emoji]",
                    );
                    if (!(reactionButton instanceof HTMLButtonElement)) {
                        return;
                    }
                    const roomId = state.chatRoomId;
                    const messageId =
                        reactionButton.getAttribute("data-message-id");
                    const emoji = reactionButton.getAttribute("data-emoji");
                    if (!roomId || !messageId || !emoji) return;
                    if (
                        reactionButton.classList.contains(
                            "messages-reaction-add-btn",
                        )
                    ) {
                        messageReactions.recordEmojiUsage(emoji);
                    }
                    await toggleReaction(roomId, messageId, emoji);
                },
                { signal: bindSignal },
            );
            chatThread.addEventListener(
                "mouseover",
                (mouseEvent) => {
                    const hoveredElement = mouseEvent.target;
                    if (!(hoveredElement instanceof Element)) return;
                    const reactionChipButton = hoveredElement.closest(
                        ".messages-reaction-chip",
                    );
                    if (!(reactionChipButton instanceof HTMLButtonElement))
                        return;
                    const relatedElement = mouseEvent.relatedTarget;
                    if (
                        relatedElement instanceof Element &&
                        reactionChipButton.contains(relatedElement)
                    ) {
                        return;
                    }
                    messageReactions.showReactionHoverPopup(reactionChipButton);
                },
                { signal: bindSignal },
            );
            chatThread.addEventListener(
                "mouseout",
                (mouseEvent) => {
                    const originElement = mouseEvent.target;
                    if (!(originElement instanceof Element)) return;
                    const reactionChipButton = originElement.closest(
                        ".messages-reaction-chip",
                    );
                    if (!(reactionChipButton instanceof HTMLButtonElement))
                        return;
                    const relatedElement = mouseEvent.relatedTarget;
                    if (
                        relatedElement instanceof Element &&
                        reactionChipButton.contains(relatedElement)
                    ) {
                        return;
                    }
                    messageReactions.hideReactionHoverPopup();
                },
                { signal: bindSignal },
            );
            chatThread.addEventListener(
                "focusin",
                (focusEvent) => {
                    const focusedElement = focusEvent.target;
                    if (!(focusedElement instanceof Element)) return;
                    const reactionChipButton = focusedElement.closest(
                        ".messages-reaction-chip",
                    );
                    if (!(reactionChipButton instanceof HTMLButtonElement))
                        return;
                    messageReactions.showReactionHoverPopup(reactionChipButton);
                },
                { signal: bindSignal },
            );
            chatThread.addEventListener(
                "focusout",
                (focusEvent) => {
                    const blurredElement = focusEvent.target;
                    if (!(blurredElement instanceof Element)) return;
                    const reactionChipButton = blurredElement.closest(
                        ".messages-reaction-chip",
                    );
                    if (!(reactionChipButton instanceof HTMLButtonElement))
                        return;
                    const nextFocusedElement = focusEvent.relatedTarget;
                    if (
                        nextFocusedElement instanceof Element &&
                        reactionChipButton.contains(nextFocusedElement)
                    ) {
                        return;
                    }
                    messageReactions.hideReactionHoverPopup();
                },
                { signal: bindSignal },
            );
            window.addEventListener(
                "resize",
                () => {
                    messageReactions.repositionReactionHoverPopup();
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

        const syncJitsiTheme = () => {
            const nextThemeMode = resolveThemeMode();
            if (nextThemeMode === state.jitsiThemeMode) return;
            state.jitsiThemeMode = nextThemeMode;
            if (!state.jitsiApi) return;
            executeJitsiCommandIfSupported(state.jitsiApi, "overwriteConfig", {
                preferredTheme: nextThemeMode,
            });
        };
        const themeObserver = new MutationObserver(syncJitsiTheme);
        themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ["data-theme", "class"],
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme", "class"],
        });
        const appShell = document.querySelector(".app-shell");
        if (appShell instanceof HTMLElement) {
            themeObserver.observe(appShell, {
                attributes: true,
                attributeFilter: ["data-theme", "class"],
            });
        }
        signal?.addEventListener("abort", () => themeObserver.disconnect(), {
            once: true,
        });
        window.addEventListener("storage", syncJitsiTheme, {
            signal: bindSignal,
        });

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
                    deferAloneParticipantPrompt();
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

        const leaveAloneButton = container.querySelector(
            "#jitsi-leave-alone-btn",
        );
        const remainAloneButton = container.querySelector(
            "#jitsi-remain-alone-btn",
        );

        if (leaveAloneButton instanceof HTMLButtonElement) {
            leaveAloneButton.addEventListener(
                "click",
                async () => {
                    state.alonePromptMeetingId = "";
                    state.alonePromptDismissedMeetingId = "";
                    await resetMeetingState({
                        overlayMessageKey:
                            "module.jitsi_meet.overlay.meeting_left",
                    });
                },
                { signal: bindSignal },
            );
        }

        if (remainAloneButton instanceof HTMLButtonElement) {
            remainAloneButton.addEventListener(
                "click",
                () => {
                    state.alonePromptDismissedMeetingId =
                        state.meeting?.id ?? "";
                    state.alonePromptMeetingId = "";
                    updateOverlay({
                        message: i18n.t("module.jitsi_meet.overlay.in_meeting"),
                        canStart: false,
                        showAuth: false,
                        showReclaim: false,
                        showAlonePrompt: false,
                        visible: false,
                    });
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
                    void loadActiveMeetings({ resolveRequested: false });
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
                default: [7, 5],
                min: [6, 4],
            },
            render: () => buildStageMarkup(i18n),
        },
        {
            id: "jitsi-chat",
            label: i18n.t("module.jitsi_meet.chat.heading"),
            pinned: true,
            gridSize: {
                default: [3, 5],
                min: [3, 4],
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
            avatarKey:
                typeof entry?.avatarKey === "string" ? entry.avatarKey : null,
        }))
        .filter((entry) => Boolean(entry.username))
        .sort((a, b) => a.username.localeCompare(b.username));
    state.availableParticipants = state.allParticipants.map((entry) => ({
        ...entry,
    }));

    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements,
        preferenceKey: "meetings-layout-v3",
        i18n,
        pageContext: {
            title: i18n.t("ui.reuse.meetings"),
            subtitle: i18n.t("module.jitsi_meet.page.subtitle"),
        },
        persistLayoutPreferences: true,
        onRender: bindInteractiveHandlers,
    });

    await composer.init();
    await loadActiveMeetings({ resolveRequested: true });
    startActiveMeetingsPolling();
    await runPreflightCheck();
}

await mountWhenDirect(async (root) => {
    const mountController = new AbortController();
    await mount(root, { signal: mountController.signal });
}).catch((error) => {
    console.error(error);
});
