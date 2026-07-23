import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { registerSearchIndex } from "/static/reuse/search-bar.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { showToast } from "/static/reuse/toast.js";
import { handleProfileAvatarError } from "/static/gateways/social/reuse/profile-avatar.js";
import { normalizeUsername } from "/static/reuse/value-normalizers.js";
import {
    getShareContext,
    ensureFullAccountSession,
} from "/static/reuse/auth-session.js";
import { ensureSessionId } from "./session.js";
import { buildMeetingJoinUrl, resolveThemeMode } from "./meeting-embed.js";
import {
    buildChatMarkup,
    buildParticipantsMarkup,
    buildStageMarkup,
} from "./markup.js";
import {
    ensureStylesheetLoaded,
    fetchCurrentProfile,
    fetchParticipants,
    loadMessageReactionsController,
    loadMessageUiResources,
    normalizeMeetingId,
} from "./jitsi-helpers.js";
import { createChatHandlers } from "./jitsi-chat.js";
import { createMeetingHandlers } from "./jitsi-meetings.js";
import { createPreflightHandlers } from "./jitsi-preflight.js";
import { createEmbedHandlers } from "./jitsi-embed.js";
import { createMountUtilities } from "./jitsi-mount-utils.js";
import { bindShareButton } from "./share-button.js";

const JITSI_MEET_CHAT_REACTIONS_ENABLED = false;

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
/**
 * Mounts the Meetings page inside the dashboard shell and wires all runtime
 * interactions (participant selection, meeting lifecycle polling, and chat
 * embed updates). The optional AbortSignal is used by the SPA router to clean
 * up timers and event listeners when users navigate away.
 *
 * When the page is loaded inside a share context (detected via getShareContext()),
 * the shell chrome (topbar, navbar, footer) is hidden and the share button is
 * suppressed — no explicit `embedded` or `shareEnabled` flags are needed.
 *
 * @param {HTMLElement} root - Page mount root (usually #app).
 * @param {{ signal?: AbortSignal, requestedMeetingId?: string }} [options] - Router lifecycle options.
 * @returns {Promise<void>}
 */
