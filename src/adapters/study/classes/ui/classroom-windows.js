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
 * shell (close buttons, chat panel, hoist/reattach).
 *
 * Call hoist() before replacing .classes-classroom-content in the DOM so the
 * meeting and chat elements (which may contain live iframes) are moved to root
 * first and never detached from the document. Call reattach() afterwards to
 * move them back inside the blackboard.
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
            blackboard.appendChild(nativeChat.panel);
        }
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
