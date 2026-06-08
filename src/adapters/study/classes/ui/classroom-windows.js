import { createClassroomMeetingEmbed } from "/static/modules/jitsi-meet/classroom-meeting-embed.js";
import { createClassroomNativeChat } from "/static/adapters/study/classes/classroom-chat.js";

/**
 * Creates and manages the persistent meeting overlay and class chat panel
 * that live as siblings of .classes-classroom-content (never re-rendered by
 * refreshDom). Call reattach() after each DOM refresh to move the panels
 * back inside the blackboard.
 *
 * Meeting lifecycle is fully owned by the jitsi-meet module via
 * createClassroomMeetingEmbed; this file only wires up the Classroom
 * shell (close buttons, chat panel, reattach).
 */
export function createClassroomWindows({ root, i18n }) {
    const meetingEmbed = createClassroomMeetingEmbed({ i18n });
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

    function reattach() {
        const blackboard = root.querySelector(".classes-blackboard");
        if (blackboard) {
            blackboard.appendChild(meetingEmbed.element);
            blackboard.appendChild(nativeChat.panel);
        }
    }

    return {
        openMeeting: (snapshot) => meetingEmbed.openMeeting(snapshot),
        openChat: (chatUrl) => nativeChat.openChat(chatUrl),
        closeMeeting: () => meetingEmbed.closeMeeting(),
        closeChat: () => nativeChat.closeChat(),
        tryAutoJoin: (classroomId) => meetingEmbed.tryAutoJoin(classroomId),
        reattach,
    };
}
