import { createClassroomMeetingEmbed } from "/static/modules/jitsi-meet/classroom-meeting-embed.js";
import { createClassroomNativeChat } from "/static/adapters/study/classes/classroom-chat.js";

/**
 * Creates and manages the persistent meeting overlay and class chat panel
 * that live outside refreshDom replacements. The meeting window is reattached
 * inside the blackboard; the chat panel stays root-level as a floating window.
 *
 * Meeting lifecycle is fully owned by the jitsi-meet module via
 * createClassroomMeetingEmbed; this file only wires up the Classroom
 * shell (close buttons, chat panel, hoist/reattach).
 *
 * Call hoist() before replacing .classes-classroom-content in the DOM so
 * meeting/chat elements are moved to root first and never detached from the
 * document. Call reattach() afterwards to move the meeting back to blackboard
 * while leaving chat floating at root.
 */
export function createClassroomWindows({ root, i18n }) {
    const updateMeetingWindowLayout = () => {
        const blackboard = root.querySelector(".classes-blackboard");
        const header = blackboard?.querySelector(".classes-blackboard-header");
        const headerHeight =
            header instanceof HTMLElement
                ? Math.ceil(header.getBoundingClientRect().height)
                : 0;
        meetingEmbed.element.style.setProperty(
            "--classes-meeting-window-top",
            `${headerHeight}px`,
        );
    };
    const meetingEmbed = createClassroomMeetingEmbed({
        i18n,
        onVisibilityChange: (visible) => {
            root.classList.toggle("classes-meeting-active", visible);
            updateMeetingWindowLayout();
        },
    });
    const nativeChat = createClassroomNativeChat({ i18n });

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
    }

    function reattach() {
        const blackboard = root.querySelector(".classes-blackboard");
        if (blackboard) {
            blackboard.appendChild(meetingEmbed.element);
        }
        root.appendChild(nativeChat.panel);
        updateMeetingWindowLayout();
    }

    updateMeetingWindowLayout();

    return {
        openMeeting: (snapshot) => meetingEmbed.openMeeting(snapshot),
        openChat: (chatUrl) => nativeChat.openChat(chatUrl),
        closeMeeting: () => meetingEmbed.closeMeeting(),
        closeChat: () => nativeChat.closeChat(),
        tryAutoJoin: (classroomId) => meetingEmbed.tryAutoJoin(classroomId),
        hoist,
        reattach,
    };
}
