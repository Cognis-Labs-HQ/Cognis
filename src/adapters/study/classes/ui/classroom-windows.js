import { createClassroomMeetingEmbed } from "/static/modules/jitsi-meet/classroom-meeting-embed.js";
import { createClassroomNativeChat } from "/static/adapters/study/classes/classroom-chat.js";
import { createClassroomWhiteboardWindow } from "/static/modules/nextcloud-whiteboard/classroom-whiteboard-window.js";

/**
 * Creates and manages the persistent meeting overlay, class chat panel, and
 * whiteboard window that live outside refreshDom replacements. The meeting and
 * whiteboard windows are reattached inside the blackboard; the chat panel stays
 * root-level as a floating window.
 *
 * Call hoist() before replacing .classes-classroom-content in the DOM so
 * meeting/chat/whiteboard elements are moved to root first and never detached
 * from the document. Call reattach() afterwards to move them back.
 */
export function createClassroomWindows({
    root,
    i18n,
    onMeetingVisibilityChange = () => {},
    onWhiteboardVisibilityChange = () => {},
    signal = null,
}) {
    const chatToggleButton = root.querySelector("#global-chat-toggle");
    const meetingEmbed = createClassroomMeetingEmbed({
        i18n,
        onVisibilityChange: (visible) => {
            root.classList.toggle("classes-meeting-active", visible);
            onMeetingVisibilityChange(visible);
        },
        signal,
    });
    const nativeChat = createClassroomNativeChat({
        i18n,
        onVisibilityChange: (visible) => {
            if (!(chatToggleButton instanceof HTMLElement)) return;
            chatToggleButton.setAttribute(
                "aria-expanded",
                visible ? "true" : "false",
            );
        },
    });
    const whiteboardWindow = createClassroomWhiteboardWindow({
        root,
        i18n,
        onVisibilityChange: onWhiteboardVisibilityChange,
    });

    function handleWindowButtonClick(event) {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest(".classes-meeting-close-btn")) {
            meetingEmbed.closeMeeting();
            return;
        }
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
        root.appendChild(nativeChat.panel);
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
        openWhiteboard: (opts) => whiteboardWindow.openBoard(opts),
        closeWhiteboard: () => whiteboardWindow.closeBoard(),
        isWhiteboardOpen: () => whiteboardWindow.isOpen(),
        getActiveWhiteboardId: () => whiteboardWindow.getActiveBoardId(),
        whiteboardElement: whiteboardWindow.getElement(),
        hoist,
        reattach,
    };
}
