import { createClassroomNativeChat } from "/static/adapters/study/classes/classroom-chat.js";

/**
 * Creates and manages the persistent meeting overlay, class chat panel, and
 * whiteboard window that live outside refreshDom replacements. The meeting and
 * whiteboard windows are reattached inside the blackboard; the chat panel stays
 * root-level as a floating window.
 *
 * Call hoist() before replacing .classes-classroom-content in the DOM so
 * meeting/chat/whiteboard elements are moved to root first and never detached
 * from the document. Call reattach() afterwards to move them back.
 *
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {object} options.i18n
 * @param {boolean} [options.isTeacher]
 * @param {Function|null} [options.createMeetingEmbed] - Factory from the
 *   jitsi-meet module, or null when that module is not installed.
 * @param {Function|null} [options.createWhiteboardWindow] - Factory from the
 *   nextcloud-whiteboard module, or null when that module is not installed.
 * @param {Function} [options.onMeetingVisibilityChange]
 * @param {Function} [options.onWhiteboardVisibilityChange]
 * @param {Function} [options.onChatVisibilityChange]
 * @param {AbortSignal|null} [options.signal]
 */
export function createClassroomWindows({
    root,
    i18n,
    isTeacher = false,
    createMeetingEmbed = null,
    createWhiteboardWindow = null,
    onMeetingVisibilityChange = () => {},
    onWhiteboardVisibilityChange = () => {},
    onChatVisibilityChange = () => {},
    signal = null,
}) {
    const meetingEmbed = createMeetingEmbed
        ? createMeetingEmbed({
              i18n,
              isTeacher,
              onVisibilityChange: ({ visible, returnMode, meetingId }) => {
                  root.classList.toggle("classes-meeting-active", visible);
                  onMeetingVisibilityChange({ visible, returnMode, meetingId });
              },
              signal,
          })
        : createNullMeetingEmbed();
    const nativeChat = createClassroomNativeChat({
        i18n,
        onVisibilityChange: ({ visible }) => {
            const chatToggleButton = root.querySelector("#global-chat-toggle");
            if (chatToggleButton instanceof HTMLElement) {
                chatToggleButton.setAttribute(
                    "aria-expanded",
                    visible ? "true" : "false",
                );
            }
            onChatVisibilityChange({ visible });
        },
    });
    const whiteboardWindow = createWhiteboardWindow
        ? createWhiteboardWindow({
              root,
              i18n,
              onVisibilityChange: onWhiteboardVisibilityChange,
          })
        : createNullWhiteboardWindow();

    function handleWindowButtonClick(event) {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest(".classes-chat-close-btn")) {
            nativeChat.closeChat();
        }
    }

    root.addEventListener("click", handleWindowButtonClick);

    function hoist() {
        root.appendChild(meetingEmbed.element);
        root.appendChild(nativeChat.panel);
        whiteboardWindow.hoist();
    }

    function reattach() {
        const meetingHost = root.querySelector(
            ".classes-meeting-workspace-host",
        );
        if (meetingHost instanceof HTMLElement) {
            meetingHost.appendChild(meetingEmbed.element);
        } else {
            const blackboard = root.querySelector(".classes-blackboard");
            if (blackboard) {
                blackboard.appendChild(meetingEmbed.element);
            }
        }
        const chatHost = root.querySelector(".classes-chat-workspace-host");
        if (chatHost instanceof HTMLElement) {
            chatHost.appendChild(nativeChat.panel);
        } else {
            root.appendChild(nativeChat.panel);
        }
        whiteboardWindow.reattach();
    }

    return {
        openMeeting: (snapshot) => meetingEmbed.openMeeting(snapshot),
        openChat: (chatUrl) => nativeChat.openChat(chatUrl),
        toggleChat: (chatUrl) =>
            nativeChat.isOpen()
                ? nativeChat.closeChat()
                : nativeChat.openChat(chatUrl),
        isChatOpen: () => nativeChat.isOpen(),
        isMeetingOpen: () => !meetingEmbed.element.hidden,
        closeMeeting: () => meetingEmbed.closeMeeting(),
        closeChat: () => nativeChat.closeChat(),
        tryAutoJoin: (classroomId) => meetingEmbed.tryAutoJoin(classroomId),
        notifyActiveMeeting: (meetingId) =>
            meetingEmbed.notifyActiveMeeting(meetingId),
        isMeetingDismissed: (meetingId) =>
            meetingEmbed.isMeetingDismissed(meetingId),
        isAuthBlocked: () => meetingEmbed.isAuthBlocked(),
        resetAuthBlocked: () => meetingEmbed.resetAuthBlocked(),
        openWhiteboard: (opts) => whiteboardWindow.openBoard(opts),
        closeWhiteboard: () => whiteboardWindow.closeBoard(),
        isWhiteboardOpen: () => whiteboardWindow.isOpen(),
        getActiveWhiteboardId: () => whiteboardWindow.getActiveBoardId(),
        whiteboardElement: whiteboardWindow.getElement(),
        hoist,
        reattach,
    };
}

/**
 * Null stub used when the jitsi-meet module is not installed.
 * Provides the minimum interface required by createClassroomWindows:
 *   - element (HTMLElement, always hidden)
 *   - openMeeting(snapshot) → Promise<void>
 *   - tryAutoJoin(classroomId) → Promise<void>
 *   - notifyActiveMeeting(meetingId) → void
 *   - closeMeeting() → void
 *   - isMeetingDismissed(meetingId) → boolean
 *   - isAuthBlocked() → boolean
 *   - resetAuthBlocked() → void
 */
function createNullMeetingEmbed() {
    const element = document.createElement("div");
    element.hidden = true;
    return {
        element,
        openMeeting: () => Promise.resolve(),
        tryAutoJoin: () => Promise.resolve(),
        notifyActiveMeeting: () => {},
        closeMeeting: () => {},
        isMeetingDismissed: () => false,
        isAuthBlocked: () => false,
        resetAuthBlocked: () => {},
    };
}

/**
 * Null stub used when the nextcloud-whiteboard module is not installed.
 * Provides the minimum interface required by createClassroomWindows:
 *   - getElement() → HTMLElement (always hidden)
 *   - openBoard(opts) → Promise<void>
 *   - closeBoard() → void
 *   - isOpen() → boolean
 *   - getActiveBoardId() → null
 *   - hoist() → void
 *   - reattach() → void
 */
function createNullWhiteboardWindow() {
    const element = document.createElement("div");
    element.hidden = true;
    return {
        getElement: () => element,
        openBoard: () => Promise.resolve(),
        closeBoard: () => {},
        isOpen: () => false,
        getActiveBoardId: () => null,
        hoist: () => {},
        reattach: () => {},
    };
}
