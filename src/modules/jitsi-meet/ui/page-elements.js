import {
    buildChatMarkup,
    buildParticipantsMarkup,
    buildStageMarkup,
} from "./markup.js";

export function createMeetingPageElements(i18n, inShareView) {
    const elements = [];
    if (!inShareView) {
        elements.push({
            id: "jitsi-participants",
            label: i18n.t("module.jitsi_meet.participants.heading"),
            pinned: true,
            gridSize: {
                default: [12, 2],
                min: [8, 2],
                max: "full",
            },
            render: () => buildParticipantsMarkup(i18n),
        });
    }
    elements.push(
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
    );
    return elements;
}