export async function mount(root, { signal, requestedMeetingId = "" } = {}) {
    await ensureFullAccountSession();
    const shareContext = getShareContext();
    const inShareView = shareContext !== null;
    const resolvedMeetingId =
        requestedMeetingId ||
        (inShareView ? String(shareContext?.resourceId ?? "") : "");
    const messageUiResources = await loadMessageUiResources();
    for (const stylesheetUrl of messageUiResources.stylesheetUrls) {
        ensureStylesheetLoaded(stylesheetUrl);
    }
    const i18n = await createI18n({
        componentStringBaseUrls: messageUiResources.languageBaseUrls,
    });
    let refreshNativeChat = async () => undefined;
    let messageReactions = NULL_MESSAGE_REACTIONS_CONTROLLER;
    if (JITSI_MEET_CHAT_REACTIONS_ENABLED) {
        messageReactions =
            (await loadMessageReactionsController(
                messageUiResources,
                i18n,
                async () => {
                    await refreshNativeChat();
                },
            )) ?? NULL_MESSAGE_REACTIONS_CONTROLLER;
    }
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
            resolvedMeetingId ||
                new URL(window.location.href).searchParams.get("meetingId"),
        ),
        activeMeetings: [],
        activeMeetingsRefreshTimer: null,
        dragUsername: null,
        jitsiApi: null,
        jitsiParticipantId: "",
        jitsiConferenceJoined: false,
        jitsiModerator: false,
        jitsiThemeMode: resolveThemeMode(),
        alonePromptMeetingId: "",
        alonePromptDismissedMeetingId: "",
        alonePromptBlockedUntil: 0,
        recoveringMeetingSession: false,
    };

    function collectMeetingSearchGroups() {
        const meetings = [
            ...(Array.isArray(state.activeMeetings)
                ? state.activeMeetings
                : []),
            ...(state.meeting?.id ? [state.meeting] : []),
        ];
        const seenIds = new Set();
        const items = [];
        for (const meeting of meetings) {
            const meetingId = normalizeMeetingId(meeting?.id);
            if (!meetingId || seenIds.has(meetingId)) continue;
            seenIds.add(meetingId);
            const title = String(
                meeting?.meetingName ?? i18n.t("ui.reuse.meeting"),
            ).trim();
            const owner = String(
                meeting?.startedBy?.displayName ??
                    meeting?.startedBy?.username ??
                    meeting?.createdBy ??
                    "",
            ).trim();
            items.push({
                id: `meeting:${meetingId}`,
                label: title,
                description: owner,
                url: `/meetings?meetingId=${encodeURIComponent(meetingId)}`,
                searchText: [
                    title,
                    owner,
                    meeting?.meetingUrl,
                    meeting?.scheduledAt,
                    meeting?.createdAt,
                ]
                    .filter(Boolean)
                    .join(" "),
            });
        }
        return items.length ? [{ category: "Meetings", items }] : [];
    }

    registerSearchIndex("jitsi-meetings", collectMeetingSearchGroups);

    const {
        clearTimers,
        deferAloneParticipantPrompt,
        isMeetingActive,
        isMeetingEmbedMissing,
        resetParticipantSelection,
        selectedUsernames,
        setPreflightStatus,
        syncShareButtonAvailability,
        updateOverlay,
    } = createMountUtilities({ root, state });

    if (signal) {
        root.addEventListener("error", handleProfileAvatarError, {
            capture: true,
            signal,
        });
    }

    const callbacks = {};
    const utils = {
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
    const chatHandlers = createChatHandlers({
        root,
        state,
        i18n,
        apiFetch,
        messageReactions,
    });
    refreshNativeChat = chatHandlers.refreshNativeChat;
    const meetingHandlers = createMeetingHandlers({
        root,
        state,
        i18n,
        apiFetch,
        callbacks,
        utils,
    });
    const preflightHandlers = createPreflightHandlers({
        root,
        state,
        i18n,
        apiFetch,
        callbacks,
        utils,
    });
    const embedHandlers = createEmbedHandlers({
        root,
        state,
        i18n,
        apiFetch,
        callbacks,
        utils,
    });
    Object.assign(
        callbacks,
        chatHandlers,
        meetingHandlers,
        preflightHandlers,
        embedHandlers,
    );

    const {
        activateMeetingChat,
        activatePrivateChatForParticipant,
        encryptChatMessage,
        getChatRoomKey,
        openEmojiPickerPopup,
        stopNativeChatPolling,
        toggleReaction,
        updateNativeChat,
    } = chatHandlers;
    const {
        closeMeetingEmbed,
        joinMeetingById,
        loadActiveMeetings,
        startActiveMeetingsPolling,
        stopActiveMeetingsPolling,
        resetMeetingState,
    } = meetingHandlers;
    const {
        addParticipant,
        applyDrop,
        ensureMeetingTracking,
        executeJitsiCommandIfSupported,
        recoverMeetingSessionAfterComposerRender,
        renderParticipants,
        runPreflightCheck,
    } = preflightHandlers;
    const { openMeetingEmbed, prepareMeetingStart } = embedHandlers;
    if (signal) {
        signal.addEventListener(
            "abort",
            () => {
                clearTimers();
                stopActiveMeetingsPolling();
                closeMeetingEmbed();
            },
            { once: true },
        );
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

        const syncJitsiTheme = (event) => {
            const nextThemeMode = resolveThemeMode(event?.detail?.theme);
            const themeChanged = nextThemeMode !== state.jitsiThemeMode;
            if (!themeChanged && !state.jitsiApi) return;
            state.jitsiThemeMode = nextThemeMode;
            if (!state.jitsiApi) return;
            executeJitsiCommandIfSupported(state.jitsiApi, "overwriteConfig", {
                preferredTheme: nextThemeMode,
            });
            // Jitsi only accepts interfaceConfigOverwrite at API creation, so
            // reload the embed to apply DEFAULT_BACKGROUND to toolbar and
            // participant surfaces when the Cognis theme changes.
            if (themeChanged) void openMeetingEmbed();
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
        window.addEventListener("cognis:themechange", syncJitsiTheme, {
            signal: bindSignal,
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
                        `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages`,
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
        // Share-link guests have no account and cannot search for or start
        // meetings with other participants, so the participant-management
        // panel (participant search, active-meeting list) is guest-facing
        // clutter that doesn't apply to them — it is omitted entirely below
        // rather than rendered empty.
        ...(inShareView
            ? []
            : [
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
              ]),
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
        .sort((left, right) => left.username.localeCompare(right.username));
    state.availableParticipants = state.allParticipants.map((entry) => ({
        ...entry,
    }));

    const composer = createPageComposer(root, {
        allowCustomization: !inShareView,
        elements,
        preferenceKey: "meetings-layout-v3",
        i18n,
        pageContext: {
            title: i18n.t("ui.reuse.meetings"),
            subtitle: i18n.t("module.jitsi_meet.page.subtitle"),
        },
        showTopbar: true,
        showNavbar: !inShareView,
        showFooter: true,
        showThemeToggle: true,
        persistLayoutPreferences: !inShareView,
        frameless: false,
        onRender: (...args) => {
            bindInteractiveHandlers(...args);
            if (!inShareView) {
                bindShareButton({
                    root,
                    signal,
                    state,
                    i18n,
                    deferAloneParticipantPrompt,
                });
            }
        },
    });

    await composer.init();
    if (inShareView && state.requestedMeetingId) {
        await joinMeetingById(state.requestedMeetingId);
    } else {
        await loadActiveMeetings({ resolveRequested: true });
        startActiveMeetingsPolling();
    }
    await runPreflightCheck();
}

await mountWhenDirect(async (root) => {
    const mountController = new AbortController();
    await mount(root, { signal: mountController.signal });
}).catch((error) => {
    console.error(error);
});
