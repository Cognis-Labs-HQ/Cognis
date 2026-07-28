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

import {
    handleProfileAvatarError,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
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
    encryptMessage,
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
import { createRoomKeyStore } from "./room-keys.mjs";
import { createMessagesRoomState } from "./room-state.js";
import { renderRoomList } from "./room-render.js";
import { importRoomKey } from "/static/reuse/crypto-utils.js";
import { createKeyringScope } from "/static/adapters/auth/keyring/keyring.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

const LAST_OPENED_ROOM_KEY = "messages:last-opened-room";
const TYPING_TTL_SECONDS = 8;
const TYPING_IDLE_RESET_MS = (TYPING_TTL_SECONDS - 3) * 1000;
const TYPING_SEND_DEBOUNCE_MS = 1200;
const LIVE_REFRESH_INTERVAL_MS = 2500;
let reportInvalidRoomKey = () => undefined;
const messagesKeyring = createKeyringScope("Social Messages");

const { getRoomKey, requireRoomKey, resolveThreadRoomKey, contributeRoomKey } =
    createRoomKeyStore({
        importKey: importRoomKey,
        onInvalidSecret: (roomId) => reportInvalidRoomKey(roomId),
        resolveSecret: messagesKeyring.resolve,
        contributeSecret: messagesKeyring.set,
    });

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/adapters/social/messages/languages",
            "/static/gateways/social/languages",
        ],
    });
    reportInvalidRoomKey = () =>
        showToast(i18n.t("adapter.social.messages.keyring_invalid"), {
            variant: "warning",
        });
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

    let composerInputRef = null;

    let syncOpenRoomPreviews = () => {};

    const roomState = createMessagesRoomState({
        i18n,
        currentAccountId,
        initialSelectedRoomId,
        getRoomKey,
        requireRoomKey,
        resolveThreadRoomKey,
        acceptRoomKeyContribution: async (roomId, contribution) => {
            const isUnlocked = uiCtx.capabilities.get("keyring:isUnlocked");
            if (!isUnlocked?.()) {
                const createGuard = uiCtx.capabilities.get(
                    "auth:createRepromptGuard",
                );
                const unlock = uiCtx.capabilities.get("keyring:unlock");
                if (!createGuard || !unlock) return false;
                const guard = createGuard({ i18n });
                const prompt = {
                    title: i18n.t(
                        "adapter.social.messages.keyring_unlock_title",
                    ),
                    message: i18n.t(
                        "adapter.social.messages.keyring_unlock_message",
                    ),
                };
                let confirmation =
                    await guard.requestPasswordConfirmation(prompt);
                if (confirmation && !confirmation.password) {
                    confirmation = await guard.requestPasswordConfirmation({
                        ...prompt,
                        alwaysPrompt: true,
                    });
                }
                if (
                    !confirmation?.password ||
                    !(await unlock(confirmation.password))
                ) {
                    return false;
                }
            }
            return contributeRoomKey(roomId, contribution);
        },
        lastOpenedRoomKey: LAST_OPENED_ROOM_KEY,
        typingTtlSeconds: TYPING_TTL_SECONDS,
        typingIdleResetMs: TYPING_IDLE_RESET_MS,
        typingSendDebounceMs: TYPING_SEND_DEBOUNCE_MS,
        liveRefreshIntervalMs: LIVE_REFRESH_INTERVAL_MS,
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
                // (lines 232-239 below, where composerInputRef is assigned).
                if (
                    persistedState.size === 0 &&
                    composerInputRef instanceof HTMLTextAreaElement
                ) {
                    composerInputRef.value = "";
                }
                // Dispatch a synthetic input event so dependent UI state
                // (preview rendering, character counters, typing indicators)
                // is updated after the draft value is restored programmatically.
                composerInputRef?.dispatchEvent(new Event("input"));
            }
        },
    });

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

    const sidebarHtml = `<div class="messages-sidebar-content">
    <header class="messages-rooms-header">
      <button type="button" class="messages-new-btn" id="messages-new-btn">
        ${escapeHtml(i18n.t("module.social.messages.new"))}
      </button>
    </header>
    <ul class="messages-rooms-list" id="messages-rooms-list">
      ${renderRoomList({
          rooms: roomState.getRooms(),
          currentAccountId,
          selectedRoomId: roomState.getSelectedRoomId(),
          i18n,
          formatRoomListAvatar,
      })}
    </ul>
    <section class="messages-sidebar-section">
      <button type="button" class="messages-sidebar-section-label messages-sidebar-section-label--btn" id="messages-open-templates-btn">
        ${escapeHtml(i18n.t("module.social.messages.templates"))}
      </button>
      <ul class="messages-sidebar-template-list" id="messages-sidebar-template-list"></ul>
    </section>
  </div>`;

    const elements = [
        {
            id: "messages-thread",
            label: i18n.t("ui.reuse.messages"),
            gridSize: { default: [12, 8], min: [4, 4], max: "full" },
            render: () =>
                `<section class="messages-thread">
          <div id="messages-thread-header-slot"></div>
          <div id="messages-request-banner-slot"></div>
          <div class="messages-thread-list" id="messages-thread-list"></div>
          <div class="messages-typing-status" id="messages-typing-status"></div>
          <form class="messages-composer" id="messages-composer" data-composer-include-form-memory="true">
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
          </form>
        </section>`,
            onRender: () => {
                const threadList = document.getElementById(
                    "messages-thread-list",
                );
                const form = document.getElementById("messages-composer");
                const composerInput = document.getElementById(
                    "messages-composer-input",
                );
                composerInputRef =
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

                form?.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    const selectedRoomId = roomState.getSelectedRoomId();
                    if (!selectedRoomId) return;
                    const currentRoom = roomState.getSelectedRoom();
                    if (
                        currentRoom?.canSend === false ||
                        currentRoom?.isArchived
                    ) {
                        showToast(
                            i18n.t(
                                "module.social.messages.archived_cannot_send",
                            ),
                            {
                                variant: "error",
                            },
                        );
                        return;
                    }
                    const text = resolveMessageTemplateVariables(
                        composerInput instanceof HTMLTextAreaElement
                            ? composerInput.value
                            : "",
                        currentRoom,
                        currentAccountId,
                    ).trim();
                    if (!text) return;
                    roomState.queueTypingUpdate(false);
                    let key = null;
                    try {
                        key = await requireRoomKey(selectedRoomId);
                    } catch (error) {
                        console.error(
                            "[messages] requireRoomKey failed",
                            error,
                        );
                        key = null;
                    }
                    if (!key) {
                        showToast(
                            i18n.t("module.social.messages.key_unavailable"),
                            {
                                variant: "error",
                            },
                        );
                        return;
                    }
                    const { iv, ciphertext } = await encryptMessage(key, text);
                    const response = await apiFetch(
                        `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages`,
                        {
                            method: "POST",
                            body: JSON.stringify({ ciphertext, iv }),
                        },
                    );
                    if (!response.ok) {
                        const payload = await response.json().catch(() => null);
                        const code = payload?.error?.code;
                        if (code === "not_member") {
                            showToast(
                                i18n.t(
                                    "module.social.messages.not_member_cannot_send",
                                ),
                                {
                                    variant: "error",
                                },
                            );
                            await roomState.reloadRoomsList();
                            return;
                        }
                        if (code === "chat_archived") {
                            showToast(
                                i18n.t(
                                    "module.social.messages.archived_cannot_send",
                                ),
                                {
                                    variant: "error",
                                },
                            );
                            await roomState.reloadRoomsList();
                            return;
                        }
                        showToast(
                            i18n.t("module.social.messages.send_failed"),
                            { variant: "error" },
                        );
                        return;
                    }
                    if (composerInput instanceof HTMLTextAreaElement) {
                        clearPersistedFormState(selectedRoomId);
                        composerInput.value = "";
                    }
                    renderComposerPreview();
                    await roomState.openRoom(selectedRoomId);
                    await roomState.refreshTypingIndicator();
                    roomState.startLiveRefreshPolling();
                });

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
            const item = clickEvent.target.closest("[data-room-id]");
            if (!(item instanceof HTMLElement)) return;
            const roomId = item.getAttribute("data-room-id");
            if (!roomId) return;
            roomState.queueTypingUpdate(false);
            roomState.setSelectedRoomId(roomId);
            roomsList
                .querySelectorAll(".messages-room--active")
                .forEach((activeItem) =>
                    activeItem.classList.remove("messages-room--active"),
                );
            item.classList.add("messages-room--active");
            history.pushState(
                {},
                "",
                `/messages/${encodeURIComponent(roomId)}`,
            );
            await roomState.openRoom(roomId);
            await roomState.refreshTypingIndicator();
            roomState.startTypingPolling();
            roomState.startLiveRefreshPolling();
        });

        const newButton = document.getElementById("messages-new-btn");
        newButton?.addEventListener("click", () => {
            openSearchPopup({
                endpoint: "/api/v1/social/messages/users/lookup",
                category: "user",
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
        allowCustomization: false,
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
    roomState.startTypingPolling();
    roomState.startLiveRefreshPolling();
}

await mountWhenDirect(mount);
