/**
 * Messages page.
 *
 * Layout:
 *   left  — list of rooms with last message preview and unread badge.
 *   right — selected room's message thread + composer.
 *
 * Messages are encrypted client-side with per-room AES-GCM keys resolved from
 * the authenticated user's encrypted keyring and cached for the page lifetime.
 */

import { bindCapability } from "/static/reuse/capabilities.js";
import { guides } from "./guides.js";

import { messagesFetch as apiFetch } from "./offline-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { applyDocumentTitle } from "/static/reuse/i18n.js";
import {
    createFormDraftManager,
    createPageComposer,
} from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openSearchPopup } from "/static/reuse/search-util/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    fetchEmojiUsage,
    loadAllEmojis,
    recordEmojiUsage,
} from "./emoji-helpers.js";
import { createMessageTemplatesUi } from "./template-ui.js";
import {
    normalizeReactionEmoji,
    resolveMessageStyle,
} from "./message-utils.js";
import {
    hideAllMessageHoverPopups,
    hideReactionHoverPopup,
    hideReadReceiptHoverPopup,
    openReactionDetailsPopup,
    parseEncodedPayload,
    renderComposerPreviewMarkup,
    renderThread,
    repositionReactionHoverPopup,
    showReactionHoverPopup,
    showReadReceiptHoverPopup,
    formatRoomListAvatar,
} from "./message-render.js";
import { resolveMessageTemplateVariables } from "./message-templates.js";
import { createMessageSender } from "./send-message.js";
import { createMessagesRoomState } from "./room-state.js";
import { renderRoomList, renderConversationPrompt } from "./room-render.js";
import { renderMessagesSidebar } from "./sidebar.js";
import { activateRoomAction, resolveRoomActions } from "./flows.js";
import {
    LAST_OPENED_ROOM_KEY,
    LIVE_REFRESH_INTERVAL_MS as LIVE_REFRESH_INTERVAL_MILLISECONDS,
    TYPING_IDLE_RESET_MS as TYPING_IDLE_RESET_MILLISECONDS,
    TYPING_SEND_DEBOUNCE_MS as TYPING_SEND_DEBOUNCE_MILLISECONDS,
    TYPING_TTL_SECONDS,
} from "./runtime-config.js";
import {
    getRoomKey,
    createMessagesI18n,
    handleProfileAvatarError,
    hydrateProfileAvatars,
    requireRoomKey,
    resolveThreadRoomKey,
} from "./runtime-bridges.js";

const log = bindCapability("ui:log");

export async function mount(root, { signal } = {}) {
    const i18n = await createMessagesI18n();
    if (signal?.aborted) return;
    applyDocumentTitle(i18n, "ui.reuse.messages");

    const {
        captureFormState,
        restoreFormState,
        loadPersistedFormState,
        savePersistedFormState,
        clearPersistedFormState,
    } = createFormDraftManager({
        FORM_DRAFT_STORAGE_PREFIX: "cognis_messages_draft",
        // The messages composer has a single textarea; the large-form reset
        // button is never relevant, so the threshold is set above any realistic
        // field count to suppress it entirely.
        LARGE_FORM_RESET_FIELD_THRESHOLD: Number.MAX_SAFE_INTEGER,
        i18n,
    });

    root.classList.add("messages-page");
    root.dataset.messageStyle = resolveMessageStyle();
    root.addEventListener("error", handleProfileAvatarError, {
        capture: true,
        signal,
    });
    signal?.addEventListener(
        "abort",
        () => {
            root.classList.remove("messages-page");
            delete root.dataset.messageStyle;
        },
        { once: true },
    );

    const currentAccountId = localStorage.getItem("cognis_account") ?? "";
    const initialPath = window.location.pathname;
    const initialRoomMatch = initialPath.match(/^\/messages\/([^/]+)$/);
    const rememberedRoomId = localStorage.getItem(LAST_OPENED_ROOM_KEY);
    const initialSelectedRoomId = initialRoomMatch
        ? decodeURIComponent(initialRoomMatch[1])
        : rememberedRoomId;

    let composerInputReference = null;

    let syncOpenRoomPreviews = () => {};

    const roomState = createMessagesRoomState({
        i18n,
        currentAccountId,
        initialSelectedRoomId,
        getRoomKey,
        requireRoomKey,
        resolveThreadRoomKey,
        lastOpenedRoomKey: LAST_OPENED_ROOM_KEY,
        typingTtlSeconds: TYPING_TTL_SECONDS,
        typingIdleResetMs: TYPING_IDLE_RESET_MILLISECONDS,
        typingSendDebounceMs: TYPING_SEND_DEBOUNCE_MILLISECONDS,
        liveRefreshIntervalMs: LIVE_REFRESH_INTERVAL_MILLISECONDS,
        onRoomOpened: async (room) => {
            syncOpenRoomPreviews();
            const openedRoomId = room?.id != null ? String(room.id) : null;
            if (openedRoomId) {
                const persistedState = loadPersistedFormState(openedRoomId);
                restoreFormState(root, persistedState);
                // When no draft exists, restoreFormState is a no-op and the
                // textarea retains the previous room's text. Clear it explicitly
                // so stale content is never saved under the new room's draft key
                // when the synthetic input event fires below.
                // composerInputRef may be null before the first onRender fires;
                // the instanceof guard safely skips the clear in that case
                // (lines 294-297 below, where composerInputRef is assigned).
                if (
                    persistedState.size === 0 &&
                    composerInputReference instanceof HTMLTextAreaElement
                ) {
                    composerInputReference.value = "";
                }
                // Dispatch a synthetic input event so dependent UI state
                // (preview rendering, character counters, typing indicators)
                // is updated after the draft value is restored programmatically.
                composerInputReference?.dispatchEvent(new Event("input"));
            }
        },
        resolveRoomActions,
        onRoomAction: async (room, action) => {
            try {
                await activateRoomAction(action, room, { signal });
            } catch (error) {
                void log("error", "[messages] VoIP call action failed", {
                    component: "social-messages",
                    operation: "start_voip_call",
                    roomId: roomState.getSelectedRoomId(),
                    error,
                });
                showToast(i18n.t("ui.reuse.error"), {
                    variant: "error",
                });
            }
        },
    });

    let pageReady = false;
    let refreshAfterKeyringUnlock = false;
    const refreshDecryptedContent = async () => {
        if (!pageReady) {
            refreshAfterKeyringUnlock = true;
            return;
        }
        await roomState.reloadRoomsList();
        await roomState.refreshActiveConversation();
    };
    const roomCallPositions = new Map();
    window.addEventListener(
        "cognis:room-call-state",
        (event) => {
            const roomId = String(event.detail?.roomId ?? "");
            const roomElement = document.querySelector(
                `.messages-room[data-room-id="${CSS.escape(roomId)}"]`,
            );
            if (!roomId || !(roomElement instanceof HTMLElement)) return;
            if (event.detail?.active) {
                if (!roomCallPositions.has(roomId)) {
                    roomCallPositions.set(roomId, roomElement.nextSibling);
                }
                roomElement.parentElement?.prepend(roomElement);
                roomElement.classList.add("messages-room--calling");
                if (roomId === roomState.getSelectedRoomId()) {
                    void roomState.openRoom(roomId);
                }
                return;
            }
            const nextSibling = roomCallPositions.get(roomId);
            if (nextSibling?.parentNode === roomElement.parentNode) {
                roomElement.parentNode.insertBefore(roomElement, nextSibling);
            } else {
                roomElement.parentElement?.append(roomElement);
            }
            roomElement.classList.remove("messages-room--calling");
            roomCallPositions.delete(roomId);
            if (roomId === roomState.getSelectedRoomId()) {
                void roomState.openRoom(roomId);
            }
        },
        { signal },
    );
    window.addEventListener(
        "cognis:call-moved-to-pip",
        (event) => {
            if (event.detail?.roomId !== roomState.getSelectedRoomId()) return;
            void roomState.refreshActiveConversation();
        },
        { signal },
    );
    window.addEventListener(
        "cognis:keyring-event",
        (event) => {
            const refreshAfterUnlock = event.detail?.type === "unlock";
            const refreshAfterRoomKeyWrite =
                event.detail?.type === "write" &&
                String(event.detail?.identifier ?? "").startsWith("chatroom:");
            if (refreshAfterUnlock || refreshAfterRoomKeyWrite) {
                void refreshDecryptedContent();
            }
        },
        { signal },
    );

    await Promise.all([loadAllEmojis(), fetchEmojiUsage(apiFetch)]);
    await roomState.loadInitialRooms();
    if (signal?.aborted) return;

    const resolveSelectedRoomTemplateContent = (content) =>
        resolveMessageTemplateVariables(
            content,
            roomState.getSelectedRoom(),
            currentAccountId,
        );

    const templateUi = createMessageTemplatesUi({
        i18n,
        currentAccountId,
        resolveTemplateContent: resolveSelectedRoomTemplateContent,
        onUseTemplate: (content) => {
            const composerInput = document.getElementById(
                "messages-composer-input",
            );
            if (composerInput instanceof HTMLTextAreaElement) {
                composerInput.value = content;
                composerInput.dispatchEvent(new Event("input"));
            }
        },
    });

    const sidebarHtml = await renderMessagesSidebar({
        rooms: roomState.getRooms(),
        currentAccountId,
        selectedRoomId: roomState.getSelectedRoomId(),
        i18n,
        formatRoomListAvatar,
        signal,
    });
    if (signal?.aborted) return;

    const messageFormBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "messages-composer",
            formClassName: "messages-composer",
            includeSubmitButton: false,
            fields: [],
            formAttributes: {
                "data-composer-include-form-memory": "true",
            },
            trustedContentHtml: `
            <div class="messages-composer-mode-row">
              <button type="button" class="messages-composer-mode-toggle" id="messages-composer-compose-toggle" aria-pressed="true">${escapeHtml(i18n.t("module.social.messages.compose"))}</button>
              <button type="button" class="messages-composer-mode-toggle" id="messages-composer-preview-toggle" aria-pressed="false">${escapeHtml(i18n.t("module.social.messages.preview"))}</button>
            </div>
            <div class="messages-composer-main">
              <div class="messages-composer-pane messages-composer-pane--compose" id="messages-composer-compose-pane">
                <textarea id="messages-composer-input" class="messages-composer-input" placeholder="${escapeHtml(i18n.t("module.social.messages.placeholder"))}" aria-label="${escapeHtml(i18n.t("module.social.messages.placeholder"))}" rows="2"></textarea>
                <button type="submit" class="messages-composer-send">${escapeHtml(i18n.t("module.social.messages.send"))}</button>
              </div>
              <div id="messages-composer-preview-pane" class="messages-composer-pane messages-composer-pane--preview" hidden>
                <div id="messages-composer-preview" class="messages-composer-preview messages-message-body" aria-live="polite">${renderComposerPreviewMarkup("", i18n.t("module.social.messages.preview_placeholder"))}</div>
              </div>
            </div>
          `,
        },
    );
    const elements = [
        {
            id: "messages-thread",
            label: i18n.t("ui.reuse.messages"),
            gridSize: { default: [12, 8], min: [4, 4], max: "full" },
            render: () =>
                `<section class="messages-thread">
          <div class="messages-thread-topbar" data-composer-header><div id="messages-thread-header-slot"></div></div>
          <div id="messages-request-banner-slot"></div>
          <div class="messages-thread-list" data-composer-viewport-body id="messages-thread-list">${roomState.getSelectedRoomId() ? "" : renderConversationPrompt(i18n)}</div>
          <div class="messages-typing-status" id="messages-typing-status"></div>
          ${messageFormBuilder.render()}
        </section>`,
            onRender: () => {
                const threadList = document.getElementById(
                    "messages-thread-list",
                );
                const form = document.getElementById("messages-composer");
                const composerInput = document.getElementById(
                    "messages-composer-input",
                );
                composerInputReference =
                    composerInput instanceof HTMLTextAreaElement
                        ? composerInput
                        : null;
                const composerSendButton = form?.querySelector(
                    ".messages-composer-send",
                );
                const composerPreview = document.getElementById(
                    "messages-composer-preview",
                );
                const composerComposePane = document.getElementById(
                    "messages-composer-compose-pane",
                );
                const composerPreviewPane = document.getElementById(
                    "messages-composer-preview-pane",
                );
                const composerComposeToggle = document.getElementById(
                    "messages-composer-compose-toggle",
                );
                const composerPreviewToggle = document.getElementById(
                    "messages-composer-preview-toggle",
                );
                let composerMode = "compose";
                const passiveEventOptions = signal ? { signal } : undefined;

                const renderComposerPreview = () => {
                    if (!(composerPreview instanceof HTMLElement)) return;
                    const contentValue =
                        composerInput instanceof HTMLTextAreaElement
                            ? composerInput.value
                            : "";
                    composerPreview.innerHTML = renderComposerPreviewMarkup(
                        resolveSelectedRoomTemplateContent(contentValue),
                        i18n.t("module.social.messages.preview_placeholder"),
                    );
                };

                syncOpenRoomPreviews = () => {
                    renderComposerPreview();
                    templateUi.renderTemplateEditorPreview();
                };

                const syncComposerMode = () => {
                    const isComposeMode = composerMode === "compose";
                    const isPreviewMode = composerMode === "preview";
                    if (composerComposeToggle instanceof HTMLButtonElement) {
                        composerComposeToggle.setAttribute(
                            "aria-pressed",
                            String(isComposeMode),
                        );
                    }
                    if (composerPreviewToggle instanceof HTMLButtonElement) {
                        composerPreviewToggle.setAttribute(
                            "aria-pressed",
                            String(isPreviewMode),
                        );
                    }
                    if (composerComposePane instanceof HTMLElement) {
                        composerComposePane.hidden = !isComposeMode;
                    }
                    if (composerInput instanceof HTMLTextAreaElement) {
                        composerInput.hidden = !isComposeMode;
                    }
                    if (composerSendButton instanceof HTMLButtonElement) {
                        composerSendButton.hidden = !isComposeMode;
                    }
                    if (composerPreviewPane instanceof HTMLElement) {
                        composerPreviewPane.hidden = !isPreviewMode;
                    }
                };

                renderComposerPreview();
                syncComposerMode();

                threadList?.addEventListener(
                    "click",
                    async (clickEvent) => {
                        hideAllMessageHoverPopups();
                        const moreButton = clickEvent.target.closest(
                            "[data-reaction-more]",
                        );
                        if (moreButton instanceof HTMLElement) {
                            const messageId =
                                moreButton.getAttribute("data-message-id");
                            if (messageId)
                                await roomState.openEmojiPickerPopup(messageId);
                            return;
                        }
                        const reactionDetailsButton = clickEvent.target.closest(
                            "[data-reaction-details]",
                        );
                        if (reactionDetailsButton instanceof HTMLElement) {
                            const rawDetailsPayload =
                                reactionDetailsButton.getAttribute(
                                    "data-reaction-details-payload",
                                ) ?? "[]";
                            const parsedDetails =
                                parseEncodedPayload(rawDetailsPayload);
                            await openReactionDetailsPopup(parsedDetails, i18n);
                            return;
                        }
                        const reactionButton = clickEvent.target.closest(
                            "[data-message-id][data-emoji]",
                        );
                        if (
                            reactionButton instanceof HTMLElement &&
                            reactionButton.classList.contains(
                                "messages-reaction-chip",
                            )
                        ) {
                            await roomState.toggleReaction(
                                reactionButton.getAttribute("data-message-id"),
                                reactionButton.getAttribute("data-emoji"),
                            );
                            return;
                        }
                        if (
                            reactionButton instanceof HTMLElement &&
                            reactionButton.classList.contains(
                                "messages-reaction-add-btn",
                            )
                        ) {
                            recordEmojiUsage(
                                apiFetch,
                                reactionButton.getAttribute("data-emoji"),
                                normalizeReactionEmoji,
                            );
                            await roomState.toggleReaction(
                                reactionButton.getAttribute("data-message-id"),
                                reactionButton.getAttribute("data-emoji"),
                            );
                            return;
                        }
                        const loadEarlierButton = clickEvent.target.closest(
                            ".messages-load-earlier-btn",
                        );
                        if (!(loadEarlierButton instanceof HTMLElement)) return;
                        const selectedRoomId = roomState.getSelectedRoomId();
                        if (
                            !selectedRoomId ||
                            !(threadList instanceof HTMLElement)
                        )
                            return;
                        const beforeTime =
                            loadEarlierButton.getAttribute("data-before-time");
                        if (!beforeTime) return;
                        const key = await resolveThreadRoomKey(
                            roomState.getSelectedRoom(),
                            selectedRoomId,
                        );
                        await renderThread(
                            selectedRoomId,
                            key,
                            threadList,
                            i18n,
                            currentAccountId,
                            beforeTime,
                        );
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
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
                        showReactionHoverPopup(reactionChipButton);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
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
                        hideReactionHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "focusin",
                    (focusEvent) => {
                        const focusedElement = focusEvent.target;
                        if (!(focusedElement instanceof Element)) return;
                        const reactionChipButton = focusedElement.closest(
                            ".messages-reaction-chip",
                        );
                        if (!(reactionChipButton instanceof HTMLButtonElement))
                            return;
                        showReactionHoverPopup(reactionChipButton);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
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
                        hideReactionHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "scroll",
                    hideReactionHoverPopup,
                    passiveEventOptions,
                );
                window.addEventListener(
                    "resize",
                    () => {
                        repositionReactionHoverPopup();
                    },
                    { signal },
                );

                threadList?.addEventListener(
                    "mouseover",
                    (mouseEvent) => {
                        const hoveredElement = mouseEvent.target;
                        if (!(hoveredElement instanceof Element)) return;
                        const statusElement = hoveredElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const relatedElement = mouseEvent.relatedTarget;
                        if (
                            relatedElement instanceof Element &&
                            statusElement.contains(relatedElement)
                        ) {
                            return;
                        }
                        const rawReaders =
                            statusElement.getAttribute("data-readers") ?? "[]";
                        const readers = parseEncodedPayload(rawReaders);
                        showReadReceiptHoverPopup(statusElement, readers, i18n);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "mouseout",
                    (mouseEvent) => {
                        const originElement = mouseEvent.target;
                        if (!(originElement instanceof Element)) return;
                        const statusElement = originElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const relatedElement = mouseEvent.relatedTarget;
                        if (
                            relatedElement instanceof Element &&
                            statusElement.contains(relatedElement)
                        ) {
                            return;
                        }
                        hideReadReceiptHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "focusin",
                    (focusEvent) => {
                        const focusedElement = focusEvent.target;
                        if (!(focusedElement instanceof Element)) return;
                        const statusElement = focusedElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const rawReaders =
                            statusElement.getAttribute("data-readers") ?? "[]";
                        const readers = parseEncodedPayload(rawReaders);
                        showReadReceiptHoverPopup(statusElement, readers, i18n);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "focusout",
                    (focusEvent) => {
                        const blurredElement = focusEvent.target;
                        if (!(blurredElement instanceof Element)) return;
                        const statusElement = blurredElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const nextFocusedElement = focusEvent.relatedTarget;
                        if (
                            nextFocusedElement instanceof Element &&
                            statusElement.contains(nextFocusedElement)
                        ) {
                            return;
                        }
                        hideReadReceiptHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "scroll",
                    hideReadReceiptHoverPopup,
                    passiveEventOptions,
                );

                form?.addEventListener(
                    "submit",
                    createMessageSender({
                        roomState,
                        composerInput,
                        currentAccountId,
                        requireRoomKey,
                        clearPersistedFormState,
                        renderComposerPreview,
                        i18n,
                    }),
                );

                composerInput?.addEventListener("input", () => {
                    const hasText = Boolean((composerInput.value ?? "").trim());
                    roomState.queueTypingUpdate(hasText);
                    renderComposerPreview();
                    const selectedRoomId = roomState.getSelectedRoomId();
                    if (selectedRoomId) {
                        savePersistedFormState(
                            selectedRoomId,
                            captureFormState(root, { persistableOnly: true }),
                        );
                    }
                });
                composerInput?.addEventListener("keydown", (keyboardEvent) => {
                    if (
                        keyboardEvent.key === "Enter" &&
                        keyboardEvent.ctrlKey &&
                        !keyboardEvent.shiftKey
                    ) {
                        keyboardEvent.preventDefault();
                        form?.requestSubmit();
                    }
                });
                composerComposeToggle?.addEventListener("click", () => {
                    if (composerInput?.disabled) return;
                    composerMode = "compose";
                    syncComposerMode();
                });
                composerPreviewToggle?.addEventListener("click", () => {
                    if (composerInput?.disabled) return;
                    composerMode = "preview";
                    syncComposerMode();
                    renderComposerPreview();
                });

                const selectedRoomId = roomState.getSelectedRoomId();
                if (selectedRoomId) {
                    void roomState.openRoom(selectedRoomId);
                    void roomState.refreshTypingIndicator();
                    roomState.startTypingPolling();
                    roomState.startLiveRefreshPolling();
                }
            },
        },
    ];

    function bindSidebarEvents() {
        const roomsList = document.getElementById("messages-rooms-list");
        if (roomsList) void hydrateProfileAvatars(roomsList);
        roomsList?.addEventListener("click", async (clickEvent) => {
            const item = clickEvent.target
                .closest(".messages-room-select")
                ?.closest("[data-room-id]");
            if (!(item instanceof HTMLElement)) return;
            const roomId = item.getAttribute("data-room-id");
            if (!roomId) return;
            roomState.queueTypingUpdate(false);
            await roomState.openRoom(roomId);
            if (String(roomState.getSelectedRoomId()) !== roomId) return;
            roomsList
                .querySelectorAll(".messages-room--active")
                .forEach((activeItem) =>
                    activeItem.classList.remove("messages-room--active"),
                );
            roomsList
                .querySelectorAll(".messages-room-select")
                .forEach((button) =>
                    button.setAttribute(
                        "aria-pressed",
                        String(item.contains(button)),
                    ),
                );
            item.classList.add("messages-room--active");
            composer.closeToolbar();
            history.pushState(
                {},
                "",
                `/messages/${encodeURIComponent(roomId)}`,
            );
            await roomState.refreshTypingIndicator();
            roomState.startTypingPolling();
            roomState.startLiveRefreshPolling();
        });

        const newButton = document.getElementById("messages-new-btn");
        newButton?.addEventListener("click", () => {
            openSearchPopup({
                endpoint: "/api/v1/social/messages/users/lookup",
                category: "user",
                typeFilter: "user",
                ariaLabel: i18n.t("module.social.messages.new"),
                noResultsText: i18n.t("ui.layout.search.no_results"),
                onSelect: async (result) => {
                    if (!result?.handle) return;
                    await roomState.createConversationFromHandle(result.handle);
                },
            });
        });

        const templatesButton = document.getElementById(
            "messages-open-templates-btn",
        );
        templatesButton?.addEventListener("click", () => {
            void templateUi.openTemplatesPopup();
        });

        const sidebarTemplateList = document.getElementById(
            "messages-sidebar-template-list",
        );
        sidebarTemplateList?.addEventListener("click", async (clickEvent) => {
            await templateUi.handleSidebarTemplateClick(clickEvent);
        });

        templateUi.renderSidebarTemplateList();
    }

    window.addEventListener(
        "popstate",
        () => {
            const match = window.location.pathname.match(
                /^\/messages\/([^/]+)$/,
            );
            const roomId = match ? decodeURIComponent(match[1]) : null;
            if (roomId) {
                roomState.queueTypingUpdate(false);
                roomState.setSelectedRoomId(roomId);
                void roomState.openRoom(roomId);
                void roomState.refreshTypingIndicator();
                roomState.startTypingPolling();
                roomState.startLiveRefreshPolling();
            }
        },
        { signal },
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            roomState.startTypingPolling();
            roomState.startLiveRefreshPolling();
            if (document.visibilityState === "visible") {
                void roomState.refreshTypingIndicator();
                void roomState.refreshActiveConversation();
            }
        },
        { signal },
    );

    signal?.addEventListener(
        "abort",
        () => {
            syncOpenRoomPreviews = () => {};
            roomState.cleanup();
        },
        { once: true },
    );

    const composer = createPageComposer(root, {
        tutorials: guides,
        signal,
        allowCustomization: false,
        fillViewport: true,
        toolbarScrollable: true,
        elements,
        preferenceKey: "messages-layout",
        i18n,
        toolbar: [
            {
                id: "messages-sidebar",
                label: i18n.t("ui.reuse.messages"),
                render: () => sidebarHtml,
            },
        ],
        pageContext: {
            title: i18n.t("ui.reuse.messages"),
            subtitle: i18n.t("module.social.messages.page_subtitle"),
        },
        onRender: bindSidebarEvents,
    });

    await composer.init();
    await activateRoomAction({ id: "page:mounted" }, null, { signal });
    pageReady = true;
    if (refreshAfterKeyringUnlock) {
        refreshAfterKeyringUnlock = false;
        await refreshDecryptedContent();
    }
    roomState.startTypingPolling();
    roomState.startLiveRefreshPolling();
}

await mountWhenDirect(mount);
